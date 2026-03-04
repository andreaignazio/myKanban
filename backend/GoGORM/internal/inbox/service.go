package inbox

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"

	"GoGORM/internal/listcards"
	"GoGORM/models"
	"context"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type InboxService struct {
	db               *gorm.DB
	EventRegistry    *EventRegistry.EventRegistryService
	ListCardsRepo    ListCardsRepo
	ListCardsService ListCardsService
	PositionHelper   PositionHelper
	MembershipRepo   MembershipRepo
	CardsRepo        CardsRepo
	repo             InboxRepo
	LinksRepo        LinksRepo
	includeDeleted   bool
}

type InboxRepo interface {
	CreateInboxCardTX(ctx context.Context, db *gorm.DB, inboxCard *models.UserInboxCard) error
	GetUserInboxCards(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.UserInboxCard, error)
	GetMirrorsIds(ctx context.Context, userID, rootListCardID uuid.UUID) ([]uuid.UUID, error)
}

type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
}

type PositionHelper interface {
	InboxPosAtStart(ctx context.Context, userID uuid.UUID) (string, error)
	InboxPosAtEnd(ctx context.Context, userID uuid.UUID) (string, error)
	InboxPosBeforeID(ctx context.Context, userID, beforeID uuid.UUID) (string, error)
}

type ListCardsRepo interface {
	GetAnyListCardByCardIDTX(ctx context.Context, db *gorm.DB, cardID uuid.UUID, includeDeleted bool) (*models.ListCard, error)
}

type ListCardsService interface {
	CopyCardChecklistsTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, newCard *models.Card,
		domain *listcards.CheckListDomain) error
}

type LinksRepo interface {
	GetExternalRootRefsByIDs(ctx context.Context, rootIDs []uuid.UUID, includeDeleted bool) ([]models.ExternalRootRefRow, error)
}

type CardsRepo interface {
	CreateCard(ctx context.Context, db *gorm.DB, card *models.Card) error
	CreateCardTX(ctx context.Context, tx *gorm.DB, card *models.Card) error
	GetCardByIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) (*models.Card, error)
	GetCardsByIDs(ctx context.Context, cardIDs []uuid.UUID, includeDeleted bool) ([]models.Card, error)
}

func NewInboxService(inboxRepo InboxRepo, eventRegistry *EventRegistry.EventRegistryService, membershipRepo MembershipRepo, listCardsRepo ListCardsRepo,
	listCardsService ListCardsService, positionHelper PositionHelper, cardsRepo CardsRepo, linksRepo LinksRepo, db *gorm.DB, includeDeleted bool) *InboxService {
	return &InboxService{
		ListCardsRepo:    listCardsRepo,
		ListCardsService: listCardsService,
		PositionHelper:   positionHelper,
		repo:             inboxRepo,
		EventRegistry:    eventRegistry,
		includeDeleted:   includeDeleted,
		MembershipRepo:   membershipRepo,
		CardsRepo:        cardsRepo,
		LinksRepo:        linksRepo,
		db:               db,
	}
}

func (s *InboxService) resolveInboxPosition(ctx context.Context, userID uuid.UUID, req MirrorCardToInboxRequest) (string, error) {
	if req.BeforeID != nil {
		return s.PositionHelper.InboxPosBeforeID(ctx, userID, *req.BeforeID)
	}

	insertAt := req.InsertAtOrDefault()
	if insertAt == PositionStart {
		return s.PositionHelper.InboxPosAtStart(ctx, userID)
	}
	if insertAt == PositionEnd {
		return s.PositionHelper.InboxPosAtEnd(ctx, userID)
	}

	return "", domainerr.ErrValidation
}
func (s *InboxService) GetInboxCards(ctx context.Context, userID uuid.UUID) ([]models.UserInboxCard, error) {
	inboxCards, err := s.repo.GetUserInboxCards(ctx, userID, s.includeDeleted)
	if err != nil {
		return nil, err
	}
	return inboxCards, nil
}

func (s *InboxService) GetUserInboxCards(ctx context.Context, userID uuid.UUID) (dto.UserInboxCardResponse, error) {
	inboxCards, err := s.repo.GetUserInboxCards(ctx, userID, s.includeDeleted)
	if err != nil {
		return dto.UserInboxCardResponse{}, err
	}
	cardIDs := make([]uuid.UUID, len(inboxCards))
	for i, inboxCard := range inboxCards {
		cardIDs[i] = inboxCard.CardID
	}
	cards, err := s.CardsRepo.GetCardsByIDs(ctx, cardIDs, s.includeDeleted)
	if err != nil {
		return dto.UserInboxCardResponse{}, err
	}

	cardMap := make(map[uuid.UUID]dto.CardResponse)
	for _, card := range cards {
		cardMap[card.ID] = dto.CardToResponse(&card)
	}
	inboxCardsResponses := make([]dto.InboxCardResponse, 0, len(inboxCards))
	for _, inboxCard := range inboxCards {
		inboxCardsResponse := dto.InboxCardToResponse(&inboxCard)
		if inboxCard.RootListCardID != nil {
			mirrors, err := s.repo.GetMirrorsIds(ctx, userID, *inboxCard.RootListCardID)
			if err != nil {
				return dto.UserInboxCardResponse{}, err
			}
			inboxCardsResponse.Mirrors = mirrors
		}
		inboxCardsResponses = append(inboxCardsResponses, inboxCardsResponse)
	}
	fmt.Println("mirrors for inbox cards:", inboxCardsResponses)

	externalRoots, err := s.LinksRepo.GetExternalRootRefsByIDs(ctx, s.extractRootListCardIDs(inboxCards), s.includeDeleted)
	if err != nil {
		return dto.UserInboxCardResponse{}, err
	}

	externalRootsResponse := dto.ExternalRootRefsToResponses(externalRoots)
	rootMap := make(map[uuid.UUID]dto.ExternalRootRefResponse)
	for _, root := range externalRootsResponse {
		rootMap[root.RootListCardID] = root
	}

	response := dto.UserInboxCardResponse{
		InboxCards:        inboxCardsResponses,
		Cards:             cardMap,
		ExternalRootsByID: rootMap,
	}
	return response, nil
}

