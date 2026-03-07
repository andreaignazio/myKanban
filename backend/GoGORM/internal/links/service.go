package links

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/internal/guard"
	"GoGORM/internal/listcards"
	"GoGORM/internal/rank"
	"GoGORM/internal/rbac"
	"GoGORM/internal/ws"
	"GoGORM/models"
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type LinksService struct {
	db                 *gorm.DB
	EventRegistry      *EventRegistry.EventRegistryService
	Hub                *ws.Hub
	LinksRepo          LinksRepo
	ListRepo           ListRepo
	BoardRepo          BoardsRepo
	CardRepo           CardsRepo
	ListCardsService   *listcards.ListCardsService
	PositionHelper     PositionHelper
	MembershipRepo     MembershipRepo
	ListShareOfferRepo ListShareOfferRepo
	BoardLabelsRepo    BoardLabelsRepo
	IncludeDeleted     bool
}

const userBoardSoftDeletedReason = "relation soft-deleted"

func NewLinksService(db *gorm.DB, eventRegistry *EventRegistry.EventRegistryService, hub *ws.Hub, linksRepo LinksRepo, BoardsRepo BoardsRepo, listRepo ListRepo, CardRepo CardsRepo, positionHelper PositionHelper, membershipRepo MembershipRepo, listShareOfferRepo ListShareOfferRepo, boardLabelsRepo BoardLabelsRepo) *LinksService {
	return &LinksService{db: db, EventRegistry: eventRegistry, Hub: hub, LinksRepo: linksRepo, BoardRepo: BoardsRepo, ListRepo: listRepo, CardRepo: CardRepo, PositionHelper: positionHelper, MembershipRepo: membershipRepo, ListShareOfferRepo: listShareOfferRepo, BoardLabelsRepo: boardLabelsRepo, IncludeDeleted: false}
}

func NewLinksServiceWithListCards(
	db *gorm.DB,
	eventRegistry *EventRegistry.EventRegistryService,
	hub *ws.Hub,
	linksRepo LinksRepo,
	BoardsRepo BoardsRepo,
	listRepo ListRepo,
	CardRepo CardsRepo,
	listCardsService *listcards.ListCardsService,
	positionHelper PositionHelper,
	membershipRepo MembershipRepo,
	listShareOfferRepo ListShareOfferRepo,
	boardLabelsRepo BoardLabelsRepo,
) *LinksService {
	return &LinksService{
		db:                 db,
		EventRegistry:      eventRegistry,
		Hub:                hub,
		LinksRepo:          linksRepo,
		BoardRepo:          BoardsRepo,
		ListRepo:           listRepo,
		CardRepo:           CardRepo,
		ListCardsService:   listCardsService,
		PositionHelper:     positionHelper,
		MembershipRepo:     membershipRepo,
		ListShareOfferRepo: listShareOfferRepo,
		BoardLabelsRepo:    boardLabelsRepo,
		IncludeDeleted:     false,
	}
}

func (s *LinksService) CopyBulkListsInBoard(
	ctx context.Context,
	userID, workspaceID, boardID uuid.UUID,
	req BulkCopyListsRequest,
	correlationID uuid.UUID,
) (*BulkCopyListsResponse, error) {
	if s.ListCardsService == nil {
		return nil, domainerr.ErrInternal
	}

	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}

	if len(req.ListIDs) == 0 {
		if len(req.Lists) == 0 {
			return nil, domainerr.ErrValidation
		}
	}

	type listCopyInput struct {
		ListID uuid.UUID
		Title  *string
	}

	listInputs := make([]listCopyInput, 0, len(req.ListIDs)+len(req.Lists))
	if len(req.Lists) > 0 {
		for i := range req.Lists {
			listInputs = append(listInputs, listCopyInput{
				ListID: req.Lists[i].ListID,
				Title:  req.Lists[i].Title,
			})
		}
	} else {
		for _, listID := range req.ListIDs {
			listInputs = append(listInputs, listCopyInput{ListID: listID})
		}
	}

	boardLists, err := s.LinksRepo.GetListsInBoard(ctx, boardID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	boardListSet := make(map[uuid.UUID]struct{}, len(boardLists))
	for i := range boardLists {
		boardListSet[boardLists[i].ListID] = struct{}{}
	}

	requestedListSet := make(map[uuid.UUID]struct{}, len(listInputs))
	requestedListIDs := make([]uuid.UUID, 0, len(listInputs))
	for _, input := range listInputs {
		listID := input.ListID
		if _, ok := boardListSet[listID]; !ok {
			return nil, domainerr.ErrNotFound
		}
		if _, duplicated := requestedListSet[listID]; duplicated {
			return nil, domainerr.ErrValidation
		}
		requestedListSet[listID] = struct{}{}
		requestedListIDs = append(requestedListIDs, listID)
	}

	sourceLists, err := s.ListRepo.GetListsByListIds(ctx, requestedListIDs, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	sourceListByID := make(map[uuid.UUID]models.List, len(sourceLists))
	for i := range sourceLists {
		sourceListByID[sourceLists[i].ID] = sourceLists[i]
	}

	sourceListCards, err := s.LinksRepo.GetListCardLinks(ctx, requestedListIDs, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	sourceCardIDsByList := make(map[uuid.UUID][]uuid.UUID, len(requestedListIDs))
	for i := range sourceListCards {
		lc := sourceListCards[i]
		sourceCardIDsByList[lc.ListID] = append(sourceCardIDsByList[lc.ListID], lc.CardID)
	}

	keepMembers := false
	if req.KeepMembers != nil {
		keepMembers = *req.KeepMembers
	}

	items := make([]BulkCopiedListItem, 0, len(listInputs))
	totalCopiedCards := 0
	var previousNewListID *uuid.UUID

	for i, input := range listInputs {
		sourceListID := input.ListID
		sourceList, ok := sourceListByID[sourceListID]
		if !ok {
			return nil, domainerr.ErrNotFound
		}

		title := sourceList.Title
		if input.Title != nil {
			trimmedTitle := strings.TrimSpace(*input.Title)
			if trimmedTitle != "" {
				title = trimmedTitle
			}
		}

		createReq := CreateListInBoardRequest{Title: title}
		if i == 0 {
			if req.AfterID != nil {
				createReq.AfterID = req.AfterID
			} else if req.InsertAt != nil {
				createReq.InsertAt = req.InsertAt
			}
		} else {
			createReq.AfterID = previousNewListID
		}

		newList, _, err := s.CreateListInBoard(ctx, userID, workspaceID, boardID, createReq, correlationID)
		if err != nil {
			return nil, err
		}

		newListID := newList.ID
		previousNewListID = &newListID

		copiedCards := 0
		sourceCardIDs := sourceCardIDsByList[sourceListID]
		for _, sourceCardID := range sourceCardIDs {
			copyReq := listcards.CopyCardToListRequest{
				MirrorCardToListRequest: listcards.MirrorCardToListRequest{
					TargetListID:  newListID,
					TargetBoardID: boardID,
				},
				CopyCardRequest: listcards.CopyCardRequest{
					KeepComments:   false,
					KeepMembers:    keepMembers,
					KeepLabels:     true,
					KeepChecklists: true,
				},
			}

			if _, _, err := s.ListCardsService.CopyCardToList(ctx, userID, workspaceID, boardID, sourceCardID, copyReq, correlationID); err != nil {
				return nil, err
			}
			copiedCards++
		}

		totalCopiedCards += copiedCards
		items = append(items, BulkCopiedListItem{
			SourceListID: sourceListID,
			TargetListID: newListID,
			CopiedCards:  copiedCards,
		})
	}

	return &BulkCopyListsResponse{
		Items:            items,
		TotalCopiedLists: len(items),
		TotalCopiedCards: totalCopiedCards,
	}, nil
}

func getNewPositionInBoardAfter(generator *rank.RankGenerator, boardLists []models.BoardList, AfterID uuid.UUID) (string, error) {
	idx := -1
	for i, bl := range boardLists {
		if bl.ListID == AfterID {
			idx = i
			break
		}
	}
	if idx == -1 {
		return "", domainerr.ErrNotFound
	}
	prevPos := boardLists[idx].Pos
	nextPos := ""
	if idx+1 < len(boardLists) {
		nextPos = boardLists[idx+1].Pos
	}

	key, err := generator.GenerateRankBetween(prevPos, nextPos)
	if err != nil {
		return "", domainerr.ErrInternal
	}
	return key, nil
}

func getNewPositionInBoardStart(generator *rank.RankGenerator, boardLists []models.BoardList) (string, error) {
	nextPos := ""
	if len(boardLists) > 0 {
		nextPos = boardLists[0].Pos
	}
	key, err := generator.GenerateRankBetween("", nextPos)
	if err != nil {
		return "", domainerr.ErrInternal
	}

	return key, nil
}
func getNewPositionInBoardEnd(generator *rank.RankGenerator, boardLists []models.BoardList) (string, error) {
	prevPos := ""
	if len(boardLists) > 0 {
		prevPos = boardLists[len(boardLists)-1].Pos
	}
	key, err := generator.GenerateRankBetween(prevPos, "")
	if err != nil {
		return "", domainerr.ErrInternal
	}
	return key, nil
}

type ListInBoard struct {
	List     *models.List
	BoardID  uuid.UUID
	Position string
}

func (s *LinksService) MoveListInBoard(ctx context.Context,
	userID, workspaceID, listID, boardID uuid.UUID,
	req MoveListInBoardDTO,
	correlationID uuid.UUID) (*models.BoardList, error) {

	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}
	boardLists, err := s.LinksRepo.GetListsInBoard(ctx, boardID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	listExists := false
	for _, bl := range boardLists {
		if bl.ListID == listID {
			listExists = true
			break
		}
	}
	if !listExists {
		return nil, domainerr.ErrNotFound
	}

	var position = ""
	if req.BeforeID != nil {
		position, err = s.PositionHelper.ListPosBeforeID(ctx, boardID, *req.BeforeID)
		if err != nil {
			return nil, err
		}
	} else if req.InsertAt != nil && *req.InsertAt == "start" {
		position, err = s.PositionHelper.ListPosAtBoardStart(ctx, boardID)
		if err != nil {
			return nil, err
		}
	} else {
		position, err = s.PositionHelper.ListPosAtBoardEnd(ctx, boardID)
		if err != nil {
			return nil, err
		}
	}

	boardListUpdate := &models.BoardList{
		BoardID: boardID,
		ListID:  listID,
		Pos:     position,
	}
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := s.LinksRepo.PatchBoardListPositionTX(ctx, tx, boardListUpdate); err != nil {
			return domainerr.MapRepoErr(err, false)
		}
		return nil
	})
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	statePayload := dto.BoardDetailResponse{
		BoardListRelations: []dto.BoardListResponse{
			dto.BoardListToResponse(boardListUpdate),
		},
	}

	payloadEnvelope := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}

	targets := []EventRegistry.TargetRef{
		{
			EntityType: "board",
			EntityID:   boardID,
		},
		{
			EntityType: "list",
			EntityID:   listID,
		},
	}

	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventBoardListMoved,
		ActorUserID:   &userID,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		CorrelationID: &correlationID,
		Payload:       payloadEnvelope,
		Targets:       targets,
		OccurredAt:    time.Now(),
	}

	if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
		fmt.Println("failed to emit event:", err)
	}

	return boardListUpdate, nil

}

