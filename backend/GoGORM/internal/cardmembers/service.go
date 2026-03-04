package cardmembers

import (
	"GoGORM/internal/authz"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/internal/rbac"
	"GoGORM/internal/ws"
	"GoGORM/models"
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CardMembersService struct {
	db              *gorm.DB
	repo            CardMembersRepo
	CardsRepo       CardsRepo
	ListCardsRepo   ListCardsRepo
	ListsRepo       ListsRepo
	BoardListsRepo  BoardListsRepo
	BoardsRepo      BoardsRepo
	BoardLabelsRepo BoardLabelsRepo
	WorkspacesRepo  WorkspacesRepo
	MembershipRepo  MembershipRepo
	EventRegistry   *EventRegistry.EventRegistryService
	IncludeDeleted  bool
}

type CardMembersRepo interface {
	GetCardMembersForBoard(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.CardMember, error)
	GetCardMembersForCard(ctx context.Context, cardID uuid.UUID, includeDeleted bool) ([]models.CardMember, error)
	AddCardMember(ctx context.Context, cardMember models.CardMember) error
	RemoveCardMember(ctx context.Context, cardID, userID uuid.UUID) (*models.CardMember, error)
}

type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
	GetUsersByIDs(ctx context.Context, userIDs []uuid.UUID) ([]models.User, error)
}

type CardsRepo interface {
	GetCardsWhereUserIsMember(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.Card, error)
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

func NewCardMemberService(repo CardMembersRepo, cardsRepo CardsRepo, listCardsRepo ListCardsRepo,
	listsRepo ListsRepo, boardListsRepo BoardListsRepo, boardsRepo BoardsRepo, boardLabelsRepo BoardLabelsRepo, workspacesRepo WorkspacesRepo,
	db *gorm.DB, membershipRepo MembershipRepo, eventRegistry *EventRegistry.EventRegistryService, includeDeleted bool) *CardMembersService {
	return &CardMembersService{
		db:              db,
		repo:            repo,
		CardsRepo:       cardsRepo,
		ListCardsRepo:   listCardsRepo,
		ListsRepo:       listsRepo,
		BoardListsRepo:  boardListsRepo,
		BoardsRepo:      boardsRepo,
		BoardLabelsRepo: boardLabelsRepo,
		WorkspacesRepo:  workspacesRepo,
		MembershipRepo:  membershipRepo,
		EventRegistry:   eventRegistry,
		IncludeDeleted:  includeDeleted,
	}
}

func (s *CardMembersService) GetCardMembersForBoard(ctx context.Context, userID, boardID, correlationID uuid.UUID) ([]CardMemberResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	cardMembers, err := s.repo.GetCardMembersForBoard(ctx, boardID, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}
	return s.toCardMemberResponses(ctx, cardMembers)
}

func (s *CardMembersService) GetCardMembersForCard(ctx context.Context, userID, boardID, cardID, correlationID uuid.UUID) ([]CardMemberResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	cardMembers, err := s.repo.GetCardMembersForCard(ctx, cardID, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}
	return s.toCardMemberResponses(ctx, cardMembers)
}

func (s *CardMembersService) toCardMemberResponses(ctx context.Context, members []models.CardMember) ([]CardMemberResponse, error) {
	if len(members) == 0 {
		return []CardMemberResponse{}, nil
	}

	seen := make(map[uuid.UUID]struct{}, len(members))
	userIDs := make([]uuid.UUID, 0, len(members))
	for i := range members {
		if _, ok := seen[members[i].UserID]; ok {
			continue
		}
		seen[members[i].UserID] = struct{}{}
		userIDs = append(userIDs, members[i].UserID)
	}

	users, err := s.MembershipRepo.GetUsersByIDs(ctx, userIDs)
	if err != nil {
		return nil, err
	}

	usersByID := make(map[uuid.UUID]dto.UserResponse, len(users))
	for i := range users {
		usersByID[users[i].ID] = dto.UserToResponse(&users[i])
	}

	responses := make([]CardMemberResponse, 0, len(members))
	for i := range members {
		userResponse, ok := usersByID[members[i].UserID]
		if !ok {
			userResponse = dto.UserResponse{ID: members[i].UserID}
		}
		responses = append(responses, CardMemberResponse{
			CardMember: toDTOCardMemberResponse(&members[i]),
			User:       userResponse,
		})
	}

	return responses, nil
}

func (s *CardMembersService) AddCardMember(ctx context.Context, userID, workspaceID, boardID, cardID, memberID, correlationID uuid.UUID) (*CardMemberResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	if err := s.ensureMemberInBoard(ctx, memberID, boardID); err != nil {
		return nil, err
	}

	cardMember := models.CardMember{
		ID:              uuid.New(),
		CardID:          cardID,
		UserID:          memberID,
		CreatedByUserID: userID,
	}
	if err := s.repo.AddCardMember(ctx, cardMember); err != nil {
		return nil, err
	}
	userResponse, err := s.getUserResponseByID(ctx, memberID)
	if err != nil {
		return nil, err
	}

	response := CardMemberResponse{
		CardMember: toDTOCardMemberResponse(&cardMember),
		User:       userResponse,
	}
	addedPayload, err := s.buildCardsUserMemberAddedPayload(ctx, memberID)
	if err != nil {
		return nil, err
	}

	statePayload := &dto.BoardDetailResponse{
		CardMembers: []dto.CardMemberResponse{response.CardMember},
		Users: map[uuid.UUID]dto.UserResponse{
			memberID: userResponse,
		},
	}
	userEventType := ws.EventCardsUserMemberAdded
	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: statePayload,
		UserPayload: map[uuid.UUID]ws.UserEventPayload{
			memberID: {
				CardsUserMemberAddedPayload: addedPayload,
			},
		},
	}
	occurredAt := time.Now()
	boardDomainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventCardMemberAdded,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		OccurredAt:    occurredAt,
	}
	if err := s.EventRegistry.Emit(ctx, s.db, boardDomainEvent); err != nil {
		fmt.Println("Error emitting board-scoped card member added event:", err)
	}

	userDomainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventCardsUserMemberAdded,
		UserEventType: &userEventType,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		OccurredAt:    occurredAt,
	}
	if err := s.EventRegistry.Emit(ctx, s.db, userDomainEvent); err != nil {
		// Log the error but do not fail the main operation
		// as the card member has already been added successfully
		fmt.Println("Error emitting user-scoped card member added event:", err)
	}

	return &response, nil
}

