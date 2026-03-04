package cards

import (
	"GoGORM/internal/authz"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/internal/rbac"
	"GoGORM/internal/ws"
	"GoGORM/models"
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type CardsService struct {
	db               *gorm.DB
	Hub              *ws.Hub
	EventRegistry    *EventRegistry.EventRegistryService
	CardsRepo        CardsRepo
	InboxRepo        UserInboxRepo
	ListCardsRepo    ListCardsRepo
	ListsRepo        ListsRepo
	BoardListsRepo   BoardListsRepo
	BoardsRepo       BoardsRepo
	BoardLabelsRepo  BoardLabelsRepo
	WorkspacesRepo   WorkspacesRepo
	MembershipRepo   MembershipRepo
	CapabilitiesRepo CapabilitiesRepo
	IncludeDeleted   bool
}

func NewCardsService(db *gorm.DB, cardsRepo CardsRepo, listCardsRepo ListCardsRepo,
	listsRepo ListsRepo, boardListsRepo BoardListsRepo, boardsRepo BoardsRepo, boardLabelsRepo BoardLabelsRepo, workspacesRepo WorkspacesRepo,
	membershipRepo MembershipRepo, capabilitiesRepo CapabilitiesRepo,
	inboxRepo UserInboxRepo,
	hub *ws.Hub, eventRegistry *EventRegistry.EventRegistryService) *CardsService {
	return &CardsService{
		db:               db,
		Hub:              hub,
		EventRegistry:    eventRegistry,
		CardsRepo:        cardsRepo,
		InboxRepo:        inboxRepo,
		ListCardsRepo:    listCardsRepo,
		ListsRepo:        listsRepo,
		BoardListsRepo:   boardListsRepo,
		BoardsRepo:       boardsRepo,
		BoardLabelsRepo:  boardLabelsRepo,
		WorkspacesRepo:   workspacesRepo,
		MembershipRepo:   membershipRepo,
		CapabilitiesRepo: capabilitiesRepo,
		IncludeDeleted:   false,
	}
}

type CardsRepo interface {
	PatchCardDetails(ctx context.Context, cardID uuid.UUID, updateMap map[string]any) (*models.Card, error)
	GetUserCards(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.Card, error)
	GetCardsWhereUserIsMember(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.Card, error)
	GetCardsByIDs(ctx context.Context, cardIDs []uuid.UUID, includeDeleted bool) ([]models.Card, error)
	GetCardByID(ctx context.Context, card *models.Card, includeDeleted bool) error
}
type UserInboxRepo interface {
	GetUserInboxCards(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.UserInboxCard, error)
}
type ListCardsRepo interface {
	GetListCardsByCardIDs(ctx context.Context, cardIDs []uuid.UUID, includeDeleted bool) ([]models.ListCard, error)
}
type ListsRepo interface {
	GetListsByIDs(ctx context.Context, listIDs []uuid.UUID, includeDeleted bool) ([]models.List, error)
}
type BoardListsRepo interface {
	GetBoardListsByListIDs(ctx context.Context, listIDs []uuid.UUID, includeDeleted bool) ([]models.BoardList, error)
}
type BoardsRepo interface {
	GetBoardsByIDs(ctx context.Context, boardIDs []uuid.UUID, includeDeleted bool) ([]models.Board, error)
}
type BoardLabelsRepo interface {
	GetBoardLabelsByBoardIDs(ctx context.Context, boardIDs []uuid.UUID, includeDeleted bool) ([]models.BoardLabel, error)
	GetCardLabelLinksByCardIDs(ctx context.Context, cardIDs []uuid.UUID, includeDeleted bool) ([]models.CardLabelLink, error)
}
type WorkspacesRepo interface {
	GetWorkspacesByIDs(ctx context.Context, workspaceIDs []uuid.UUID, includeDeleted bool) ([]models.Workspace, error)
}
type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
}
type CapabilitiesRepo interface {
	CanEditCardInBoard(ctx context.Context, db *gorm.DB, userID, boardID, cardID uuid.UUID, roles []string, includeDeleted bool) (*bool, error)
}

