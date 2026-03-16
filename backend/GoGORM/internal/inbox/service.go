package inbox

import (
	"GoGORM/internal/actions"
	"GoGORM/internal/authz"
	"GoGORM/internal/authzdto"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"

	"GoGORM/internal/listcards"
	"GoGORM/models"
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type InboxService struct {
	db                 *gorm.DB
	authz              *authz.Service
	EventRegistry      *EventRegistry.EventRegistryService
	ListCardsRepo      ListCardsRepo
	ListCardsService   ListCardsService
	PositionHelper     PositionHelper
	MembershipRepo     MembershipRepo
	CardsRepo          CardsRepo
	repo               InboxRepo
	LinksRepo          LinksRepo
	BoardsRepo         BoardsRepo
	BoardListRepo      BoardListRepo
	CardPositionHelper CardPositionHelper
	includeDeleted     bool
}

func NewInboxService(inboxRepo InboxRepo, eventRegistry *EventRegistry.EventRegistryService, membershipRepo MembershipRepo, listCardsRepo ListCardsRepo,
	listCardsService ListCardsService, positionHelper PositionHelper, cardPositionHelper CardPositionHelper, cardsRepo CardsRepo, linksRepo LinksRepo, boardsRepo BoardsRepo, boardListRepo BoardListRepo, db *gorm.DB, authz *authz.Service, includeDeleted bool) *InboxService {
	return &InboxService{
		ListCardsRepo:      listCardsRepo,
		ListCardsService:   listCardsService,
		PositionHelper:     positionHelper,
		repo:               inboxRepo,
		EventRegistry:      eventRegistry,
		includeDeleted:     includeDeleted,
		MembershipRepo:     membershipRepo,
		CardsRepo:          cardsRepo,
		LinksRepo:          linksRepo,
		BoardsRepo:         boardsRepo,
		BoardListRepo:      boardListRepo,
		CardPositionHelper: cardPositionHelper,
		db:                 db,
		authz:              authz,
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

func (s *InboxService) isMirrorCard(ctx context.Context, cardID uuid.UUID) (bool, *models.ListCard, error) {
	isMirror := false
	listcard, found, err := s.ListCardsRepo.FindAnyListCardByCardIDTX(ctx, s.db, cardID, s.includeDeleted)
	if err != nil {
		return false, nil, err
	}
	if found {
		isMirror = listcard.RootID != uuid.Nil
	}
	return isMirror, listcard, nil
}

func (s *InboxService) MoveInboxCardToListInBoard(ctx context.Context, userID, cardID, targetWorkspaceID, targetBoardID, targetListID, correlationID uuid.UUID, req MoveInboxCardRequest) (*dto.ListCardResponse, error) {

	/*authzRequest := authzdto.Request{
		UserID:        userID,
		CorrelationID: correlationID,
		Action:        actions.InboxCardMoveToListInBoard,
		Payload: authzdto.RequestPayload{
			InboxCardMoveToBoardPayload: &authzdto.InboxCardMoveToBoardPayload{
				CardID:            cardID,
				TargetWorkspaceID: targetWorkspaceID,
				TargetBoardID:     targetBoardID,
				TargetListID:      targetListID,
			},
		},
	}

	authzResponse, err := s.authz.AuthorizeRequest(ctx, authzRequest)
	if err != nil {
		//return nil, err
	}
	if authzResponse.Authorized == false {
		//return nil, domainerr.ErrForbidden
	}*/

	isMirror, listcard, err := s.isMirrorCard(ctx, cardID)
	if err != nil {
		return nil, err
	}

	_, err = s.BoardListRepo.GetBoardListsByListIdTX(ctx, s.db, targetListID, s.includeDeleted)
	if err != nil {
		return nil, err
	}

	var position string
	if req.BeforeID != nil {
		beforeListcard, err := s.ListCardsRepo.GetListCardByListAndCardTX(ctx, s.db, targetListID, *req.BeforeID, s.includeDeleted)
		if err != nil {
			return nil, err
		}
		position, err = s.CardPositionHelper.CardPosBeforeID(ctx, targetListID, beforeListcard.ID)
		if err != nil {
			return nil, err
		}
	} else if req.InsertAt != nil {
		if *req.InsertAt == "start" {
			position, err = s.CardPositionHelper.CardPosAtListStart(ctx, targetListID)
		} else {
			position, err = s.CardPositionHelper.CardPosAtListEnd(ctx, targetListID)
		}
		if err != nil {
			return nil, err
		}
	} else {
		position, err = s.CardPositionHelper.CardPosAtListEnd(ctx, targetListID)
		if err != nil {
			return nil, err
		}
	}

	var newListCard *models.ListCard

	if isMirror {
		newListCard = &models.ListCard{
			ID:     uuid.New(),
			CardID: cardID,
			ListID: targetListID,
			Pos:    position,
			RootID: listcard.RootID,
		}
	} else {
		newId := uuid.New()
		newListCard = &models.ListCard{
			ID:     newId,
			CardID: cardID,
			ListID: targetListID,
			Pos:    position,
			RootID: newId,
		}
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err = s.ListCardsRepo.CreateCardListTX(ctx, tx, newListCard); err != nil {
			return err
		}
		if err = s.repo.DeleteInboxCardTX(ctx, tx, userID, cardID); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	response := dto.ListCardToResponse(newListCard)

	return &response, nil

}

func (s *InboxService) resolveBoardCardPosition(ctx context.Context, targetListID uuid.UUID, req MoveInboxCardRequest) (string, error) {
	if req.BeforeID != nil {
		beforeListcard, err := s.ListCardsRepo.GetListCardByListAndCardTX(ctx, s.db, targetListID, *req.BeforeID, s.includeDeleted)
		if err != nil {
			return "", err
		}
		return s.CardPositionHelper.CardPosBeforeID(ctx, targetListID, beforeListcard.ID)
	}

	if req.InsertAt != nil {
		if *req.InsertAt == PositionStart {
			return s.CardPositionHelper.CardPosAtListStart(ctx, targetListID)
		}
		return s.CardPositionHelper.CardPosAtListEnd(ctx, targetListID)
	}

	return s.CardPositionHelper.CardPosAtListEnd(ctx, targetListID)
}

func (s *InboxService) MoveInboxCard(ctx context.Context, userID, cardID uuid.UUID, correlationID uuid.UUID, req MoveInboxCardRequest) (*dto.InboxCardResponse, error) {

	var newPos string
	var err error
	if req.BeforeID != nil {
		newPos, err = s.PositionHelper.InboxPosBeforeID(ctx, userID, *req.BeforeID)
		if err != nil {
			return nil, err
		}
	} else if req.InsertAt != nil {
		if *req.InsertAt == "start" {
			newPos, err = s.PositionHelper.InboxPosAtStart(ctx, userID)
		} else {
			newPos, err = s.PositionHelper.InboxPosAtEnd(ctx, userID)
		}
		if err != nil {
			return nil, err
		}
	} else {
		newPos, err = s.PositionHelper.InboxPosAtEnd(ctx, userID)
		if err != nil {
			return nil, err
		}
	}

	updateMap := map[string]interface{}{
		"pos": newPos,
	}
	var updatedCard *models.UserInboxCard
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		updatedCard, err = s.repo.PatchInboxCardTX(ctx, tx, userID, cardID, updateMap)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}
	response := dto.InboxCardToResponse(updatedCard)
	return &response, nil
}

func (s *InboxService) CopyInboxCardToListInBoard(ctx context.Context, userID, cardID, targetWorkspaceID, targetBoardID, targetListID, correlationID uuid.UUID, req CopyInboxCardToBoardRequest) (*dto.ListCardResponse, error) {

	inboxCard, err := s.repo.GetInboxCardByCardID(ctx, userID, cardID, s.includeDeleted)
	if err != nil {
		return nil, err
	}

	isMirror, _, err := s.isMirrorCard(ctx, cardID)
	if err != nil {
		return nil, err
	}
	if isMirror {
		sourceBoard, rootBoardList, err := s.getRootBoardAndBoardListForMirrorCard(ctx, *inboxCard)
		if err != nil {
			return nil, err
		}
		targetBoardList, err := s.BoardListRepo.GetBoardList(ctx, targetBoardID, targetListID, s.includeDeleted)
		if err != nil {
			return nil, err
		}

		authz, err := s.authz.AuthorizeRequest(ctx, authzdto.Request{
			UserID:        userID,
			CorrelationID: correlationID,
			Action:        actions.CopyListCard,
			Payload: authzdto.RequestPayload{
				CopyListCardPayload: &authzdto.CopyListCardPayload{
					ReadListCardPayload: authzdto.ReadListCardPayload{
						WorkspaceID:       sourceBoard.WorkspaceID,
						CardID:            cardID,
						SourceBoardListID: rootBoardList.ID,
						RootListCardID:    inboxCard.RootListCardID,
					},
					CreateListCardPayload: authzdto.CreateListCardPayload{
						TargetWorkspaceID: targetWorkspaceID,
						TargetBoardListID: targetBoardList.ID,
					},
				},
			},
		})
		if err != nil {
			return nil, err
		}
		if !authz.Authorized {
			fmt.Println("Error: user is not authorized to copy the card to the target board, error:", err)
			return nil, domainerr.ErrForbidden
		}

		execResult, err := s.ListCardsService.ExecuteCopyCardToList(ctx, userID, sourceBoard.ID, cardID, listcards.CopyCardToListRequest{
			MirrorCardToListRequest: listcards.MirrorCardToListRequest{
				TargetBoardID: targetBoardID,
				TargetListID:  targetListID,
				BeforeID:      req.BeforeID,
				InsertAt:      req.InsertAt,
			},
			Title: req.Title,
			CopyCardRequest: listcards.CopyCardRequest{
				KeepComments:   req.KeepComments,
				KeepMembers:    req.KeepMembers,
				KeepLabels:     req.KeepLabels,
				KeepChecklists: req.KeepChecklists,
			},
		})
		if err != nil {
			return nil, err
		}

		cardResponse := dto.CardToResponse(execResult.NewCard)
		_ = s.EventRegistry.Emit(ctx, s.db, EventRegistry.DomainEvent{
			Type:          EventRegistry.EventCardCreated,
			WorkspaceID:   &targetWorkspaceID,
			BoardID:       &targetBoardID,
			ActorUserID:   &userID,
			CorrelationID: &correlationID,
			Payload: EventRegistry.EventPayloadEnvelope{
				StatePayload: &dto.BoardDetailResponse{
					Cards: map[uuid.UUID]dto.CardResponse{
						execResult.NewCard.ID: cardResponse,
					},
					ListCardRelations: []dto.ListCardResponse{
						dto.ListCardToResponse(execResult.NewListCard),
					},
				},
			},
			Targets: []EventRegistry.TargetRef{
				{EntityType: "list", EntityID: targetListID, BoardID: &targetBoardID},
				{EntityType: "card", EntityID: execResult.NewCard.ID, BoardID: &targetBoardID},
			},
			OccurredAt: time.Now(),
		})

		response := dto.ListCardToResponse(execResult.NewListCard)
		return &response, nil
	} else {
		targetBoardList, err := s.BoardListRepo.GetBoardList(ctx, targetBoardID, targetListID, s.includeDeleted)
		if err != nil {
			return nil, err
		}
		authz, err := s.authz.AuthorizeRequest(ctx, authzdto.Request{
			UserID:        userID,
			CorrelationID: correlationID,
			Action:        actions.CreateListCard,
			Payload: authzdto.RequestPayload{
				CreateListCardPayload: &authzdto.CreateListCardPayload{
					TargetWorkspaceID: targetWorkspaceID,
					TargetBoardListID: targetBoardList.ID,
				},
			},
		})
		if err != nil {
			return nil, err
		}
		if !authz.Authorized {
			return nil, domainerr.ErrForbidden
		}

		position, err := s.resolveBoardCardPosition(ctx, targetListID, req.MoveInboxCardRequest)
		if err != nil {
			return nil, err
		}

		var newCard models.Card
		var newListCard models.ListCard
		err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			originalCard, err := s.CardsRepo.GetCardByIDTX(ctx, tx, cardID, s.includeDeleted)
			if err != nil {
				return err
			}

			newCard = models.Card{
				ID:              uuid.New(),
				Title:           originalCard.Title,
				Description:     originalCard.Description,
				StartDate:       originalCard.StartDate,
				EndDate:         originalCard.EndDate,
				Done:            originalCard.Done,
				Props:           originalCard.Props,
				CreatedByUserID: userID,
				CreatedInListID: targetListID,
			}
			if req.Title != nil {
				newCard.Title = *req.Title
			}

			if err := s.CardsRepo.CreateCardTX(ctx, tx, &newCard); err != nil {
				return err
			}

			newListCard = models.ListCard{
				ID:     uuid.New(),
				CardID: newCard.ID,
				ListID: targetListID,
				Pos:    position,
			}
			newListCard.RootID = newListCard.ID

			if err := s.ListCardsRepo.CreateCardListTX(ctx, tx, &newListCard); err != nil {
				return err
			}

			if req.KeepChecklists {
				checklistDomain := listcards.NewCheckListDomain()
				if err := s.ListCardsService.CopyCardChecklistsTX(ctx, tx, cardID, &newCard, checklistDomain); err != nil {
					return err
				}
			}

			return nil
		})
		if err != nil {
			return nil, err
		}

		cardResponse := dto.CardToResponse(&newCard)
		_ = s.EventRegistry.Emit(ctx, s.db, EventRegistry.DomainEvent{
			Type:          EventRegistry.EventCardCreated,
			WorkspaceID:   &targetWorkspaceID,
			BoardID:       &targetBoardID,
			ActorUserID:   &userID,
			CorrelationID: &correlationID,
			Payload: EventRegistry.EventPayloadEnvelope{
				StatePayload: &dto.BoardDetailResponse{
					Cards: map[uuid.UUID]dto.CardResponse{
						newCard.ID: cardResponse,
					},
					ListCardRelations: []dto.ListCardResponse{
						dto.ListCardToResponse(&newListCard),
					},
				},
			},
			Targets: []EventRegistry.TargetRef{
				{EntityType: "list", EntityID: targetListID, BoardID: &targetBoardID},
				{EntityType: "card", EntityID: newCard.ID, BoardID: &targetBoardID},
			},
			OccurredAt: time.Now(),
		})

		response := dto.ListCardToResponse(&newListCard)
		return &response, nil
	}

}

func (s *InboxService) DetatchInboxCard(ctx context.Context,
	userID, cardID uuid.UUID, correlationID uuid.UUID) (*dto.InboxCardResponse, error) {

	authorization, err := s.authz.AuthorizeRequest(ctx, authzdto.Request{
		UserID:        userID,
		CorrelationID: correlationID,
		Action:        actions.InboxCardDetatch,
		Payload: authzdto.RequestPayload{
			InboxCardDetatchPayload: &authzdto.InboxCardDetatchPayload{
				CardID: cardID,
			},
		},
	})
	if err != nil {
		fmt.Println("Error authorizing detatch inbox card request:", err)
		return nil, err
	}
	if !authorization.Authorized {
		fmt.Println("User is not authorized to detatch the inbox card")
		return nil, domainerr.ErrForbidden
	}
	var deletedCard *models.UserInboxCard
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var err error
		deletedCard, err = s.repo.GetInboxCardByCardIDTX(ctx, tx, userID, cardID, s.includeDeleted)
		if err != nil {
			fmt.Println("Error fetching inbox card for detatch:", err)
			return err
		}
		if deletedCard == nil {
			fmt.Println("Inbox card not found for detatch")
			return domainerr.ErrNotFound
		}
		if err := s.repo.DeleteInboxCardTX(ctx, tx, userID, cardID); err != nil {
			fmt.Println("Error deleting inbox card for detatch:", err)

			return err
		}
		return nil
	})

	if err != nil {
		fmt.Println("Error in transaction for detatching inbox card:", err)
		return nil, err
	}

	response := dto.InboxCardToResponse(deletedCard)

	return &response, nil
}