func (s *LinksService) resolveMoveBoardListPosition(
	ctx context.Context,
	boardID uuid.UUID,
	req MoveBoardListDTO,
) (string, error) {
	if req.BeforeID != nil && *req.BeforeID == uuid.Nil {
		req.BeforeID = nil
	}
	if req.AfterID != nil && *req.AfterID == uuid.Nil {
		req.AfterID = nil
	}
	if req.InsertAt != nil {
		trimmed := strings.TrimSpace(*req.InsertAt)
		if trimmed == "" {
			req.InsertAt = nil
		} else {
			normalized := strings.ToLower(trimmed)
			req.InsertAt = &normalized
		}
	}

	if req.BeforeID != nil && req.AfterID != nil {
		return "", domainerr.ErrValidation
	}

	if req.BeforeID != nil {
		position, err := s.PositionHelper.ListPosBeforeID(ctx, boardID, *req.BeforeID)
		if err != nil {
			return "", err
		}
		return position, nil
	}

	if req.AfterID != nil {
		position, err := s.PositionHelper.ListPosAfterID(ctx, boardID, *req.AfterID)
		if err != nil {
			return "", err
		}
		return position, nil
	}

	if req.InsertAt != nil {
		insertAt := strings.TrimSpace(*req.InsertAt)
		if insertAt == "start" {
			position, err := s.PositionHelper.ListPosAtBoardStart(ctx, boardID)
			if err != nil {
				return "", err
			}
			return position, nil
		}
		if insertAt == "end" {
			position, err := s.PositionHelper.ListPosAtBoardEnd(ctx, boardID)
			if err != nil {
				return "", err
			}
			return position, nil
		}
		return "", domainerr.ErrValidation
	}

	position, err := s.PositionHelper.ListPosAtBoardEnd(ctx, boardID)
	if err != nil {
		return "", err
	}
	return position, nil
}

func (s *LinksService) MoveBoardList(
	ctx context.Context,
	userID, workspaceID, sourceBoardID, listID uuid.UUID,
	req MoveBoardListDTO,
	correlationID uuid.UUID,
) (*models.BoardList, *models.BoardList, error) {
	if req.BeforeID != nil && *req.BeforeID == listID {
		req.BeforeID = nil
	}
	if req.AfterID != nil && *req.AfterID == listID {
		req.AfterID = nil
	}

	targetBoardID := sourceBoardID
	if req.TargetBoardID != nil && *req.TargetBoardID != uuid.Nil {
		targetBoardID = *req.TargetBoardID
	}

	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, sourceBoardID, rbac.Member, s.IncludeDeleted); err != nil {
		fmt.Println("Error checking user role for source board:", err)
		return nil, nil, err
	}
	if targetBoardID != sourceBoardID {
		if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, targetBoardID, rbac.Member, s.IncludeDeleted); err != nil {
			fmt.Println("Error checking user role for target board:", err)
			return nil, nil, err
		}
	}

	position, err := s.resolveMoveBoardListPosition(ctx, targetBoardID, req)
	if err != nil {
		fmt.Println("Error resolving move board list position:", err)
		fmt.Println("sourceBoardID:", sourceBoardID, "targetBoardID:", targetBoardID, "req:", req)
		return nil, nil, err
	}

	if targetBoardID == sourceBoardID {
		boardListUpdate := &models.BoardList{
			BoardID: sourceBoardID,
			ListID:  listID,
			Pos:     position,
		}

		err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			if _, err := s.LinksRepo.GetBoardList(ctx, sourceBoardID, listID, s.IncludeDeleted); err != nil {
				fmt.Println("Error getting board list:", err)
				return domainerr.MapRepoErr(err, true)
			}
			if err := s.LinksRepo.PatchBoardListPositionTX(ctx, tx, boardListUpdate); err != nil {
				fmt.Println("Error patching board list position:", err)
				return domainerr.MapRepoErr(err, false)
			}
			fmt.Println("Successfully moved list within the same board:", boardListUpdate)
			return nil
		})
		if err != nil {
			fmt.Println("Error moving list within the same board:", err)
			return nil, nil, err
		}

		statePayload := dto.BoardDetailResponse{
			BoardListRelations: []dto.BoardListResponse{dto.BoardListToResponse(boardListUpdate)},
		}
		domainEvent := EventRegistry.DomainEvent{
			Type:          EventRegistry.EventBoardListMoved,
			ActorUserID:   &userID,
			WorkspaceID:   &workspaceID,
			BoardID:       &sourceBoardID,
			CorrelationID: &correlationID,
			Payload: EventRegistry.EventPayloadEnvelope{
				StatePayload: &statePayload,
			},
			Targets: []EventRegistry.TargetRef{
				{EntityType: "board", EntityID: sourceBoardID},
				{EntityType: "list", EntityID: listID},
			},
			OccurredAt: time.Now(),
		}
		if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
			fmt.Println("failed to emit event:", err)
		}

		return boardListUpdate, boardListUpdate, nil
	}

	var detachedBoardList *models.BoardList
	targetBoardList := &models.BoardList{}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		existingSourceLink, err := s.LinksRepo.GetBoardList(ctx, sourceBoardID, listID, s.IncludeDeleted)
		if err != nil {
			fmt.Println("Error getting board list:", err)
			return domainerr.MapRepoErr(err, true)
		}

		if _, err := s.LinksRepo.GetBoardList(ctx, targetBoardID, listID, s.IncludeDeleted); err == nil {
			fmt.Println("Error: board list already exists in target board")
			return domainerr.ErrValidation
		}

		detachedBoardList, err = s.LinksRepo.DetatchListFromBoard(ctx, tx, sourceBoardID, listID)
		if err != nil {
			fmt.Println("Error detaching list from board:", err)
			return domainerr.MapRepoErr(err, false)
		}

		targetBoardList.ID = uuid.New()
		targetBoardList.RootID = existingSourceLink.RootID
		if targetBoardList.RootID == uuid.Nil {
			targetBoardList.RootID = existingSourceLink.ID
		}
		targetBoardList.BoardID = targetBoardID
		targetBoardList.ListID = listID
		targetBoardList.Pos = position
		targetBoardList.AccessMode = existingSourceLink.AccessMode

		if err := s.LinksRepo.CreateBoardListTX(ctx, tx, targetBoardList); err != nil {
			fmt.Println("Error creating board list in target board:", err)
			return domainerr.MapRepoErr(err, false)
		}

		return nil
	})
	if err != nil {
		fmt.Println("Error moving board list:", err)
		return nil, nil, err
	}

	sourcePayload := dto.BoardDetailResponse{
		BoardListRelations: []dto.BoardListResponse{dto.BoardListToResponse(detachedBoardList)},
	}
	targetPayload := dto.BoardDetailResponse{
		BoardListRelations: []dto.BoardListResponse{dto.BoardListToResponse(targetBoardList)},
	}

	sourceEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventBoardListDetatched,
		ActorUserID:   &userID,
		WorkspaceID:   &workspaceID,
		BoardID:       &sourceBoardID,
		CorrelationID: &correlationID,
		Payload: EventRegistry.EventPayloadEnvelope{
			StatePayload: &sourcePayload,
		},
		Targets: []EventRegistry.TargetRef{
			{EntityType: "board", EntityID: sourceBoardID, BoardID: &sourceBoardID},
			{EntityType: "list", EntityID: listID, BoardID: &sourceBoardID},
		},
		OccurredAt: time.Now(),
	}

	targetEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventBoardListCreated,
		ActorUserID:   &userID,
		WorkspaceID:   &workspaceID,
		BoardID:       &targetBoardID,
		CorrelationID: &correlationID,
		Payload: EventRegistry.EventPayloadEnvelope{
			StatePayload: &targetPayload,
		},
		Targets: []EventRegistry.TargetRef{
			{EntityType: "board", EntityID: targetBoardID, BoardID: &targetBoardID},
			{EntityType: "list", EntityID: listID, BoardID: &targetBoardID},
		},
		OccurredAt: time.Now(),
	}

	if err := s.EventRegistry.Emit(ctx, s.db, sourceEvent); err != nil {
		fmt.Println("failed to emit source event:", err)
	}
	if err := s.EventRegistry.Emit(ctx, s.db, targetEvent); err != nil {
		fmt.Println("failed to emit target event:", err)
	}

	return detachedBoardList, targetBoardList, nil
}