func (s *CardMembersService) RemoveCardMember(ctx context.Context, userID, workspaceID, boardID, cardID, memberID, correlationID uuid.UUID) (*CardMemberResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	if err := s.ensureMemberInBoard(ctx, memberID, boardID); err != nil {
		return nil, err
	}
	removedMember, err := s.repo.RemoveCardMember(ctx, cardID, memberID)
	if err != nil {
		return nil, err
	}

	userResponse, err := s.getUserResponseByID(ctx, removedMember.UserID)
	if err != nil {
		return nil, err
	}

	response := CardMemberResponse{
		CardMember: toDTOCardMemberResponse(removedMember),
		User:       userResponse,
	}

	statePayload := &dto.BoardDetailResponse{
		CardMembers: []dto.CardMemberResponse{response.CardMember},
		Users: map[uuid.UUID]dto.UserResponse{
			removedMember.UserID: userResponse,
		},
	}
	userEventType := ws.EventCardsUserMemberRemoved
	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: statePayload,
		UserPayload: map[uuid.UUID]ws.UserEventPayload{
			removedMember.UserID: {
				CardsUserMemberRemovedPayload: &ws.CardsUserMemberRemovedPayload{CardID: removedMember.CardID},
			},
		},
	}
	occurredAt := time.Now()
	boardDomainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventCardMemberRemoved,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		OccurredAt:    occurredAt,
	}
	if err := s.EventRegistry.Emit(ctx, s.db, boardDomainEvent); err != nil {
		fmt.Println("Error emitting board-scoped card member removed event:", err)
	}

	userDomainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventCardsUserMemberRemoved,
		UserEventType: &userEventType,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		OccurredAt:    occurredAt,
	}
	if err := s.EventRegistry.Emit(ctx, s.db, userDomainEvent); err != nil {
		// Log the error but do not fail the main operation
		// as the card member has already been removed successfully
		fmt.Println("Error emitting user-scoped card member removed event:", err)
	}

	return &response, nil
}

func (s *CardMembersService) getUserResponseByID(ctx context.Context, userID uuid.UUID) (dto.UserResponse, error) {
	users, err := s.MembershipRepo.GetUsersByIDs(ctx, []uuid.UUID{userID})
	if err != nil {
		return dto.UserResponse{}, err
	}
	if len(users) == 0 {
		return dto.UserResponse{ID: userID}, nil
	}
	return dto.UserToResponse(&users[0]), nil
}

func (s *CardMembersService) ensureMemberInBoard(ctx context.Context, memberID, boardID uuid.UUID) error {
	if _, err := s.MembershipRepo.GetUserRole(ctx, memberID, boardID, s.IncludeDeleted); err != nil {
		return domainerr.New(domainerr.ErrValidation, "member is not part of board context")
	}
	return nil
}