func (s *InboxService) MirrorCardToInbox(ctx context.Context, userID, workspaceUUID, boardID, cardID uuid.UUID,
	req MirrorCardToInboxRequest, correlationID uuid.UUID) (*dto.InboxCardResponse, error) {
	_ = workspaceUUID
	_ = correlationID

	rootListCard, err := s.ListCardsRepo.GetAnyListCardByCardIDTX(ctx, s.db, cardID, false)
	if err != nil {
		return nil, err
	}

	pos, err := s.resolveInboxPosition(ctx, userID, req)
	if err != nil {
		return nil, err
	}

	newInboxCard := models.UserInboxCard{
		ID:             uuid.New(),
		UserID:         userID,
		CardID:         cardID,
		Pos:            pos,
		SourceBoardID:  &boardID,
		RootListCardID: &rootListCard.RootID,
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := s.repo.CreateInboxCardTX(ctx, tx, &newInboxCard); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	//mirrorMap := buildInboxMirrorMap(userInboxCards)
	//fmt.Printf("MirrorMap: %+v\n", mirrorMap)
	response := dto.InboxCardToResponse(&newInboxCard)
	if rootListCard.RootID != uuid.Nil {
		mirrors, err := s.repo.GetMirrorsIds(ctx, userID, rootListCard.RootID)
		if err != nil {
			return nil, err
		}
		fmt.Println("mirrors are:", mirrors)
		response.Mirrors = mirrors
	}
	return &response, nil
}

func applyInboxMirrorsToResponses(responses []dto.InboxCardResponse, mirrorMap map[uuid.UUID][]uuid.UUID) {
	for i := range responses {
		if mirrors, ok := mirrorMap[responses[i].ID]; ok {
			responses[i].Mirrors = mirrors
		}
	}
}

func (s *InboxService) CopyCardToInbox(ctx context.Context, userID, workspaceUUID, boardID, cardID uuid.UUID,
	req CopyCardToInboxRequest, correlationID uuid.UUID) error {
	_ = workspaceUUID
	_ = correlationID

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		rootListCard, err := s.ListCardsRepo.GetAnyListCardByCardIDTX(ctx, tx, cardID, false)
		if err != nil {
			return err
		}
		originalCard, err := s.CardsRepo.GetCardByIDTX(ctx, tx, cardID, false)
		if err != nil {
			return err
		}
		newCard := models.Card{
			ID:              uuid.New(),
			Title:           originalCard.Title,
			Description:     originalCard.Description,
			StartDate:       originalCard.StartDate,
			EndDate:         originalCard.EndDate,
			Props:           originalCard.Props,
			CreatedByUserID: userID,
		}
		if req.Title != nil {
			newCard.Title = *req.Title
		}
		if err := s.CardsRepo.CreateCardTX(ctx, tx, &newCard); err != nil {
			return err
		}
		pos, err := s.resolveInboxPosition(ctx, userID, req.MirrorCardToInboxRequest)
		if err != nil {
			return err
		}

		newInboxCard := models.UserInboxCard{
			ID:             uuid.New(),
			UserID:         userID,
			CardID:         newCard.ID,
			SourceBoardID:  &boardID,
			RootListCardID: &rootListCard.RootID,
			Pos:            pos,
		}

		if err := s.repo.CreateInboxCardTX(ctx, tx, &newInboxCard); err != nil {
			return err
		}

		if req.KeepChecklists {
			checklistDomain := listcards.NewCheckListDomain()
			err = s.ListCardsService.CopyCardChecklistsTX(ctx, tx, cardID, &newCard, checklistDomain)
			if err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return err
	}

	return nil
}

func (s *InboxService) CreateInboxCard(ctx context.Context, userID uuid.UUID, req CreateInboxCardRequest, correlationID uuid.UUID) (*dto.UserInboxCardResponse, error) {
	var newCard models.Card
	var newInboxCard models.UserInboxCard

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		newCard = models.Card{
			ID:              uuid.New(),
			Title:           req.Title,
			CreatedByUserID: userID,
		}
		if err := s.CardsRepo.CreateCardTX(ctx, tx, &newCard); err != nil {
			return err
		}
		pos, err := s.resolveInboxPosition(ctx, userID, req.MirrorCardToInboxRequest)
		if err != nil {
			return err
		}
		newInboxCard = models.UserInboxCard{
			ID:     uuid.New(),
			UserID: userID,
			CardID: newCard.ID,
			Pos:    pos,
		}
		if err := s.repo.CreateInboxCardTX(ctx, tx, &newInboxCard); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	response := dto.UserInboxCardResponse{
		InboxCards: []dto.InboxCardResponse{dto.InboxCardToResponse(&newInboxCard)},
		Cards:      map[uuid.UUID]dto.CardResponse{newCard.ID: dto.CardToResponse(&newCard)},
	}
	return &response, nil

}

func (s *InboxService) extractRootListCardIDs(inboxCards []models.UserInboxCard) []uuid.UUID {
	rootIDs := make([]uuid.UUID, 0, len(inboxCards))
	for _, inboxCard := range inboxCards {
		if inboxCard.RootListCardID != nil {
			rootIDs = append(rootIDs, *inboxCard.RootListCardID)
		}
	}
	return rootIDs
}