func (s *LinksService) MirrorBoardList(
	ctx context.Context,
	userID, workspaceID, sourceBoardID, listID uuid.UUID,
	req MirrorBoardListDTO,
	correlationID uuid.UUID,
) (*models.List, *models.BoardList, error) {
	targetBoardID := req.TargetBoardID
	if targetBoardID == uuid.Nil || targetBoardID == sourceBoardID {
		return nil, nil, domainerr.ErrValidation
	}

	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, sourceBoardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, nil, err
	}
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, targetBoardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, nil, err
	}

	sourceBoardList, err := s.LinksRepo.GetBoardList(ctx, sourceBoardID, listID, s.IncludeDeleted)
	if err != nil {
		return nil, nil, domainerr.MapRepoErr(err, true)
	}

	targetExisting, err := s.LinksRepo.GetBoardList(ctx, targetBoardID, listID, true)
	targetExistsActive := false
	targetExistsArchived := false
	if err == nil {
		if targetExisting.DeletedAt.Valid {
			targetExistsArchived = true
		} else {
			targetExistsActive = true
		}
	} else if !errors.Is(err, domainerr.ErrNotFound) {
		return nil, nil, domainerr.MapRepoErr(err, false)
	}

	if targetExistsActive {
		return nil, nil, domainerr.ErrConflict
	}

	moveReq := MoveBoardListDTO{
		TargetBoardID: &targetBoardID,
		BeforeID:      req.BeforeID,
		InsertAt:      req.InsertAt,
	}

	position, err := s.resolveMoveBoardListPosition(ctx, targetBoardID, moveReq)
	if err != nil {
		return nil, nil, err
	}

	targetBoardList := &models.BoardList{}
	if targetExistsArchived {
		restored, restoreErr := s.LinksRepo.RestoreListToBoard(ctx, targetBoardID, listID, position)
		if restoreErr != nil {
			return nil, nil, domainerr.MapRepoErr(restoreErr, false)
		}

		restored.AccessMode = sourceBoardList.AccessMode
		if patchErr := s.LinksRepo.PatchBoardListAccessMode(ctx, restored); patchErr != nil {
			return nil, nil, domainerr.MapRepoErr(patchErr, false)
		}

		*targetBoardList = *restored
	} else {
		if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			targetBoardList.ID = uuid.New()
			targetBoardList.RootID = sourceBoardList.RootID
			if targetBoardList.RootID == uuid.Nil {
				targetBoardList.RootID = sourceBoardList.ID
			}
			targetBoardList.BoardID = targetBoardID
			targetBoardList.ListID = listID
			targetBoardList.Pos = position
			targetBoardList.AccessMode = sourceBoardList.AccessMode
			if err := s.LinksRepo.CreateBoardListTX(ctx, tx, targetBoardList); err != nil {
				return domainerr.MapRepoErr(err, false)
			}
			return nil
		}); err != nil {
			return nil, nil, err
		}
	}

	listMeta, err := s.ListRepo.GetListMeta(ctx, listID, s.IncludeDeleted)
	if err != nil {
		return nil, nil, domainerr.MapRepoErr(err, true)
	}

	listCardLinks, err := s.LinksRepo.GetListCardLinks(ctx, []uuid.UUID{listID}, s.IncludeDeleted)
	if err != nil {
		return nil, nil, domainerr.MapRepoErr(err, false)
	}

	cardIDs := make([]uuid.UUID, 0, len(listCardLinks))
	for i := range listCardLinks {
		cardIDs = append(cardIDs, listCardLinks[i].CardID)
	}

	cardsByID := make(map[uuid.UUID]dto.CardResponse)
	if len(cardIDs) > 0 {
		cards, err := s.CardRepo.GetCardsByIDs(ctx, cardIDs, s.IncludeDeleted)
		if err != nil {
			return nil, nil, domainerr.MapRepoErr(err, false)
		}
		for i := range cards {
			cardsByID[cards[i].ID] = dto.CardToResponse(&cards[i])
		}
	}

	listCardResponses := make([]dto.ListCardResponse, 0, len(listCardLinks))
	for i := range listCardLinks {
		listCardResponses = append(listCardResponses, dto.ListCardToResponse(&listCardLinks[i]))
	}

	targetBoard, err := s.BoardRepo.GetBoard(ctx, targetBoardID, s.IncludeDeleted)
	if err != nil {
		return nil, nil, domainerr.MapRepoErr(err, true)
	}

	targetBoardLinks, err := s.LinksRepo.GetBoardListLinks(ctx, targetBoardID, s.IncludeDeleted)
	if err != nil {
		return nil, nil, domainerr.MapRepoErr(err, false)
	}

	targetBoardListIDs := make([]uuid.UUID, 0, len(targetBoardLinks))
	for i := range targetBoardLinks {
		targetBoardListIDs = append(targetBoardListIDs, targetBoardLinks[i].ID)
	}

	targetStatePayload := dto.BoardDetailResponse{
		Board: dto.BoardToResponse(targetBoard),
		Boards: map[uuid.UUID]dto.BoardResponse{
			targetBoardID: dto.BoardToResponse(targetBoard),
		},
		Lists: map[uuid.UUID]dto.ListResponse{
			listMeta.ID: dto.ListToResponse(listMeta),
		},
		BoardListRelations: []dto.BoardListResponse{
			dto.BoardListToResponse(targetBoardList),
		},
		BoardListIdsByBoardID: map[uuid.UUID][]uuid.UUID{
			targetBoardID: targetBoardListIDs,
		},
		Cards:             cardsByID,
		ListCardRelations: listCardResponses,
	}

	sourceStatePayload := dto.BoardDetailResponse{}

	targetEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventBoardListMirroredTarget,
		ActorUserID:   &userID,
		WorkspaceID:   &workspaceID,
		BoardID:       &targetBoardID,
		CorrelationID: &correlationID,
		Payload: EventRegistry.EventPayloadEnvelope{
			StatePayload: &targetStatePayload,
		},
		Targets: []EventRegistry.TargetRef{
			{EntityType: "board", EntityID: targetBoardID, BoardID: &targetBoardID},
		},
		OccurredAt: time.Now(),
	}

	sourceEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventBoardListMirroredSource,
		ActorUserID:   &userID,
		WorkspaceID:   &workspaceID,
		BoardID:       &sourceBoardID,
		CorrelationID: &correlationID,
		Payload: EventRegistry.EventPayloadEnvelope{
			StatePayload: &sourceStatePayload,
		},
		Targets: []EventRegistry.TargetRef{
			{EntityType: "board", EntityID: sourceBoardID, BoardID: &sourceBoardID},
		},
		OccurredAt: time.Now(),
	}

	if err := s.EventRegistry.Emit(ctx, s.db, targetEvent); err != nil {
		fmt.Println("failed to emit target mirror event:", err)
	}
	if err := s.EventRegistry.Emit(ctx, s.db, sourceEvent); err != nil {
		fmt.Println("failed to emit source mirror event:", err)
	}

	return listMeta, targetBoardList, nil
}