func (s *CardsService) PatchCardDetails(ctx context.Context, userID, workspaceID, boardID, cardID uuid.UUID,
	req PatchCardDetailsRequest, correlationID uuid.UUID) (*models.Card, error) {

	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}

	allowedRoles := rbac.AllowedAtLeast(rbac.Member)
	if ok, err := s.CapabilitiesRepo.CanEditCardInBoard(ctx, s.db,
		userID, boardID, cardID, allowedRoles, s.IncludeDeleted); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	} else if !*ok {
		return nil, domainerr.ErrForbidden
	}

	updateMap := map[string]any{}
	if req.Title != nil {
		updateMap["title"] = *req.Title
	}
	if req.Done != nil {
		updateMap["done"] = *req.Done
	}
	if req.Description != nil {
		updateMap["description"] = *req.Description
	}
	if req.StartDate.Set {
		if req.StartDate.Value == nil {
			updateMap["start_date"] = nil
		} else {
			updateMap["start_date"] = *req.StartDate.Value
		}
	}
	if req.EndDate.Set {
		if req.EndDate.Value == nil {
			updateMap["end_date"] = nil
		} else {
			updateMap["end_date"] = *req.EndDate.Value
		}
	}

	updatedCard, err := s.CardsRepo.PatchCardDetails(ctx, cardID, updateMap)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	cardResponse := dto.CardToResponse(updatedCard)
	cardMap := map[uuid.UUID]dto.CardResponse{}
	cardMap[updatedCard.ID] = cardResponse

	payload := dto.BoardDetailResponse{
		Cards: cardMap,
	}

	eventTargets := []EventRegistry.TargetRef{
		{
			EntityType: "card",
			EntityID:   updatedCard.ID,
			BoardID:    &boardID,
		},
	}
	event := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventCardPatched,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Targets:       eventTargets,
		Payload: EventRegistry.EventPayloadEnvelope{
			StatePayload: &payload,
		},
		OccurredAt: time.Now(),
	}
	if err := s.EventRegistry.Emit(ctx, s.db, event); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	return updatedCard, nil

}

func (s *CardsService) GetUserCards(ctx context.Context, userID uuid.UUID) ([]models.Card, error) {
	cards, err := s.CardsRepo.GetUserCards(ctx, userID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	return cards, nil
}

func (s *CardsService) PatchCardProps(ctx context.Context, userID, workspaceID, boardID, cardID uuid.UUID,
	req PatchCardPropsRequest, correlationID uuid.UUID) (*models.Card, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	allowedRoles := rbac.AllowedAtLeast(rbac.Member)
	if ok, err := s.CapabilitiesRepo.CanEditCardInBoard(ctx, s.db,
		userID, boardID, cardID, allowedRoles, s.IncludeDeleted); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	} else if !*ok {
		return nil, domainerr.ErrForbidden
	}
	var card models.Card
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		//Get card props
		card.ID = cardID
		if err := s.CardsRepo.GetCardByID(ctx, &card, s.IncludeDeleted); err != nil {
			return domainerr.MapRepoErr(err, false)
		}

		mergedProps, err := dto.MergeNestedProps(req, card.Props)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}

		jsonProps, err := json.Marshal(mergedProps)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}

		jsonProps = datatypes.JSON(jsonProps)
		updateMap := map[string]any{
			"props": jsonProps,
		}
		updatedCard, err := s.CardsRepo.PatchCardDetails(ctx, cardID, updateMap)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}
		card = *updatedCard
		//fmt.Println(card)
		//Set card props
		return nil
	})
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	cardResponse := dto.CardToResponse(&card)
	cardMap := map[uuid.UUID]dto.CardResponse{}
	cardMap[card.ID] = cardResponse

	payload := dto.BoardDetailResponse{
		Cards: cardMap,
	}

	eventTargets := []EventRegistry.TargetRef{
		{
			EntityType: "card",
			EntityID:   card.ID,
			BoardID:    &boardID,
		},
	}
	event := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventCardPatched,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Targets:       eventTargets,
		Payload: EventRegistry.EventPayloadEnvelope{
			StatePayload: &payload,
		},
		OccurredAt: time.Now(),
	}
	if err := s.EventRegistry.Emit(ctx, s.db, event); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	return &card, nil
}