func toDTOCardMemberResponse(member *models.CardMember) dto.CardMemberResponse {
	return dto.CardMemberResponse{
		ID:              member.ID,
		CardID:          member.CardID,
		UserID:          member.UserID,
		CreatedByUserID: member.CreatedByUserID,
		CreatedAt:       member.CreatedAt,
		UpdatedAt:       member.UpdatedAt,
		DeletedAt:       dto.DeletedAtPtr(member.DeletedAt),
	}
}

func (s *CardMembersService) buildCardsUserMemberAddedPayload(ctx context.Context, userID uuid.UUID) (*ws.CardsUserMemberAddedPayload, error) {
	cardsRows, err := s.CardsRepo.GetCardsWhereUserIsMember(ctx, userID, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}
	if len(cardsRows) == 0 {
		return &ws.CardsUserMemberAddedPayload{
			Cards:          []dto.CardResponse{},
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

	cardIDs := make([]uuid.UUID, 0, len(cardsRows))
	for i := range cardsRows {
		cardIDs = append(cardIDs, cardsRows[i].ID)
	}

	listCardsRows, err := s.ListCardsRepo.GetListCardsByCardIDs(ctx, cardIDs, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}

	listIDs := make([]uuid.UUID, 0, len(listCardsRows))
	for i := range listCardsRows {
		listIDs = append(listIDs, listCardsRows[i].ListID)
	}
	listIDs = uniqueUUIDs(listIDs)

	listsRows, err := s.ListsRepo.GetListsByIDs(ctx, listIDs, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}

	boardListsRows, err := s.BoardListsRepo.GetBoardListsByListIDs(ctx, listIDs, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}

	boardIDs := make([]uuid.UUID, 0, len(boardListsRows))
	for i := range boardListsRows {
		boardIDs = append(boardIDs, boardListsRows[i].BoardID)
	}
	boardIDs = uniqueUUIDs(boardIDs)

	boardsRows, err := s.BoardsRepo.GetBoardsByIDs(ctx, boardIDs, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}

	boardLabelsRows, err := s.BoardLabelsRepo.GetBoardLabelsByBoardIDs(ctx, boardIDs, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}

	cardLabelLinksRows, err := s.BoardLabelsRepo.GetCardLabelLinksByCardIDs(ctx, cardIDs, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}

	workspaceIDSet := make(map[uuid.UUID]struct{}, len(boardsRows))
	for i := range boardsRows {
		workspaceIDSet[boardsRows[i].WorkspaceID] = struct{}{}
	}
	workspaceIDs := make([]uuid.UUID, 0, len(workspaceIDSet))
	for id := range workspaceIDSet {
		workspaceIDs = append(workspaceIDs, id)
	}

	workspaceRows, err := s.WorkspacesRepo.GetWorkspacesByIDs(ctx, workspaceIDs, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}

	listsResponse := make([]dto.ListResponse, 0, len(listsRows))
	for i := range listsRows {
		listsResponse = append(listsResponse, dto.ListToResponse(&listsRows[i]))
	}

	boardsResponse := make([]dto.BoardResponse, 0, len(boardsRows))
	for i := range boardsRows {
		boardsResponse = append(boardsResponse, dto.BoardToResponse(&boardsRows[i]))
	}

	workspacesResponse := make([]dto.WorkspaceResponse, 0, len(workspaceRows))
	for i := range workspaceRows {
		workspacesResponse = append(workspacesResponse, dto.WorkspaceToResponse(&workspaceRows[i]))
	}

	return &ws.CardsUserMemberAddedPayload{
		Cards:          dto.CardsToResponses(cardsRows),
		Lists:          listsResponse,
		BoardLists:     dto.BoardListsToResponses(boardListsRows),
		ListCards:      dto.ListCardsToResponses(listCardsRows),
		Boards:         boardsResponse,
		UserBoards:     boardsResponse,
		BoardLabels:    dto.BoardLabelsToResponses(boardLabelsRows),
		CardLabelLinks: dto.CardLabelLinksToResponses(cardLabelLinksRows),
		Workspaces:     workspacesResponse,
	}, nil
}

func uniqueUUIDs(ids []uuid.UUID) []uuid.UUID {
	if len(ids) == 0 {
		return ids
	}
	set := make(map[uuid.UUID]struct{}, len(ids))
	for _, id := range ids {
		set[id] = struct{}{}
	}
	result := make([]uuid.UUID, 0, len(set))
	for id := range set {
		result = append(result, id)
	}
	return result
}