func (s *LinksService) MoveBulkListInBoard(ctx context.Context,
	userID, boardID uuid.UUID,
	listIDs []uuid.UUID,
	input MoveListInBoardInput) ([]models.BoardList, error) {

	userRoleString, err := s.MembershipRepo.GetUserRole(ctx, userID, boardID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	_, err = domainerr.ParseAndCheckRole(userRoleString, rbac.Member)
	if err != nil {
		return nil, err
	}

	boardLists, err := s.LinksRepo.GetListsInBoard(ctx, boardID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	if len(listIDs) == 0 {
		return nil, domainerr.ErrValidation
	}

	boardListSet := make(map[uuid.UUID]struct{}, len(boardLists))
	for _, bl := range boardLists {
		boardListSet[bl.ListID] = struct{}{}
	}
	listSet := make(map[uuid.UUID]struct{}, len(listIDs))
	for _, id := range listIDs {
		if _, ok := boardListSet[id]; !ok {
			return nil, domainerr.ErrNotFound
		}
		listSet[id] = struct{}{}
	}

	var positions = make([]string, 0, len(listIDs))
	generator := rank.NewRankGenerator()
	pos := ""
	if input.InsertAt != nil {
		pos = strings.TrimSpace(*input.InsertAt)
	}
	if input.AfterListID != nil {
		if _, ok := listSet[*input.AfterListID]; ok {
			return nil, domainerr.ErrValidation
		}
		idx := -1
		for i, bl := range boardLists {
			if bl.ListID == *input.AfterListID {
				idx = i
				break
			}
		}
		if idx == -1 {
			return nil, domainerr.ErrNotFound
		}
		prevPos := boardLists[idx].Pos
		nextPos := ""
		for i := idx + 1; i < len(boardLists); i++ {
			if _, moving := listSet[boardLists[i].ListID]; !moving {
				nextPos = boardLists[i].Pos
				break
			}
		}
		positions, err = generator.GenerateNRankBetween(prevPos, nextPos, len(listIDs))
		if err != nil {
			return nil, domainerr.ErrInternal
		}
	} else if pos == "start" {
		nextPos := ""
		if len(boardLists) > 0 {
			nextPos = boardLists[0].Pos
		}
		positions, err = generator.GenerateNRankBetween("", nextPos, len(listIDs))
		if err != nil {
			return nil, domainerr.ErrInternal
		}
	} else if pos == "end" {
		prevPos := ""
		if len(boardLists) > 0 {
			prevPos = boardLists[len(boardLists)-1].Pos
		}
		positions, err = generator.GenerateNRankBetween(prevPos, "", len(listIDs))
		if err != nil {
			return nil, domainerr.ErrInternal
		}
	} else {
		return nil, domainerr.ErrValidation
	}

	rows, err := s.LinksRepo.BulkPatchBoardListPosition(ctx, boardID, listIDs, positions)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	return rows, nil

}

func (s *LinksService) CreateListInBoard(ctx context.Context, userID, workspaceID, boardID uuid.UUID, req CreateListInBoardRequest, correlationID uuid.UUID) (*models.List, *models.BoardList, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, nil, err
	}

	var position string
	var err error
	if req.AfterID != nil {
		position, err = s.PositionHelper.ListPosAfterID(ctx, boardID, *req.AfterID)
		if err != nil {
			return nil, nil, err
		}
	} else if req.InsertAt != nil && *req.InsertAt == "start" {
		position, err = s.PositionHelper.ListPosAtBoardStart(ctx, boardID)
		if err != nil {
			return nil, nil, err
		}
	} else {
		position, err = s.PositionHelper.ListPosAtBoardEnd(ctx, boardID)
		if err != nil {
			return nil, nil, err
		}
	}

	newList := &models.List{
		ID:               uuid.New(),
		Title:            req.Title,
		CreatedByUserID:  userID,
		CreatedInBoardID: boardID,
	}
	newBoardList := &models.BoardList{
		ID:         uuid.New(),
		RootID:     uuid.Nil,
		ListID:     newList.ID,
		BoardID:    boardID,
		Pos:        position,
		AccessMode: rbac.BoardListEditable,
	}
	newBoardList.RootID = newBoardList.ID

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := s.ListRepo.CreateListTX(ctx, tx, newList); err != nil {
			return domainerr.MapRepoErr(err, false)
		}
		if err := s.LinksRepo.CreateBoardListTX(ctx, tx, newBoardList); err != nil {
			return domainerr.MapRepoErr(err, false)
		}
		return nil
	})
	if err != nil {
		return nil, nil, err
	}
	payload := dto.BoardDetailResponse{
		Lists: map[uuid.UUID]dto.ListResponse{
			newList.ID: dto.ListToResponse(newList),
		},
		BoardListRelations: []dto.BoardListResponse{
			dto.BoardListToResponse(newBoardList),
		},
	}

	payloadEnvelope := EventRegistry.EventPayloadEnvelope{
		StatePayload: &payload,
	}

	targets := []EventRegistry.TargetRef{
		{
			EntityType: "board",
			EntityID:   boardID,
		},
		{
			EntityType: "list",
			EntityID:   newList.ID,
		},
	}

	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventBoardListCreated,
		ActorUserID:   &userID,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		CorrelationID: &correlationID,
		Payload:       payloadEnvelope,
		Targets:       targets,
		OccurredAt:    time.Now(),
	}

	if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
		fmt.Println("failed to emit event:", err)
	}

	/*s.Hub.BroadCastToBoard(ws.Event{
		Type:    "list.created",
		BoardID: boardID,
		Payload: payload,
		TS:      time.Now(),
	})*/

	return newList, newBoardList, nil
}

func (s *LinksService) DetatchList(ctx context.Context, userID, workspaceID, boardID, listID uuid.UUID, correlationID uuid.UUID) (*models.BoardList, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}

	// Load the board_list to know if it's a root
	targetBoardList, err := s.LinksRepo.GetBoardList(ctx, boardID, listID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	isRoot := targetBoardList.RootID == targetBoardList.ID

	listcards, err := s.LinksRepo.GetListCardLinks(ctx, []uuid.UUID{targetBoardList.ListID}, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	var blIdstoDeleteMap = make(map[uuid.UUID]struct{})
	var lcIdstoDeleteMap = make(map[uuid.UUID]struct{})

	boardIdsForFanoutMap := make(map[uuid.UUID]struct{})

	if isRoot {
		boardlists, err := s.LinksRepo.GetBoardListLinksByRootID(ctx, targetBoardList.RootID, s.IncludeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
		for _, bl := range boardlists {
			blIdstoDeleteMap[bl.ID] = struct{}{}
			boardIdsForFanoutMap[bl.BoardID] = struct{}{}
		}
		var rootLcIdsMap = make(map[uuid.UUID]struct{})
		for _, lc := range listcards {
			if lc.RootID == lc.ID {
				rootLcIdsMap[lc.ID] = struct{}{}
			}
		}
		rootIds := make([]uuid.UUID, 0, len(rootLcIdsMap))
		for id := range rootLcIdsMap {
			rootIds = append(rootIds, id)
		}
		mirrorListCards, err := s.ListCardsService.GetListCardsIdsByRootIds(ctx, rootIds)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
		for _, lcId := range mirrorListCards {
			lcIdstoDeleteMap[lcId] = struct{}{}
		}
		for _, rootId := range rootIds {
			lcIdstoDeleteMap[rootId] = struct{}{}
		}
	}
	boardIdsForFanoutMap[targetBoardList.BoardID] = struct{}{}
	blIdstoDeleteMap[targetBoardList.ID] = struct{}{}
	blIdsToDelete := make([]uuid.UUID, 0, len(blIdstoDeleteMap))
	for id := range blIdstoDeleteMap {
		blIdsToDelete = append(blIdsToDelete, id)
	}
	for _, lc := range listcards {
		lcIdstoDeleteMap[lc.ID] = struct{}{}
	}
	lcIdsToDelete := make([]uuid.UUID, 0, len(lcIdstoDeleteMap))
	for id := range lcIdstoDeleteMap {
		lcIdsToDelete = append(lcIdsToDelete, id)
	}

	boardIdsForListCards, err := s.ListCardsService.ResolveBoardIdsForListCardIds(ctx, lcIdsToDelete)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	for _, bId := range boardIdsForListCards {
		boardIdsForFanoutMap[bId] = struct{}{}
	}

	boardIdsForFanout := make([]uuid.UUID, 0, len(boardIdsForFanoutMap))
	for id := range boardIdsForFanoutMap {
		boardIdsForFanout = append(boardIdsForFanout, id)
	}

	var detachedBoardLists []models.BoardList // all board_lists removed (root + mirrors)
	var detachedListCards []models.ListCard   // all list_cards removed in cascade

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {

		detachedBoardLists, err = s.LinksRepo.GetBoardListByIdsTX(ctx, tx, blIdsToDelete, s.IncludeDeleted)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}

		_, err = s.LinksRepo.BulkDetatchBoardListsByIdsTX(ctx, tx, blIdsToDelete)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}

		if len(lcIdsToDelete) > 0 {
			detachedListCards, err = s.ListCardsService.GetListCardsByIdsTX(ctx, tx, lcIdsToDelete, false)
			if err != nil {
				return domainerr.MapRepoErr(err, false)
			}
			_, err = s.ListCardsService.BulkDeleteListCardsByIDsTX(ctx, tx, lcIdsToDelete)
			if err != nil {
				return domainerr.MapRepoErr(err, false)
			}
		}

		return nil
	})
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	boardTargets := make([]EventRegistry.TargetRef, 0, len(boardIdsForFanout))
	for _, bID := range boardIdsForFanout {
		boardTargets = append(boardTargets, EventRegistry.TargetRef{EntityType: "board", EntityID: bID})
	}

	// Build board_list state payload (all detached board_lists)
	boardListResponses := make([]dto.BoardListResponse, 0, len(detachedBoardLists))
	for _, bl := range detachedBoardLists {
		boardListResponses = append(boardListResponses, dto.BoardListToResponse(&bl))
	}
	listStatePayload := dto.BoardDetailResponse{BoardListRelations: boardListResponses}

	if err := s.EventRegistry.Emit(ctx, s.db, EventRegistry.DomainEvent{
		Type:          EventRegistry.EventBoardListDetatched,
		ActorUserID:   &userID,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		CorrelationID: &correlationID,
		Targets:       boardTargets,
		Payload:       EventRegistry.EventPayloadEnvelope{StatePayload: &listStatePayload},
		OccurredAt:    time.Now(),
	}); err != nil {
		fmt.Println("DetatchList: failed to emit list event:", err)
	}

	// Emit cascade card event if any cards were detached
	if len(detachedListCards) > 0 {
		lcResponses := make([]dto.ListCardResponse, 0, len(detachedListCards))
		for _, lc := range detachedListCards {
			lcResponses = append(lcResponses, dto.ListCardToResponse(&lc))
		}
		cardStatePayload := dto.BoardDetailResponse{ListCardRelations: lcResponses}

		cardTargets := make([]EventRegistry.TargetRef, 0, len(boardIdsForFanout))
		for _, bID := range boardIdsForFanout {
			cardTargets = append(cardTargets, EventRegistry.TargetRef{EntityType: "board", EntityID: bID})
		}
		for _, lc := range detachedListCards {
			cardTargets = append(cardTargets, EventRegistry.TargetRef{EntityType: "card", EntityID: lc.CardID})
		}

		if err := s.EventRegistry.Emit(ctx, s.db, EventRegistry.DomainEvent{
			Type:          EventRegistry.EventBoardListCardsDetatched,
			ActorUserID:   &userID,
			WorkspaceID:   &workspaceID,
			BoardID:       &boardID,
			CorrelationID: &correlationID,
			Targets:       cardTargets,
			Payload:       EventRegistry.EventPayloadEnvelope{StatePayload: &cardStatePayload},
			OccurredAt:    time.Now(),
		}); err != nil {
			fmt.Println("DetatchList: failed to emit cards cascade event:", err)
		}
	}

	return targetBoardList, nil
}