func (s *CardsService) GetCardsWhereUserIsMember(ctx context.Context, userID uuid.UUID) (*UserMemberCardsResponse, error) {

	//User is already checked or is the same as the userID in the token, so we can skip authz here
	inboxCards, err := s.GetInboxCardsForUser(ctx, userID)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	cards, err := s.CardsRepo.GetCardsWhereUserIsMember(ctx, userID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	if len(cards) == 0 {
		return &UserMemberCardsResponse{
			Cards:          []dto.CardResponse{},
			InboxCards:     inboxCards,
			Lists:          []dto.ListResponse{},
			BoardLists:     []dto.BoardListResponse{},
			ListCards:      []dto.ListCardResponse{},
			Boards:         []dto.BoardResponse{},
			UserBoards:     []dto.BoardResponse{},
			BoardLabels:    []dto.BoardLabelResponse{},
			CardLabelLinks: []dto.CardLabelLinkResponse{},
			Workspaces:     []dto.WorkspaceResponse{},
		}, nil
	}

	cardIds := make([]uuid.UUID, 0, len(cards))
	for _, card := range cards {
		cardIds = append(cardIds, card.ID)
	}

	listcards, err := s.ListCardsRepo.GetListCardsByCardIDs(ctx, cardIds, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	if len(listcards) == 0 {
		cardsResponse := dto.CardsToResponses(cards)
		return &UserMemberCardsResponse{
			Cards:          cardsResponse,
			InboxCards:     inboxCards,
			Lists:          []dto.ListResponse{},
			BoardLists:     []dto.BoardListResponse{},
			ListCards:      []dto.ListCardResponse{},
			Boards:         []dto.BoardResponse{},
			UserBoards:     []dto.BoardResponse{},
			BoardLabels:    []dto.BoardLabelResponse{},
			CardLabelLinks: []dto.CardLabelLinkResponse{},
			Workspaces:     []dto.WorkspaceResponse{},
		}, nil
	}

	listIds := make([]uuid.UUID, 0, len(listcards))
	for _, lc := range listcards {
		listIds = append(listIds, lc.ListID)
	}
	listIds = uniqueUUIDs(listIds)

	lists, err := s.ListsRepo.GetListsByIDs(ctx, listIds, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	boardlists, err := s.BoardListsRepo.GetBoardListsByListIDs(ctx, listIds, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	boardIds := make([]uuid.UUID, 0, len(boardlists))
	for _, bl := range boardlists {
		boardIds = append(boardIds, bl.BoardID)
	}
	boardIds = uniqueUUIDs(boardIds)

	boards, err := s.BoardsRepo.GetBoardsByIDs(ctx, boardIds, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	boardLabels, err := s.BoardLabelsRepo.GetBoardLabelsByBoardIDs(ctx, boardIds, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	cardLabelLinks, err := s.BoardLabelsRepo.GetCardLabelLinksByCardIDs(ctx, cardIds, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	workspacesIdSet := make(map[uuid.UUID]struct{}, len(boards))
	for _, board := range boards {
		workspacesIdSet[board.WorkspaceID] = struct{}{}
	}
	workspaceIds := make([]uuid.UUID, 0, len(workspacesIdSet))
	for id := range workspacesIdSet {
		workspaceIds = append(workspaceIds, id)
	}

	workspaces, err := s.WorkspacesRepo.GetWorkspacesByIDs(ctx, workspaceIds, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	listsResponse := make([]dto.ListResponse, 0, len(lists))
	for i := range lists {
		listsResponse = append(listsResponse, dto.ListToResponse(&lists[i]))
	}

	boardsResponse := make([]dto.BoardResponse, 0, len(boards))
	for i := range boards {
		boardsResponse = append(boardsResponse, dto.BoardToResponse(&boards[i]))
	}

	workspacesResponse := make([]dto.WorkspaceResponse, 0, len(workspaces))
	for i := range workspaces {
		workspacesResponse = append(workspacesResponse, dto.WorkspaceToResponse(&workspaces[i]))
	}

	return &UserMemberCardsResponse{
		Cards:          dto.CardsToResponses(cards),
		InboxCards:     inboxCards,
		Lists:          listsResponse,
		BoardLists:     dto.BoardListsToResponses(boardlists),
		ListCards:      dto.ListCardsToResponses(listcards),
		Boards:         boardsResponse,
		UserBoards:     boardsResponse,
		BoardLabels:    dto.BoardLabelsToResponses(boardLabels),
		CardLabelLinks: dto.CardLabelLinksToResponses(cardLabelLinks),
		Workspaces:     workspacesResponse,
	}, nil
}

func (s *CardsService) GetCardsWhereOtherUserIsMember(ctx context.Context, requestUserID, targetUserID uuid.UUID) (*UserMemberCardsResponse, error) {
	_ = requestUserID
	return s.GetCardsWhereUserIsMember(ctx, targetUserID)
}

func (s *CardsService) GetInboxCardsForUser(ctx context.Context, userID uuid.UUID) ([]dto.CardResponse, error) {
	if s.InboxRepo == nil {
		return []dto.CardResponse{}, nil
	}

	inboxRows, err := s.InboxRepo.GetUserInboxCards(ctx, userID, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}
	if len(inboxRows) == 0 {
		return []dto.CardResponse{}, nil
	}

	cardIDs := make([]uuid.UUID, 0, len(inboxRows))
	for _, inboxRow := range inboxRows {
		cardIDs = append(cardIDs, inboxRow.CardID)
	}
	cardIDs = uniqueUUIDs(cardIDs)

	inboxCardEntities, err := s.CardsRepo.GetCardsByIDs(ctx, cardIDs, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}

	inboxCardsByID := make(map[uuid.UUID]dto.CardResponse, len(inboxCardEntities))
	for i := range inboxCardEntities {
		card := inboxCardEntities[i]
		inboxCardsByID[card.ID] = dto.CardToResponse(&card)
	}

	inboxCards := make([]dto.CardResponse, 0, len(inboxRows))
	for _, inboxRow := range inboxRows {
		if cardResponse, ok := inboxCardsByID[inboxRow.CardID]; ok {
			inboxCards = append(inboxCards, cardResponse)
		}
	}

	return inboxCards, nil
}

func uniqueUUIDs(ids []uuid.UUID) []uuid.UUID {
	if len(ids) == 0 {
		return ids
	}
	set := make(map[uuid.UUID]struct{}, len(ids))
	for _, id := range ids {
		set[id] = struct{}{}
	}
	unique := make([]uuid.UUID, 0, len(set))
	for id := range set {
		unique = append(unique, id)
	}
	return unique
}