func (s *InboxService) ConvertToInboxOnly(ctx context.Context, userID, cardID uuid.UUID, correlationID uuid.UUID) (*dto.InboxCardResponse, error) {
	authorization, err := s.authz.AuthorizeRequest(ctx, authzdto.Request{
		UserID:        userID,
		CorrelationID: correlationID,
		Action:        actions.InboxCardDetatch,
		Payload: authzdto.RequestPayload{
			InboxCardDetatchPayload: &authzdto.InboxCardDetatchPayload{
				CardID: cardID,
			},
		},
	})
	if err != nil {
		return nil, err
	}
	if !authorization.Authorized {
		return nil, domainerr.ErrForbidden
	}

	var updatedInboxCard *models.UserInboxCard
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		inboxCard, err := s.repo.GetInboxCardByCardIDTX(ctx, tx, userID, cardID, s.includeDeleted)
		if err != nil {
			return err
		}
		if inboxCard.RootListCardID == nil {
			return domainerr.ErrValidation
		}

		originalCard, err := s.CardsRepo.GetCardByIDTX(ctx, tx, inboxCard.CardID, s.includeDeleted)
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
		if err := s.CardsRepo.CreateCardTX(ctx, tx, &newCard); err != nil {
			return err
		}

		checklistDomain := listcards.NewCheckListDomain()
		if err := s.ListCardsService.CopyCardChecklistsTX(ctx, tx, inboxCard.CardID, &newCard, checklistDomain); err != nil {
			return err
		}

		updatedInboxCard, err = s.repo.PatchInboxCardTX(ctx, tx, userID, cardID, map[string]interface{}{
			"card_id":           newCard.ID,
			"root_list_card_id": nil,
			"source_board_id":   nil,
		})
		return err
	})
	if err != nil {
		return nil, err
	}

	response := dto.InboxCardToResponse(updatedInboxCard)
	return &response, nil
}