func (s *LinksService) RestoreListToBoard(ctx context.Context, userID, boardID, listID uuid.UUID) (*models.BoardList, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}

	_, err := s.ListRepo.GetListMeta(ctx, listID, s.IncludeDeleted)
	if err != nil {
		fmt.Println("errore 1")
		return nil, domainerr.MapRepoErr(err, false)
	}
	/*
		if !list.DeletedAt.Valid {
			fmt.Println("errore 2")
			return nil, domainerr.ErrValidation
		}*/

	position, err := s.PositionHelper.ListPosAtBoardEnd(ctx, boardID)
	if err != nil {
		return nil, err
	}

	boardList, err := s.LinksRepo.RestoreListToBoard(ctx, boardID, listID, position)
	if err != nil {
		fmt.Println("errore 5")
		return nil, domainerr.MapRepoErr(err, false)
	}

	return boardList, nil
}

func (s *LinksService) PatchListAccessMode(ctx context.Context, userID, workspaceID, boardID, listID uuid.UUID, accessMode string, correlationID uuid.UUID) (*models.BoardList, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}
	_, err := s.ListRepo.GetListMeta(ctx, listID, s.IncludeDeleted)
	if err != nil {
		fmt.Println("errore 1")
		return nil, domainerr.MapRepoErr(err, false)
	}

	parsedMode, err := rbac.ParseBoardListAccessMode(accessMode)
	if err != nil {
		return nil, domainerr.New(domainerr.ErrValidation, "invalid access mode")
	}
	finalMode := parsedMode

	boardListUpdate := &models.BoardList{
		BoardID:    boardID,
		ListID:     listID,
		AccessMode: finalMode,
	}
	if err := s.LinksRepo.PatchBoardListAccessMode(ctx, boardListUpdate); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	statePayload := dto.BoardDetailResponse{
		BoardListRelations: []dto.BoardListResponse{dto.BoardListToResponse(boardListUpdate)},
	}

	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventBoardListPatched,
		ActorUserID:   &userID,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		CorrelationID: &correlationID,
		Payload: EventRegistry.EventPayloadEnvelope{
			StatePayload: &statePayload,
		},
		Targets: []EventRegistry.TargetRef{
			{EntityType: "board", EntityID: boardID, BoardID: &boardID},
			{EntityType: "list", EntityID: listID, BoardID: &boardID},
		},
		OccurredAt: time.Now(),
	}

	if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
		fmt.Println("failed to emit board.list.patched event:", err)
	}

	return boardListUpdate, nil
}

func (s *LinksService) GetUserBoardRelations(ctx context.Context, userID, boardID uuid.UUID) (*UserBoardDetailResponse, error) {
	roleString, err := s.MembershipRepo.GetUserRole(ctx, userID, boardID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	role, ok := rbac.ParseRole(roleString)
	if !ok {
		return nil, domainerr.ErrValidation
	}
	includeDeleted := s.IncludeDeleted && rbac.AtLeast(role, rbac.Admin)

	userBoard, err := s.LinksRepo.GetUserBoardLinks(ctx, userID, boardID, includeDeleted)
	if err != nil {
		if !includeDeleted && errors.Is(err, domainerr.ErrNotFound) {
			deletedUserBoard, deletedErr := s.LinksRepo.GetUserBoardLinks(ctx, userID, boardID, true)
			if deletedErr == nil && deletedUserBoard.DeletedAt.Valid {
				log.Printf("links: forbidden for user %s on board %s: %s", userID, boardID, userBoardSoftDeletedReason)
			}
			return nil, domainerr.ErrForbidden
		}
		return nil, domainerr.MapRepoErr(err, true)
	}

	boardLists, err := s.LinksRepo.GetBoardListLinks(ctx, boardID, includeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	listIDs := make([]uuid.UUID, 0, len(boardLists))
	for _, bl := range boardLists {
		listIDs = append(listIDs, bl.ListID)
	}

	listCards, err := s.LinksRepo.GetListCardLinks(ctx, listIDs, includeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	listCardsByListID := make(map[uuid.UUID][]dto.ListCardResponse, len(listCards))
	for _, lc := range listCards {
		listCardsByListID[lc.ListID] = append(listCardsByListID[lc.ListID], dto.ListCardToResponse(&lc))
	}

	boardListDetails := make([]BoardListDetailResponse, 0, len(boardLists))
	for _, bl := range boardLists {
		boardListDetails = append(boardListDetails, BoardListDetailResponse{
			BoardList: dto.BoardListToResponse(&bl),
			ListCards: listCardsByListID[bl.ListID],
		})
	}

	response := &UserBoardDetailResponse{
		UserBoard: dto.UserBoardResponse{
			UserID:    userBoard.UserID,
			BoardID:   userBoard.BoardID,
			Role:      userBoard.Role,
			Position:  userBoard.Pos,
			CreatedAt: userBoard.CreatedAt,
			UpdatedAt: userBoard.UpdatedAt,
			DeletedAt: dto.DeletedAtPtr(userBoard.DeletedAt),
		},
		BoardLists: boardListDetails,
	}

	return response, nil
}

func (s *LinksService) GetUserBoardDetail(ctx context.Context, userID, boardID uuid.UUID) (*dto.BoardDetailResponse, error) {
	roleString, err := s.MembershipRepo.GetUserRole(ctx, userID, boardID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	role, ok := rbac.ParseRole(roleString)
	if !ok {
		return nil, domainerr.ErrValidation
	}
	includeDeleted := s.IncludeDeleted && rbac.AtLeast(role, rbac.Admin)

	userBoard, err := s.LinksRepo.GetUserBoardLinks(ctx, userID, boardID, includeDeleted)
	if err != nil {
		if !includeDeleted && errors.Is(err, domainerr.ErrNotFound) {
			deletedUserBoard, deletedErr := s.LinksRepo.GetUserBoardLinks(ctx, userID, boardID, true)
			if deletedErr == nil && deletedUserBoard.DeletedAt.Valid {
				log.Printf("links: forbidden for user %s on board %s: %s", userID, boardID, userBoardSoftDeletedReason)
			}
			return nil, domainerr.ErrForbidden
		}
		return nil, domainerr.MapRepoErr(err, true)
	}

	board, err := s.BoardRepo.GetBoard(ctx, boardID, includeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	boardLabels, err := s.BoardLabelsRepo.GetBoardLabels(ctx, boardID, includeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	boardLabelResponses := dto.BoardLabelsToResponses(boardLabels)

	cardLabelLinks, err := s.BoardLabelsRepo.GetCardLabelLinksByBoardID(ctx, boardID, includeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	cardLabelLinkResponses := dto.CardLabelLinksToResponses(cardLabelLinks)

	boardLists, err := s.LinksRepo.GetBoardListLinks(ctx, boardID, includeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	boardListsResponses := make([]dto.BoardListResponse, 0, len(boardLists))
	for _, bl := range boardLists {
		boardListsResponses = append(boardListsResponses, dto.BoardListToResponse(&bl))
	}

	listIDs := make([]uuid.UUID, 0, len(boardLists))
	for _, bl := range boardLists {
		listIDs = append(listIDs, bl.ListID)
	}

	listCards, err := s.LinksRepo.GetListCardLinks(ctx, listIDs, includeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	listCardsResponses := make([]dto.ListCardResponse, 0, len(listCards))
	boardListCardIDs := make(map[uuid.UUID]struct{}, len(listCards))
	for _, lc := range listCards {
		boardListCardIDs[lc.ID] = struct{}{}
		listCardsResponses = append(listCardsResponses, dto.ListCardToResponse(&lc))
	}

	externalRootIDSet := make(map[uuid.UUID]struct{})
	externalRootIDs := make([]uuid.UUID, 0)
	for i := range listCardsResponses {
		row := &listCardsResponses[i]
		if row.RootID == uuid.Nil {
			row.RootID = row.ID
		}

		if _, exists := boardListCardIDs[row.RootID]; !exists {
			if _, seen := externalRootIDSet[row.RootID]; !seen {
				externalRootIDSet[row.RootID] = struct{}{}
				externalRootIDs = append(externalRootIDs, row.RootID)
			}
		}
	}

	externalRootsByID := make(map[uuid.UUID]dto.ExternalRootRefResponse)
	if len(externalRootIDs) > 0 {
		externalRows, err := s.LinksRepo.GetExternalRootRefsByIDs(ctx, externalRootIDs, includeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
		for i := range externalRows {
			row := externalRows[i]
			if _, exists := externalRootsByID[row.RootListCardID]; exists {
				continue
			}
			externalRootsByID[row.RootListCardID] = dto.ExternalRootRefResponse{
				RootListCardID: row.RootListCardID,
				CardID:         row.CardID,
				BoardID:        row.BoardID,
				WorkspaceID:    row.WorkspaceID,
				WorkspaceName:  row.WorkspaceName,
				ListID:         row.ListID,
				BoardName:      row.BoardName,
				ListTitle:      row.ListTitle,
				CardTitle:      row.CardTitle,
				UpdatedAt:      row.UpdatedAt,
			}
		}
	}

	boardsPayload := map[uuid.UUID]dto.BoardResponse{
		board.ID: dto.BoardToResponse(board),
	}

	externalBoardIDSet := make(map[uuid.UUID]struct{})
	externalBoardIDs := make([]uuid.UUID, 0, len(externalRootsByID))
	for _, externalRef := range externalRootsByID {
		if externalRef.BoardID == uuid.Nil || externalRef.BoardID == board.ID {
			continue
		}
		if _, exists := externalBoardIDSet[externalRef.BoardID]; exists {
			continue
		}
		externalBoardIDSet[externalRef.BoardID] = struct{}{}
		externalBoardIDs = append(externalBoardIDs, externalRef.BoardID)
	}

	if len(externalBoardIDs) > 0 {
		externalBoards, err := s.BoardRepo.GetBoardsByIDs(ctx, externalBoardIDs, includeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, true)
		}
		for i := range externalBoards {
			externalBoard := externalBoards[i]
			boardsPayload[externalBoard.ID] = dto.BoardToResponse(&externalBoard)
		}
	}

	lists, err := s.ListRepo.GetUserLists(ctx, userID, includeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	//listResponses := make([]dto.ListResponse, 0, len(lists))
	listsByID := make(map[uuid.UUID]dto.ListResponse, len(lists))
	for _, l := range lists {
		listsByID[l.ID] = dto.ListToResponse(&l)
	}

	cards, err := s.CardRepo.GetUserCards(ctx, userID, includeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	cardsByID := make(map[uuid.UUID]dto.CardResponse, len(cards))
	for _, c := range cards {
		cardsByID[c.ID] = dto.CardToResponse(&c)
	}

	userBoards, err := s.LinksRepo.GetUserBoardRelationsByBoardID(ctx, boardID, includeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	userBoardResponses := make([]dto.UserBoardResponse, 0, len(userBoards))
	for i := range userBoards {
		userBoardResponses = append(userBoardResponses, dto.UserBoardToResponse(&userBoards[i]))
	}

	cardMembers, err := s.LinksRepo.GetCardMembersForBoard(ctx, boardID, includeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	cardMemberResponses := toDTOCardMemberResponses(cardMembers)

	cardChecklists, err := s.LinksRepo.GetCardChecklistsForBoard(ctx, boardID, includeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	cardChecklistResponses := dto.CardChecklistsToResponses(cardChecklists)

	checklistIDSet := make(map[uuid.UUID]struct{}, len(cardChecklists))
	checklistIDs := make([]uuid.UUID, 0, len(cardChecklists))
	for i := range cardChecklists {
		if _, ok := checklistIDSet[cardChecklists[i].ChecklistID]; ok {
			continue
		}
		checklistIDSet[cardChecklists[i].ChecklistID] = struct{}{}
		checklistIDs = append(checklistIDs, cardChecklists[i].ChecklistID)
	}

	checklists, err := s.LinksRepo.GetChecklistsByIDs(ctx, checklistIDs, includeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	checklistsByID := make(map[uuid.UUID]dto.ChecklistResponse, len(checklists))
	for i := range checklists {
		checklistsByID[checklists[i].ID] = dto.ChecklistToResponse(&checklists[i])
	}

	checklistEntries, err := s.LinksRepo.GetChecklistEntriesByChecklistIDs(ctx, checklistIDs, includeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	checklistEntryResponses := dto.ChecklistEntriesToResponses(checklistEntries)

	entryIDSet := make(map[uuid.UUID]struct{}, len(checklistEntries))
	entryIDs := make([]uuid.UUID, 0, len(checklistEntries))
	for i := range checklistEntries {
		if _, ok := entryIDSet[checklistEntries[i].EntryID]; ok {
			continue
		}
		entryIDSet[checklistEntries[i].EntryID] = struct{}{}
		entryIDs = append(entryIDs, checklistEntries[i].EntryID)
	}

	entries, err := s.LinksRepo.GetEntriesByIDs(ctx, entryIDs, includeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	entriesByID := make(map[uuid.UUID]dto.EntryResponse, len(entries))
	for i := range entries {
		entriesByID[entries[i].ID] = dto.EntryToResponse(&entries[i])
	}

	entryMembers, err := s.LinksRepo.GetEntryMembersByEntryIDs(ctx, entryIDs, includeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	entryMemberResponses := dto.EntryMembersToResponses(entryMembers)

	userIDSet := make(map[uuid.UUID]struct{}, len(userBoards)+len(cardMembers)+len(entryMembers)+len(checklists)+len(entries))
	userIDs := make([]uuid.UUID, 0, len(userBoards)+len(cardMembers)+len(entryMembers)+len(checklists)+len(entries))
	for i := range userBoards {
		if _, ok := userIDSet[userBoards[i].UserID]; ok {
			continue
		}
		userIDSet[userBoards[i].UserID] = struct{}{}
		userIDs = append(userIDs, userBoards[i].UserID)
	}
	for i := range cardMembers {
		if _, ok := userIDSet[cardMembers[i].UserID]; ok {
			continue
		}
		userIDSet[cardMembers[i].UserID] = struct{}{}
		userIDs = append(userIDs, cardMembers[i].UserID)
	}
	for i := range checklists {
		if _, ok := userIDSet[checklists[i].CreatedByUserID]; ok {
			continue
		}
		userIDSet[checklists[i].CreatedByUserID] = struct{}{}
		userIDs = append(userIDs, checklists[i].CreatedByUserID)
	}
	for i := range entries {
		if _, ok := userIDSet[entries[i].CreatedByUserID]; ok {
			continue
		}
		userIDSet[entries[i].CreatedByUserID] = struct{}{}
		userIDs = append(userIDs, entries[i].CreatedByUserID)
	}
	for i := range entryMembers {
		if _, ok := userIDSet[entryMembers[i].UserID]; ok {
			continue
		}
		userIDSet[entryMembers[i].UserID] = struct{}{}
		userIDs = append(userIDs, entryMembers[i].UserID)
	}

	usersByID := make(map[uuid.UUID]dto.UserResponse, len(userIDs))
	if len(userIDs) > 0 {
		users, err := s.MembershipRepo.GetUsersByIDs(ctx, userIDs)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
		for i := range users {
			usersByID[users[i].ID] = dto.UserToResponse(&users[i])
		}
	}

	response := &dto.BoardDetailResponse{
		VisibilityRole:          roleString,
		Board:                   dto.BoardToResponse(board),
		Boards:                  boardsPayload,
		UserBoardRelation:       dto.UserBoardToResponse(userBoard),
		Lists:                   listsByID,
		Cards:                   cardsByID,
		Checklists:              checklistsByID,
		Entries:                 entriesByID,
		Users:                   usersByID,
		BoardListRelations:      boardListsResponses,
		ListCardRelations:       listCardsResponses,
		CardChecklistRelations:  cardChecklistResponses,
		ChecklistEntryRelations: checklistEntryResponses,
		BoardLabels:             boardLabelResponses,
		CardLabelLinks:          cardLabelLinkResponses,
		CardMembers:             cardMemberResponses,
		EntryMembers:            entryMemberResponses,
		UserBoardRelations:      userBoardResponses,
		ExternalRootsByID:       externalRootsByID,
	}
	//fmt.Println("constructed board detail response:", response)
	return response, nil
}

func toDTOCardMemberResponses(members []models.CardMember) []dto.CardMemberResponse {
	responses := make([]dto.CardMemberResponse, 0, len(members))
	for i := range members {
		responses = append(responses, dto.CardMemberResponse{
			ID:              members[i].ID,
			CardID:          members[i].CardID,
			UserID:          members[i].UserID,
			CreatedByUserID: members[i].CreatedByUserID,
			CreatedAt:       members[i].CreatedAt,
			UpdatedAt:       members[i].UpdatedAt,
			DeletedAt:       dto.DeletedAtPtr(members[i].DeletedAt),
		})
	}
	return responses
}

func (s *LinksService) GetListsByBoardID(ctx context.Context, userID, boardID, workspaceID uuid.UUID) (*dto.BoardDetailResponse, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Viewer, s.IncludeDeleted); err != nil {
		return nil, err
	}
	boardLists, err := s.LinksRepo.GetBoardListLinks(ctx, boardID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	listIDs := make([]uuid.UUID, 0, len(boardLists))
	for _, bl := range boardLists {
		listIDs = append(listIDs, bl.ListID)
	}

	lists, err := s.ListRepo.GetListsByListIds(ctx, listIDs, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	listsByID := make(map[uuid.UUID]dto.ListResponse, len(lists))
	for _, l := range lists {
		listsByID[l.ID] = dto.ListToResponse(&l)
	}

	boardlistResponses := make([]dto.BoardListResponse, 0, len(boardLists))
	for _, bl := range boardLists {
		boardlistResponses = append(boardlistResponses, dto.BoardListToResponse(&bl))
	}
	response := dto.BoardDetailResponse{
		Lists:              listsByID,
		BoardListRelations: boardlistResponses,
	}
	return &response, nil
}

func (s *LinksService) GetBoardListMirrors(ctx context.Context, userID, boardID, boardListID uuid.UUID) (*BoardListMirrorsResponse, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Viewer, s.IncludeDeleted); err != nil {
		return nil, err
	}

	current, err := s.LinksRepo.GetBoardListByID(ctx, boardID, boardListID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	rootID := current.RootID
	if rootID == uuid.Nil {
		rootID = current.ID
	}

	instances, err := s.LinksRepo.GetBoardListLinksByRootID(ctx, rootID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	boardIDSet := make(map[uuid.UUID]struct{})
	boardIDs := make([]uuid.UUID, 0, len(instances))
	for i := range instances {
		id := instances[i].BoardID
		if id == uuid.Nil {
			continue
		}
		if _, exists := boardIDSet[id]; exists {
			continue
		}
		boardIDSet[id] = struct{}{}
		boardIDs = append(boardIDs, id)
	}

	boardsRows, err := s.BoardRepo.GetBoardsByIDs(ctx, boardIDs, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	boardsByID := make(map[uuid.UUID]models.Board, len(boardsRows))
	for i := range boardsRows {
		boardsByID[boardsRows[i].ID] = boardsRows[i]
	}

	items := make([]BoardListMirrorItem, 0, len(instances))
	for i := range instances {
		instance := instances[i]
		role, roleErr := s.MembershipRepo.GetUserRole(ctx, userID, instance.BoardID, s.IncludeDeleted)
		if roleErr != nil {
			continue
		}
		if _, roleErr = domainerr.ParseAndCheckRole(role, rbac.Viewer); roleErr != nil {
			continue
		}

		boardRow, ok := boardsByID[instance.BoardID]
		if !ok {
			continue
		}
		items = append(items, BoardListMirrorItem{
			Board:     dto.BoardToResponse(&boardRow),
			BoardList: dto.BoardListToResponse(&instance),
			IsRoot:    instance.ID == rootID,
		})
	}

	return &BoardListMirrorsResponse{
		RootBoardListID:    rootID,
		CurrentBoardListID: current.ID,
		Items:              items,
	}, nil
}

func (s *LinksService) GetDeletedBoardRelations(ctx context.Context, userID, boardID uuid.UUID) (*DeletedBoardRelationsResponse, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}

	boardLists, err := s.LinksRepo.GetDeletedBoardListLinks(ctx, boardID)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	listCards, err := s.LinksRepo.GetDeletedListCardLinksByBoardID(ctx, boardID)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	boardListRelations := make([]dto.BoardListResponse, 0, len(boardLists))
	for i := range boardLists {
		boardListRelations = append(boardListRelations, dto.BoardListToResponse(&boardLists[i]))
	}
	listCardRelations := make([]dto.ListCardResponse, 0, len(listCards))
	for i := range listCards {
		listCardRelations = append(listCardRelations, dto.ListCardToResponse(&listCards[i]))
	}

	listIDs := make([]uuid.UUID, 0, len(boardLists))
	listIDSeen := map[uuid.UUID]struct{}{}
	for i := range boardLists {
		if _, ok := listIDSeen[boardLists[i].ListID]; ok {
			continue
		}
		listIDSeen[boardLists[i].ListID] = struct{}{}
		listIDs = append(listIDs, boardLists[i].ListID)
	}

	listsByID := map[uuid.UUID]dto.ListResponse{}
	if len(listIDs) > 0 {
		lists, err := s.ListRepo.GetListsByListIds(ctx, listIDs, true)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
		for i := range lists {
			listsByID[lists[i].ID] = dto.ListToResponse(&lists[i])
		}
	}

	cardIDs := make([]uuid.UUID, 0, len(listCards))
	cardIDSeen := map[uuid.UUID]struct{}{}
	for i := range listCards {
		if _, ok := cardIDSeen[listCards[i].CardID]; ok {
			continue
		}
		cardIDSeen[listCards[i].CardID] = struct{}{}
		cardIDs = append(cardIDs, listCards[i].CardID)
	}

	cardsByID := map[uuid.UUID]dto.CardResponse{}
	if len(cardIDs) > 0 {
		cards, err := s.CardRepo.GetCardsByIDs(ctx, cardIDs, true)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
		for i := range cards {
			cardsByID[cards[i].ID] = dto.CardToResponse(&cards[i])
		}
	}

	return &DeletedBoardRelationsResponse{
		Lists:              listsByID,
		Cards:              cardsByID,
		BoardListRelations: boardListRelations,
		ListCardRelations:  listCardRelations,
	}, nil
}

func (s *LinksService) RestoreBoardListsByIDs(ctx context.Context, userID, workspaceID, boardID uuid.UUID, boardListIDs []uuid.UUID, correlationID uuid.UUID) ([]models.BoardList, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}
	if len(boardListIDs) == 0 {
		return nil, domainerr.ErrValidation
	}

	var restored []models.BoardList
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		rows, txErr := s.LinksRepo.RestoreBoardListLinksByIDsTX(ctx, tx, boardID, boardListIDs)
		if txErr != nil {
			return txErr
		}
		restored = rows
		return nil
	})
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	if len(restored) > 0 && s.EventRegistry != nil {
		for i := range restored {
			relation := dto.BoardListToResponse(&restored[i])
			statePayload := dto.BoardDetailResponse{
				BoardListRelations: []dto.BoardListResponse{relation},
			}
			evt := EventRegistry.DomainEvent{
				Type:          EventRegistry.EventBoardListRestored,
				ActorUserID:   &userID,
				WorkspaceID:   &workspaceID,
				BoardID:       &boardID,
				CorrelationID: &correlationID,
				Payload: EventRegistry.EventPayloadEnvelope{
					StatePayload: &statePayload,
				},
				Targets: []EventRegistry.TargetRef{
					{EntityType: "board", EntityID: boardID, BoardID: &boardID},
					{EntityType: "list", EntityID: restored[i].ListID, BoardID: &boardID},
				},
				OccurredAt: time.Now(),
			}
			if emitErr := s.EventRegistry.Emit(ctx, s.db, evt); emitErr != nil {
				fmt.Println("failed to emit board.list.restored event:", emitErr)
			}
		}
	}

	return restored, nil
}

func (s *LinksService) RestoreListCardsByIDs(ctx context.Context, userID, workspaceID, boardID uuid.UUID, listCardIDs []uuid.UUID, correlationID uuid.UUID) ([]models.ListCard, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}
	if len(listCardIDs) == 0 {
		return nil, domainerr.ErrValidation
	}

	activeBoardLists, err := s.LinksRepo.GetBoardListLinks(ctx, boardID, false)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	activeListSet := make(map[uuid.UUID]struct{}, len(activeBoardLists))
	activeListIDs := make([]uuid.UUID, 0, len(activeBoardLists))
	for i := range activeBoardLists {
		activeListSet[activeBoardLists[i].ListID] = struct{}{}
		activeListIDs = append(activeListIDs, activeBoardLists[i].ListID)
	}

	var restoredCardsListID *uuid.UUID
	if len(activeListIDs) > 0 {
		lists, listErr := s.ListRepo.GetListsByListIds(ctx, activeListIDs, false)
		if listErr != nil {
			return nil, domainerr.MapRepoErr(listErr, false)
		}
		for i := range lists {
			if strings.EqualFold(strings.TrimSpace(lists[i].Title), "Restored cards") {
				id := lists[i].ID
				restoredCardsListID = &id
				break
			}
		}
	}

	var restored []models.ListCard
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		deletedCards, txErr := s.LinksRepo.GetDeletedListCardLinksByIDsAndBoardIDTX(ctx, tx, boardID, listCardIDs)
		if txErr != nil {
			return txErr
		}

		needsFallback := false
		for i := range deletedCards {
			if _, ok := activeListSet[deletedCards[i].ListID]; !ok {
				needsFallback = true
				break
			}
		}

		if needsFallback && restoredCardsListID == nil {
			position, posErr := s.PositionHelper.ListPosAtBoardEnd(ctx, boardID)
			if posErr != nil {
				return posErr
			}

			newList := &models.List{
				ID:               uuid.New(),
				Title:            "Restored cards",
				CreatedByUserID:  userID,
				CreatedInBoardID: boardID,
			}
			if createErr := s.ListRepo.CreateListTX(ctx, tx, newList); createErr != nil {
				return createErr
			}

			newBoardList := &models.BoardList{
				ID:      uuid.New(),
				RootID:  uuid.Nil,
				BoardID: boardID,
				ListID:  newList.ID,
				Pos:     position,
			}
			newBoardList.RootID = newBoardList.ID
			if createErr := s.LinksRepo.CreateBoardListTX(ctx, tx, newBoardList); createErr != nil {
				return createErr
			}

			activeListSet[newList.ID] = struct{}{}
			id := newList.ID
			restoredCardsListID = &id
		}

		toRestore := make([]models.ListCard, 0, len(deletedCards))
		for i := range deletedCards {
			candidate := deletedCards[i]
			if _, ok := activeListSet[candidate.ListID]; !ok {
				if restoredCardsListID == nil {
					return domainerr.ErrInternal
				}
				candidate.ListID = *restoredCardsListID
			}
			toRestore = append(toRestore, candidate)
		}

		rows, txErr := s.LinksRepo.RestoreListCardLinksTX(ctx, tx, toRestore)
		if txErr != nil {
			return txErr
		}
		restored = rows
		return nil
	})
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	fmt.Println("restored list cards:", restored)

	if len(restored) > 0 && s.EventRegistry != nil {
		for i := range restored {
			relation := dto.ListCardToResponse(&restored[i])
			statePayload := dto.BoardDetailResponse{
				ListCardRelations: []dto.ListCardResponse{relation},
			}
			evt := EventRegistry.DomainEvent{
				Type:          EventRegistry.EventBoardListCardRestored,
				ActorUserID:   &userID,
				WorkspaceID:   &workspaceID,
				BoardID:       &boardID,
				CorrelationID: &correlationID,
				Payload: EventRegistry.EventPayloadEnvelope{
					StatePayload: &statePayload,
				},
				Targets: []EventRegistry.TargetRef{
					{EntityType: "card", EntityID: restored[i].CardID, BoardID: &boardID},
					{EntityType: "list", EntityID: restored[i].ListID, BoardID: &boardID},
				},
				OccurredAt: time.Now(),
			}
			if emitErr := s.EventRegistry.Emit(ctx, s.db, evt); emitErr != nil {
				fmt.Println("failed to emit board.listcard.restored event:", emitErr)
			}
		}
	}

	return restored, nil
}

func (s *LinksService) PurgeBoardListsByIDs(ctx context.Context, userID, workspaceID, boardID uuid.UUID, boardListIDs []uuid.UUID, correlationID uuid.UUID) ([]models.BoardList, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}
	if len(boardListIDs) == 0 {
		return nil, domainerr.ErrValidation
	}

	var purged []models.BoardList
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		rows, txErr := s.LinksRepo.PurgeBoardListLinksByIDsTX(ctx, tx, boardID, boardListIDs)
		if txErr != nil {
			return txErr
		}
		purged = rows
		return nil
	})
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	if len(purged) > 0 && s.EventRegistry != nil {
		for i := range purged {
			relation := dto.BoardListToResponse(&purged[i])
			statePayload := dto.BoardDetailResponse{
				BoardListRelations: []dto.BoardListResponse{relation},
			}
			evt := EventRegistry.DomainEvent{
				Type:          EventRegistry.EventBoardListPurged,
				ActorUserID:   &userID,
				WorkspaceID:   &workspaceID,
				BoardID:       &boardID,
				CorrelationID: &correlationID,
				Payload: EventRegistry.EventPayloadEnvelope{
					StatePayload: &statePayload,
				},
				Targets: []EventRegistry.TargetRef{
					{EntityType: "board", EntityID: boardID, BoardID: &boardID},
					{EntityType: "list", EntityID: purged[i].ListID, BoardID: &boardID},
				},
				OccurredAt: time.Now(),
			}
			if emitErr := s.EventRegistry.Emit(ctx, s.db, evt); emitErr != nil {
				fmt.Println("failed to emit board.list.purged event:", emitErr)
			}
		}
	}

	return purged, nil
}

func (s *LinksService) PurgeListCardsByIDs(ctx context.Context, userID, workspaceID, boardID uuid.UUID, listCardIDs []uuid.UUID, correlationID uuid.UUID) ([]models.ListCard, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}
	if len(listCardIDs) == 0 {
		return nil, domainerr.ErrValidation
	}

	var purged []models.ListCard
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		candidates, txErr := s.LinksRepo.GetDeletedListCardLinksByIDsAndBoardIDTX(ctx, tx, boardID, listCardIDs)
		if txErr != nil {
			return txErr
		}

		ids := make([]uuid.UUID, 0, len(candidates))
		rootIDs := make([]uuid.UUID, 0)
		for i := range candidates {
			ids = append(ids, candidates[i].ID)
			if candidates[i].ID == candidates[i].RootID {
				rootIDs = append(rootIDs, candidates[i].RootID)
			}
		}

		if len(rootIDs) > 0 {
			cascadeRows, cascadeErr := s.LinksRepo.GetDeletedListCardLinksByRootIDsTX(ctx, tx, rootIDs)
			if cascadeErr != nil {
				return cascadeErr
			}
			seen := make(map[uuid.UUID]struct{}, len(ids)+len(cascadeRows))
			for _, id := range ids {
				seen[id] = struct{}{}
			}
			for i := range cascadeRows {
				if _, ok := seen[cascadeRows[i].ID]; ok {
					continue
				}
				seen[cascadeRows[i].ID] = struct{}{}
				ids = append(ids, cascadeRows[i].ID)
			}
		}

		rows, txErr := s.LinksRepo.PurgeListCardLinksByIDsTX(ctx, tx, ids)
		if txErr != nil {
			return txErr
		}
		purged = rows
		return nil
	})
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	if len(purged) > 0 && s.EventRegistry != nil {
		listCardRelations := make([]dto.ListCardResponse, 0, len(purged))
		targets := make([]EventRegistry.TargetRef, 0, len(purged)*2)
		for i := range purged {
			listCardRelations = append(listCardRelations, dto.ListCardToResponse(&purged[i]))
			targets = append(targets,
				EventRegistry.TargetRef{EntityType: "card", EntityID: purged[i].CardID, BoardID: &boardID},
				EventRegistry.TargetRef{EntityType: "list", EntityID: purged[i].ListID, BoardID: &boardID},
			)
		}

		statePayload := dto.BoardDetailResponse{
			ListCardRelations: listCardRelations,
		}
		evt := EventRegistry.DomainEvent{
			Type:          EventRegistry.EventBoardListCardPurged,
			ActorUserID:   &userID,
			WorkspaceID:   &workspaceID,
			BoardID:       &boardID,
			CorrelationID: &correlationID,
			Payload: EventRegistry.EventPayloadEnvelope{
				StatePayload: &statePayload,
			},
			Targets:    targets,
			OccurredAt: time.Now(),
		}
		if emitErr := s.EventRegistry.Emit(ctx, s.db, evt); emitErr != nil {
			fmt.Println("failed to emit board.listcard.purged event:", emitErr)
		}
	}

	return purged, nil
}
