package listcards

import (
	"GoGORM/internal/actions"
	"GoGORM/internal/authz"
	"GoGORM/internal/authzdto"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/internal/guard"
	"GoGORM/internal/rank"
	"GoGORM/internal/rbac"
	"GoGORM/internal/ws"
	"GoGORM/models"
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ListCardsService struct {
	db               *gorm.DB
	authz            *authz.Service
	Hub              *ws.Hub
	EventRegistry    *EventRegistry.EventRegistryService
	ListCardsRepo    ListCardsRepo
	BoardListRepo    BoardListRepo
	CardsRepo        CardsRepo
	CardCommentsRepo CardCommentsRepo
	CardMembersRepo  CardMembersRepo
	BoardLabelsRepo  BoardLabelsRepo
	ChecklistRepo    ChecklistRepo
	ListRepo         ListRepo
	PositionHelper   PositionHelper
	MembershipRepo   MembershipRepo
	CapabilitiesRepo CapabilitiesRepo
	BoardsRepo       BoardRepo
	IncludeDeleted   bool
}

func isNotFoundError(err error) bool {
	return errors.Is(err, gorm.ErrRecordNotFound) || errors.Is(err, domainerr.ErrNotFound)
}

func (s *ListCardsService) resolveUserBoardResponse(ctx context.Context, userID, boardID uuid.UUID) (*dto.UserBoardResponse, *bool, *bool, error) {
	userBoard, err := s.BoardsRepo.GetUserBoardTX(ctx, s.db, userID, boardID, s.IncludeDeleted)
	if err != nil {
		if !isNotFoundError(err) {
			return nil, nil, nil, domainerr.MapRepoErr(err, true)
		}

		userBoard, err = s.BoardsRepo.GetUserBoardTX(ctx, s.db, userID, boardID, true)
		if err != nil {
			if isNotFoundError(err) {
				isUserBoardPurged := true
				return nil, &isUserBoardPurged, nil, nil
			}
			return nil, nil, nil, domainerr.MapRepoErr(err, true)
		}

		if userBoard.DeletedAt.Valid {
			isUserBoardSoftDeleted := true
			return nil, nil, &isUserBoardSoftDeleted, nil
		}

		isUserBoardPurged := true
		return nil, &isUserBoardPurged, nil, nil
	}

	mapped := dto.UserBoardToResponse(userBoard)
	return &mapped, nil, nil, nil
}

func NewListCardsService(db *gorm.DB, authzService *authz.Service, hub *ws.Hub, eventRegistry *EventRegistry.EventRegistryService, listCardsRepo ListCardsRepo, cardsRepo CardsRepo, cardCommentsRepo CardCommentsRepo, cardMembersRepo CardMembersRepo, boardLabelsRepo BoardLabelsRepo, checklistRepo ChecklistRepo, listRepo ListRepo, boardListRepo BoardListRepo, positionHelper PositionHelper, membershipRepo MembershipRepo, capabilitiesRepo CapabilitiesRepo, boardsRepo BoardRepo) *ListCardsService {
	return &ListCardsService{db: db, authz: authzService, Hub: hub, EventRegistry: eventRegistry, ListCardsRepo: listCardsRepo, CardsRepo: cardsRepo, CardCommentsRepo: cardCommentsRepo, CardMembersRepo: cardMembersRepo, BoardLabelsRepo: boardLabelsRepo, ChecklistRepo: checklistRepo, ListRepo: listRepo, BoardListRepo: boardListRepo, PositionHelper: positionHelper, MembershipRepo: membershipRepo, CapabilitiesRepo: capabilitiesRepo, BoardsRepo: boardsRepo, IncludeDeleted: false}
}

func (s *ListCardsService) HydrateListCardResponseMirrors(ctx context.Context, relations []dto.ListCardResponse) ([]dto.ListCardResponse, error) {
	_ = ctx
	if len(relations) == 0 {
		return relations, nil
	}

	next := make([]dto.ListCardResponse, len(relations))
	copy(next, relations)

	for i := range next {
		rel := &next[i]
		if rel.RootID == uuid.Nil {
			rel.RootID = rel.ID
		}
	}

	return next, nil
}

func (s *ListCardsService) CreateCardInList(ctx context.Context, userID, workspaceID, boardID, listID uuid.UUID,
	request CreateCardRequest, correlationID uuid.UUID) (*models.Card, *models.ListCard, error) {

	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, nil, err
	}

	//Calculate position
	var position string
	var err error
	if request.AfterID != nil {
		//fmt.Println("AfterID is:", *request.AfterID)
		position, err = s.PositionHelper.CardPosAfterID(ctx, listID, *request.AfterID)
		//fmt.Println("Calculated position is:", position)
		if err != nil {
			return nil, nil, err
		}
	} else if request.InsertAt != nil && *request.InsertAt == "start" {
		position, err = s.PositionHelper.CardPosAtListStart(ctx, listID)
		if err != nil {
			return nil, nil, err
		}
	} else {
		position, err = s.PositionHelper.CardPosAtListEnd(ctx, listID)
		if err != nil {
			return nil, nil, err
		}
	}

	newCard := &models.Card{
		ID:              uuid.New(),
		Title:           request.Title,
		Done:            false,
		CreatedByUserID: userID,
		CreatedInListID: listID,
	}
	newListCard := &models.ListCard{
		ID:     uuid.New(),
		CardID: newCard.ID,
		ListID: listID,
		Pos:    position,
	}
	newListCard.RootID = newListCard.ID

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := s.CardsRepo.CreateCard(ctx, tx, newCard); err != nil {
			return domainerr.MapRepoErr(err, false)
		}
		if err := s.ListCardsRepo.CreateCardListTX(ctx, tx, newListCard); err != nil {
			return domainerr.MapRepoErr(err, false)
		}
		return nil
	})

	if err != nil {
		return nil, nil, err
	}

	//Broadcast to websocket clients
	payload := dto.BoardDetailResponse{
		Board: dto.BoardResponse{
			ID: boardID,
		},
		Cards: map[uuid.UUID]dto.CardResponse{
			newCard.ID: dto.CardToResponse(newCard),
		},
		ListCardRelations: []dto.ListCardResponse{
			dto.ListCardToResponse(newListCard),
		},
	}
	eventTargets := []EventRegistry.TargetRef{
		{
			EntityType: "list",
			EntityID:   listID,
			BoardID:    &boardID,
		},
		{
			EntityType: "card",
			EntityID:   newCard.ID,
			BoardID:    &boardID,
		},
		/*{
			EntityType: "board",
			EntityID:   boardID,
			BoardID:    &boardID,
		},*/
	}

	workspaceIDRef := &workspaceID

	event := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventCardCreated,
		WorkspaceID:   workspaceIDRef,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload: EventRegistry.EventPayloadEnvelope{
			StatePayload: &payload,
		},
		Targets:    eventTargets,
		OccurredAt: time.Now(),
	}

	if err := s.EventRegistry.Emit(ctx, s.db, event); err != nil {
		return nil, nil, err
	}

	/*s.Hub.BroadCastToBoard(ws.Event{
		Type:    "card.added",
		BoardID: boardID,
		Payload: payload,
		TS:      time.Now(),
	})*/
	return newCard, newListCard, nil
}

func (s *ListCardsService) GetListDetail(ctx context.Context, userID, boardID, listID uuid.UUID) (*models.List, []ListCardDetail, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, nil, err
	}
	list, err := s.ListRepo.GetListMeta(ctx, listID, s.IncludeDeleted)
	if err != nil {
		return nil, nil, domainerr.MapRepoErr(err, true)
	}
	listCards, err := s.ListCardsRepo.GetListCardsDetail(ctx, listID, s.IncludeDeleted)
	if err != nil {
		return nil, nil, domainerr.MapRepoErr(err, true)
	}
	return list, listCards, nil
}

func (s *ListCardsService) GetListDetailPatch(ctx context.Context, userID, boardID, listID uuid.UUID) (*ListDetailPatchResponse, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Viewer, s.IncludeDeleted); err != nil {
		return nil, err
	}

	if _, err := s.BoardListRepo.GetBoardList(ctx, boardID, listID, s.IncludeDeleted); err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	listCards, err := s.ListCardsRepo.GetListCardsDetail(ctx, listID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	cards := make(map[uuid.UUID]dto.CardResponse, len(listCards))
	listCardRelations := make([]dto.ListCardResponse, 0, len(listCards))

	for _, row := range listCards {
		card := models.Card{
			ID:              row.ID,
			Title:           row.Title,
			Done:            row.Done,
			Description:     row.Description,
			StartDate:       row.StartDate,
			EndDate:         row.EndDate,
			Props:           row.Props,
			CreatedByUserID: row.CreatedByUserID,
			CreatedInListID: row.CreatedInListID,
			TimeStamps: models.TimeStamps{
				CreatedAt: row.CreatedAt,
				UpdatedAt: row.UpdatedAt,
				DeletedAt: row.DeletedAt,
			},
		}
		cards[row.ID] = dto.CardToResponse(&card)

		listCard := models.ListCard{
			ID:     row.ListCardID,
			CardID: row.ID,
			ListID: row.ListID,
			RootID: row.RootID,
			Pos:    row.Pos,
			TimeStamps: models.TimeStamps{
				CreatedAt: row.ListCreatedAt,
				UpdatedAt: row.ListUpdatedAt,
				DeletedAt: row.ListDeletedAt,
			},
		}
		listCardRelations = append(listCardRelations, dto.ListCardToResponse(&listCard))
	}

	for i := range listCardRelations {
		rel := &listCardRelations[i]
		if rel.RootID == uuid.Nil {
			rel.RootID = rel.ID
		}
	}

	return &ListDetailPatchResponse{
		Cards:             cards,
		ListCardRelations: listCardRelations,
	}, nil
}

func (s *ListCardsService) CrossMoveCard(ctx context.Context,
	userID, boardID, cardID uuid.UUID,
	req CrossMoveCardRequest,
	correlationID uuid.UUID) (*models.ListCard, *models.ListCard, *dto.MoveCardEventPayload, error) {

	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		fmt.Println("errore 1")
		return nil, nil, nil, err
	}

	allowedRoles := rbac.AllowedAtLeast(rbac.Member)
	if ok, err := s.CapabilitiesRepo.CanEditCardInBoard(ctx, s.db,
		userID, boardID, cardID, allowedRoles, s.IncludeDeleted); err != nil {
		fmt.Println("errore 2")
		return nil, nil, nil, domainerr.MapRepoErr(err, false)
	} else if !*ok {
		fmt.Println("errore 3")
		return nil, nil, nil, domainerr.ErrForbidden
	}

	targetBoardList, err := s.BoardListRepo.GetBoardList(ctx, boardID, req.TargetListID, s.IncludeDeleted)
	if err != nil {
		fmt.Println("errore 4")
		return nil, nil, nil, domainerr.MapRepoErr(err, false)
	}
	if targetBoardList.AccessMode != rbac.BoardListEditable {
		fmt.Println("errore 5")
		return nil, nil, nil, domainerr.ErrForbidden
	}

	var position string
	//var err error
	if req.AfterID != nil {
		position, err = s.PositionHelper.CardPosAfterID(ctx, req.TargetListID, *req.AfterID)
		if err != nil {
			return nil, nil, nil, err
		}
	} else if req.BeforeID != nil {
		position, err = s.PositionHelper.CardPosBeforeID(ctx, req.TargetListID, *req.BeforeID)
		if err != nil {
			fmt.Println("errore 6")
			return nil, nil, nil, err
		}
	} else if req.InsertAt != nil && *req.InsertAt == "start" {
		position, err = s.PositionHelper.CardPosAtListStart(ctx, req.TargetListID)
		if err != nil {
			return nil, nil, nil, err
		}
	} else {
		position, err = s.PositionHelper.CardPosAtListEnd(ctx, req.TargetListID)
		if err != nil {
			return nil, nil, nil, err
		}
	}

	var targetListCard *models.ListCard
	var sourceListCard *models.ListCard
	var fromListCards []models.ListCard
	var toListCards []models.ListCard
	var fromListCardsResponse []dto.ListCardResponse
	var toListCardsResponse []dto.ListCardResponse
	var movePayload *dto.MoveCardEventPayload

	if req.DetatchFromList != nil && *req.DetatchFromList == true {
		if req.FromListID == nil {
			fmt.Println("errore 7")
			return nil, nil, nil, domainerr.ErrValidation
		}
		err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			//fmt.Println("TRANSACTION-CROSSMOVE-START")
			existingSourceListCard, err := s.ListCardsRepo.GetListCardByListAndCardTX(ctx, tx, *req.FromListID, cardID, s.IncludeDeleted)
			if err != nil {
				return domainerr.MapRepoErr(err, true)
			}
			sourceListCard = existingSourceListCard
			/*if err := s.ListCardsRepo.DeleteCardListTX(ctx, tx, sourceListCard); err != nil {
				return domainerr.MapRepoErr(err, false)
			}
			targetListCard = &models.ListCard{
				ID:     uuid.New(),
				CardID: cardID,
				ListID: req.TargetListID,
				Pos:    position,
			}
			if err := s.ListCardsRepo.CreateCardListTX(ctx, tx, targetListCard); err != nil {
				return domainerr.MapRepoErr(err, false)
			}*/
			targetListCard = &models.ListCard{
				ID:     req.ListCardID,
				CardID: cardID,
				ListID: req.TargetListID,
				RootID: sourceListCard.RootID,
				Pos:    position,
			}
			if err := s.ListCardsRepo.UpsertListCardByIdTX(ctx, tx, targetListCard); err != nil {
				return domainerr.MapRepoErr(err, false)
			}

			listIDs := []uuid.UUID{*req.FromListID, req.TargetListID}
			listcards, err := s.ListCardsRepo.GetListCardByListIDsTX(ctx, tx, listIDs)
			if err != nil {
				return domainerr.MapRepoErr(err, false)
			}

			for _, listcard := range listcards {
				listCardResponse := dto.ListCardToResponse(&listcard)
				if listcard.ListID == *req.FromListID {
					fromListCards = append(fromListCards, listcard)
					fromListCardsResponse = append(fromListCardsResponse, listCardResponse)
				} else if listcard.ListID == req.TargetListID {
					toListCards = append(toListCards, listcard)
					toListCardsResponse = append(toListCardsResponse, listCardResponse)
				} else {
					return domainerr.ErrInternal
				}
			}
			return nil

		})
		if err != nil {
			return nil, nil, nil, err
		}

		movePayload = &dto.MoveCardEventPayload{
			ListCardPatch: dto.ListCardToResponse(targetListCard),
			FromListCards: fromListCardsResponse,
			ToListCards:   toListCardsResponse,
			Cards:         map[uuid.UUID]dto.CardResponse{},
			FromListID:    (*req.FromListID).String(),
			ToListID:      req.TargetListID.String(),
		}

		hydratedFrom, err := s.HydrateListCardResponseMirrors(ctx, movePayload.FromListCards)
		if err != nil {
			return nil, nil, nil, err
		}
		hydratedTo, err := s.HydrateListCardResponseMirrors(ctx, movePayload.ToListCards)
		if err != nil {
			return nil, nil, nil, err
		}
		hydratedPatchSlice, err := s.HydrateListCardResponseMirrors(ctx, []dto.ListCardResponse{movePayload.ListCardPatch})
		if err != nil {
			return nil, nil, nil, err
		}
		movePayload.FromListCards = hydratedFrom
		movePayload.ToListCards = hydratedTo
		if len(hydratedPatchSlice) > 0 {
			movePayload.ListCardPatch = hydratedPatchSlice[0]
		}

		movedCard, err := s.CardsRepo.GetCardByIDTX(ctx, s.db, cardID, s.IncludeDeleted)
		if err != nil {
			return nil, nil, nil, domainerr.MapRepoErr(err, true)
		}
		movePayload.Cards[cardID] = dto.CardToResponse(movedCard)

	} else {
		//fmt.Println("NoDetatch flow")
		sourceListCardRef, err := s.ListCardsRepo.GetAnyListCardByCardIDTX(ctx, s.db, cardID, s.IncludeDeleted)
		if err != nil {
			return nil, nil, nil, domainerr.MapRepoErr(err, true)
		}
		targetListCard = &models.ListCard{
			ID:     uuid.New(),
			CardID: cardID,
			ListID: req.TargetListID,
			RootID: sourceListCardRef.RootID,
			Pos:    position,
		}
		if err := s.ListCardsRepo.CreateCardListTX(ctx, s.db, targetListCard); err != nil {
			fmt.Println("Error creating target list card:", err)
			return nil, nil, nil, domainerr.MapRepoErr(err, false)
		}
		hydratedAttached, err := s.HydrateListCardResponseMirrors(ctx, []dto.ListCardResponse{dto.ListCardToResponse(targetListCard)})
		if err != nil {
			return nil, nil, nil, err
		}
		s.Hub.BroadCastToBoard(ws.Event{
			Type:    "card.attached",
			BoardID: boardID,
			Payload: dto.BoardDetailResponse{
				ListCardRelations: hydratedAttached,
			},
			TS:            time.Now(),
			CorrelationID: &correlationID,
		})
	}
	return targetListCard, sourceListCard, movePayload, nil
}

func (s *ListCardsService) BulkCrossMoveCards(ctx context.Context,
	userID, boardID uuid.UUID, req BulkCrossMoveCardsRequest) ([]models.ListCard, []models.ListCard, error) {

	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, nil, err
	}
	//Validate all card ids exist in source list

	sourceBoardList, err := s.BoardListRepo.GetBoardList(ctx, boardID, req.FromListID, s.IncludeDeleted)
	if err != nil {
		return nil, nil, domainerr.MapRepoErr(err, false)
	}
	if sourceBoardList.AccessMode != rbac.BoardListEditable {
		return nil, nil, domainerr.ErrForbidden
	}

	validCardSet := make(map[uuid.UUID]struct{}, len(req.CardIDs))
	for _, cardID := range req.CardIDs {
		if _, exists := validCardSet[cardID]; exists {
			return nil, nil, domainerr.ErrValidation
		}
		validCardSet[cardID] = struct{}{}
	}

	var cnt int64
	query := s.db.WithContext(ctx).Table("list_cards lc")
	if !s.IncludeDeleted {
		query = query.Where("lc.deleted_at IS NULL")
	}
	if err := query.
		Where("lc.list_id = ?", req.FromListID).
		Where("lc.card_id IN ?", req.CardIDs).
		Count(&cnt).Error; err != nil {
		return nil, nil, domainerr.MapRepoErr(err, false)
	}
	if cnt != int64(len(req.CardIDs)) {
		return nil, nil, domainerr.ErrValidation
	}

	isCrossList := req.FromListID != req.TargetListID
	var positions []string

	if isCrossList {
		targetBoardList, err := s.BoardListRepo.GetBoardList(ctx, boardID, req.TargetListID, s.IncludeDeleted)
		if err != nil {
			return nil, nil, domainerr.MapRepoErr(err, false)
		}
		if targetBoardList.AccessMode != rbac.BoardListEditable {
			return nil, nil, domainerr.ErrForbidden
		}

	}
	if req.AfterID != nil {

		positions, err = s.PositionHelper.BulkCardPosAfterID(ctx, req.CardIDs,
			req.FromListID, req.TargetListID, *req.AfterID, isCrossList)
		if err != nil {
			return nil, nil, err
		}

	}
	movedListCards := make([]models.ListCard, 0, len(req.CardIDs))
	rootIDByCardID := make(map[uuid.UUID]uuid.UUID, len(req.CardIDs))
	if len(req.CardIDs) > 0 {
		sourceCards, err := s.ListCardsRepo.GetListCardsByCardIDsTX(ctx, s.db, req.CardIDs, s.IncludeDeleted)
		if err != nil {
			return nil, nil, domainerr.MapRepoErr(err, true)
		}
		for i := range sourceCards {
			lc := sourceCards[i]
			if _, exists := rootIDByCardID[lc.CardID]; exists {
				continue
			}
			rootIDByCardID[lc.CardID] = lc.RootID
		}
	}
	for i, cardID := range req.CardIDs {
		rootID, ok := rootIDByCardID[cardID]
		if !ok {
			return nil, nil, domainerr.ErrValidation
		}
		movedListCard := models.ListCard{
			ID:     uuid.New(),
			CardID: cardID,
			ListID: req.TargetListID,
			RootID: rootID,
			Pos:    positions[i],
		}
		movedListCards = append(movedListCards, movedListCard)
	}
	var deletedListCards []models.ListCard
	if !isCrossList && req.DetatchFromSource == false {
		return nil, nil, domainerr.ErrValidation
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {

		if req.DetatchFromSource {
			//Delete from source list
			deletedListCards, err = s.ListCardsRepo.BulkDeleteListCardsTX(ctx, tx, req.FromListID, req.CardIDs)
			if err != nil {
				return domainerr.MapRepoErr(err, false)
			}

		}
		//Insert into target list
		if err := s.ListCardsRepo.BulkUpsertListCardsPosTX(ctx, tx, movedListCards); err != nil {
			return domainerr.MapRepoErr(err, false)
		}
		return nil
	})
	if err != nil {
		return nil, nil, err
	}
	return movedListCards, deletedListCards, nil

}

func (s *ListCardsService) BulkMoveListCardsInBoard(ctx context.Context,
	userID, boardID uuid.UUID, req BulkMoveListCardsInBoardRequest) ([]models.ListCard, []dto.MoveCardEventPayload, error) {

	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, nil, err
	}

	if len(req.ListCardIDs) == 0 {
		return nil, nil, domainerr.ErrValidation
	}

	if req.BeforeID != nil && req.AfterID != nil {
		return nil, nil, domainerr.ErrValidation
	}

	if req.InsertAt != nil {
		insertAt := strings.ToLower(strings.TrimSpace(*req.InsertAt))
		if insertAt == "" {
			req.InsertAt = nil
		} else if insertAt != "start" && insertAt != "end" {
			return nil, nil, domainerr.ErrValidation
		} else {
			req.InsertAt = &insertAt
		}
	}

	if req.AfterID != nil && *req.AfterID == uuid.Nil {
		req.AfterID = nil
	}
	if req.BeforeID != nil && *req.BeforeID == uuid.Nil {
		req.BeforeID = nil
	}

	if req.TargetListID == uuid.Nil {
		return nil, nil, domainerr.ErrValidation
	}

	targetBoardList, err := s.BoardListRepo.GetBoardList(ctx, boardID, req.TargetListID, s.IncludeDeleted)
	if err != nil {
		return nil, nil, domainerr.MapRepoErr(err, false)
	}
	if targetBoardList.AccessMode != rbac.BoardListEditable {
		return nil, nil, domainerr.ErrForbidden
	}

	seen := make(map[uuid.UUID]struct{}, len(req.ListCardIDs))
	orderedIDs := make([]uuid.UUID, 0, len(req.ListCardIDs))
	for _, id := range req.ListCardIDs {
		if id == uuid.Nil {
			return nil, nil, domainerr.ErrValidation
		}
		if _, ok := seen[id]; ok {
			return nil, nil, domainerr.ErrValidation
		}
		seen[id] = struct{}{}
		orderedIDs = append(orderedIDs, id)
	}

	movingListCards, err := s.ListCardsRepo.GetListCardsByIDsTX(ctx, s.db, orderedIDs, s.IncludeDeleted)
	if err != nil {
		return nil, nil, domainerr.MapRepoErr(err, false)
	}
	if len(movingListCards) != len(orderedIDs) {
		return nil, nil, domainerr.ErrValidation
	}

	movingByID := make(map[uuid.UUID]models.ListCard, len(movingListCards))
	sourceListIDByListCardID := make(map[uuid.UUID]uuid.UUID, len(movingListCards))
	sourceListIDs := make(map[uuid.UUID]struct{})
	for i := range movingListCards {
		lc := movingListCards[i]
		movingByID[lc.ID] = lc
		sourceListIDByListCardID[lc.ID] = lc.ListID
		sourceListIDs[lc.ListID] = struct{}{}
	}

	for sourceListID := range sourceListIDs {
		bl, err := s.BoardListRepo.GetBoardList(ctx, boardID, sourceListID, s.IncludeDeleted)
		if err != nil {
			return nil, nil, domainerr.MapRepoErr(err, false)
		}
		if bl.AccessMode != rbac.BoardListEditable {
			return nil, nil, domainerr.ErrForbidden
		}
	}

	targetCards, err := s.ListCardsRepo.GetCardsInList(ctx, req.TargetListID, s.IncludeDeleted)
	if err != nil {
		return nil, nil, domainerr.MapRepoErr(err, false)
	}

	targetStatic := make([]models.ListCard, 0, len(targetCards))
	for i := range targetCards {
		if _, moving := seen[targetCards[i].ID]; moving {
			continue
		}
		targetStatic = append(targetStatic, targetCards[i])
	}

	prevPos := ""
	nextPos := ""
	if req.AfterID != nil {
		idx := -1
		for i := range targetStatic {
			if targetStatic[i].ID == *req.AfterID {
				idx = i
				break
			}
		}
		if idx == -1 {
			return nil, nil, domainerr.ErrValidation
		}
		prevPos = targetStatic[idx].Pos
		if idx+1 < len(targetStatic) {
			nextPos = targetStatic[idx+1].Pos
		}
	} else if req.BeforeID != nil {
		idx := -1
		for i := range targetStatic {
			if targetStatic[i].ID == *req.BeforeID {
				idx = i
				break
			}
		}
		if idx == -1 {
			return nil, nil, domainerr.ErrValidation
		}
		nextPos = targetStatic[idx].Pos
		if idx > 0 {
			prevPos = targetStatic[idx-1].Pos
		}
	} else if req.InsertAt != nil && *req.InsertAt == "start" {
		if len(targetStatic) > 0 {
			nextPos = targetStatic[0].Pos
		}
	} else {
		if len(targetStatic) > 0 {
			prevPos = targetStatic[len(targetStatic)-1].Pos
		}
	}

	positions, err := rank.NewRankGenerator().GenerateNRankBetween(prevPos, nextPos, len(orderedIDs))
	if err != nil {
		return nil, nil, domainerr.ErrValidation
	}

	updates := make([]models.ListCard, 0, len(orderedIDs))
	for i, id := range orderedIDs {
		lc, ok := movingByID[id]
		if !ok {
			return nil, nil, domainerr.ErrValidation
		}
		lc.ListID = req.TargetListID
		lc.Pos = positions[i]
		updates = append(updates, lc)
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for i := range updates {
			if err := s.ListCardsRepo.UpsertListCardByIdTX(ctx, tx, &updates[i]); err != nil {
				return domainerr.MapRepoErr(err, false)
			}
		}
		return nil
	})
	if err != nil {
		return nil, nil, err
	}

	involvedListIDs := make(map[uuid.UUID]struct{}, len(sourceListIDs)+1)
	for listID := range sourceListIDs {
		involvedListIDs[listID] = struct{}{}
	}
	involvedListIDs[req.TargetListID] = struct{}{}

	listCardsByListID := make(map[uuid.UUID][]dto.ListCardResponse, len(involvedListIDs))
	for listID := range involvedListIDs {
		listCards, err := s.ListCardsRepo.GetCardsInList(ctx, listID, s.IncludeDeleted)
		if err != nil {
			return nil, nil, domainerr.MapRepoErr(err, false)
		}
		listCardResponses := make([]dto.ListCardResponse, 0, len(listCards))
		for i := range listCards {
			listCardResponses = append(listCardResponses, dto.ListCardToResponse(&listCards[i]))
		}
		hydratedListCardResponses, err := s.HydrateListCardResponseMirrors(ctx, listCardResponses)
		if err != nil {
			return nil, nil, err
		}
		listCardsByListID[listID] = hydratedListCardResponses
	}

	type bulkGroup struct {
		sourceListID uuid.UUID
		samplePatch  dto.ListCardResponse
		movedCount   int
	}
	groups := make(map[uuid.UUID]*bulkGroup)
	for i := range updates {
		moved := updates[i]
		sourceListID, ok := sourceListIDByListCardID[moved.ID]
		if !ok {
			return nil, nil, domainerr.ErrValidation
		}

		group, exists := groups[sourceListID]
		if !exists {
			group = &bulkGroup{
				sourceListID: sourceListID,
				samplePatch:  dto.ListCardToResponse(&moved),
				movedCount:   0,
			}
			groups[sourceListID] = group
		}
		group.movedCount++
	}

	eventPayloads := make([]dto.MoveCardEventPayload, 0, len(groups))
	for sourceListID, group := range groups {
		fromCards := listCardsByListID[sourceListID]
		toCards := listCardsByListID[req.TargetListID]

		eventPayloads = append(eventPayloads, dto.MoveCardEventPayload{
			ListCardPatch:      group.samplePatch,
			FromListCards:      fromCards,
			ToListCards:        toCards,
			FromListID:         sourceListID.String(),
			ToListID:           req.TargetListID.String(),
			MoveAllCardsInList: true,
			MovedCount:         group.movedCount,
		})
	}

	return updates, eventPayloads, nil
}

func (s *ListCardsService) GetListCardsByListId(ctx context.Context, userID, boardID, listID uuid.UUID) ([]models.ListCard, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Viewer, s.IncludeDeleted); err != nil {
		return nil, err
	}

	listcards, err := s.ListCardsRepo.GetCardsInList(ctx, listID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	return listcards, nil

}

func (s *ListCardsService) MoveCardToBoard(ctx context.Context, userID, sourceBoardID, cardID uuid.UUID, req MoveCardToBoardRequest) ([]dto.BoardListResponse, *MoveCardToBoardEventData, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, sourceBoardID, rbac.Member, s.IncludeDeleted); err != nil {
		fmt.Println("MoveCardToBoard return: source board role check failed", err)
		return nil, nil, err
	}
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, req.TargetBoardID, rbac.Member, s.IncludeDeleted); err != nil {
		fmt.Println("MoveCardToBoard return: target board role check failed", err)
		return nil, nil, err
	}

	allowedRoles := rbac.AllowedAtLeast(rbac.Member)
	if ok, err := s.CapabilitiesRepo.CanAccessListInBoard(ctx, s.db,
		userID, sourceBoardID, req.SourceListID, allowedRoles, rbac.BoardListEditable.String(), s.IncludeDeleted); err != nil {
		fmt.Println("MoveCardToBoard return: source list capability check errored", err)
		return nil, nil, domainerr.MapRepoErr(err, false)
	} else if !*ok {
		fmt.Println("MoveCardToBoard return: source list capability forbidden")
		return nil, nil, domainerr.ErrForbidden
	}
	if ok, err := s.CapabilitiesRepo.CanAccessListInBoard(ctx, s.db,
		userID, req.TargetBoardID, req.TargetListID, allowedRoles, rbac.BoardListEditable.String(), s.IncludeDeleted); err != nil {
		fmt.Println("MoveCardToBoard return: target list capability check errored", err)
		return nil, nil, domainerr.MapRepoErr(err, false)
	} else if !*ok {
		fmt.Println("MoveCardToBoard return: target list capability forbidden")
		return nil, nil, domainerr.ErrForbidden
	}

	sourceBoardList, err := s.BoardListRepo.GetBoardList(ctx, sourceBoardID, req.SourceListID, s.IncludeDeleted)
	if err != nil {
		fmt.Println("MoveCardToBoard return: source board-list lookup failed", err)
		return nil, nil, domainerr.MapRepoErr(err, false)
	}
	targetBoardList, err := s.BoardListRepo.GetBoardList(ctx, req.TargetBoardID, req.TargetListID, s.IncludeDeleted)
	if err != nil {
		fmt.Println("MoveCardToBoard return: target board-list lookup failed", err)
		return nil, nil, domainerr.MapRepoErr(err, false)
	}
	if sourceBoardList.AccessMode != rbac.BoardListEditable || targetBoardList.AccessMode != rbac.BoardListEditable {
		fmt.Println("MoveCardToBoard return: board-list access mode forbidden", sourceBoardList.AccessMode, targetBoardList.AccessMode)
		return nil, nil, domainerr.ErrForbidden
	}

	var position string
	if req.BeforeID != nil {
		listcard, err := s.ListCardsRepo.GetListCardByListAndCardTX(ctx, s.db, req.TargetListID, *req.BeforeID, s.IncludeDeleted)
		if err != nil {
			fmt.Println("MoveCardToBoard return: before-id list-card lookup failed", err)
			return nil, nil, domainerr.MapRepoErr(err, false)
		}

		fmt.Println("MoveCardToBoard: calculating position before id", *req.BeforeID, "in list", req.TargetListID, "and listcard id", listcard.ID)
		position, err = s.PositionHelper.CardPosBeforeID(ctx, req.TargetListID, listcard.ID)
		if err != nil {
			fmt.Println("MoveCardToBoard return: position before-id calculation failed", err)
			return nil, nil, err
		}
	} else if req.InsertAt != nil && *req.InsertAt == "start" {
		position, err = s.PositionHelper.CardPosAtListStart(ctx, req.TargetListID)
		if err != nil {
			fmt.Println("MoveCardToBoard return: position at-list-start calculation failed", err)
			return nil, nil, err
		}
	} else {
		position, err = s.PositionHelper.CardPosAtListEnd(ctx, req.TargetListID)
		if err != nil {
			fmt.Println("MoveCardToBoard return: position at-list-end calculation failed", err)
			return nil, nil, err
		}
	}

	var movedListCard *models.ListCard
	var rootListCardID uuid.UUID
	var sourceListCards []models.ListCard
	var targetListCards []models.ListCard

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		sourceRel, err := s.ListCardsRepo.GetListCardByListAndCardTX(ctx, tx, req.SourceListID, cardID, s.IncludeDeleted)
		if err != nil {
			return domainerr.MapRepoErr(err, true)
		}
		rootListCardID = sourceRel.RootID

		movedListCard = &models.ListCard{
			ID:     sourceRel.ID,
			CardID: cardID,
			ListID: req.TargetListID,
			RootID: sourceRel.RootID,
			Pos:    position,
		}

		if err := s.ListCardsRepo.UpsertListCardByIdTX(ctx, tx, movedListCard); err != nil {
			return domainerr.MapRepoErr(err, false)
		}

		listIDs := []uuid.UUID{req.SourceListID}
		if req.TargetListID != req.SourceListID {
			listIDs = append(listIDs, req.TargetListID)
		}
		rows, err := s.ListCardsRepo.GetListCardByListIDsTX(ctx, tx, listIDs)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}

		sourceListCards = sourceListCards[:0]
		targetListCards = targetListCards[:0]
		for _, row := range rows {
			if row.ListID == req.SourceListID {
				sourceListCards = append(sourceListCards, row)
			}
			if row.ListID == req.TargetListID {
				targetListCards = append(targetListCards, row)
			}
		}

		return nil
	})
	if err != nil {
		fmt.Println("MoveCardToBoard return: transaction failed", err)
		return nil, nil, err
	}

	toResponses := func(listCards []models.ListCard) []dto.ListCardResponse {
		out := make([]dto.ListCardResponse, 0, len(listCards))
		for _, lc := range listCards {
			out = append(out, dto.ListCardToResponse(&lc))
		}
		return out
	}

	sourceResponses := toResponses(sourceListCards)
	targetResponses := toResponses(targetListCards)
	hydratedSourceResponses, err := s.HydrateListCardResponseMirrors(ctx, sourceResponses)
	if err != nil {
		return nil, nil, err
	}
	hydratedTargetResponses, err := s.HydrateListCardResponseMirrors(ctx, targetResponses)
	if err != nil {
		return nil, nil, err
	}
	listCardPatch := dto.ListCardToResponse(movedListCard)
	hydratedPatchSlice, err := s.HydrateListCardResponseMirrors(ctx, []dto.ListCardResponse{listCardPatch})
	if err != nil {
		return nil, nil, err
	}
	if len(hydratedPatchSlice) > 0 {
		listCardPatch = hydratedPatchSlice[0]
	}
	boardLists := []dto.BoardListResponse{dto.BoardListToResponse(sourceBoardList)}
	if req.TargetBoardID != sourceBoardID || req.TargetListID != req.SourceListID {
		boardLists = append(boardLists, dto.BoardListToResponse(targetBoardList))
	}

	cardMeta, err := s.CardsRepo.GetCardByIDTX(ctx, s.db, cardID, s.IncludeDeleted)
	if err != nil {
		return nil, nil, domainerr.MapRepoErr(err, true)
	}

	eventData := &MoveCardToBoardEventData{
		RootListCardID:  rootListCardID,
		MovedListCardID: movedListCard.ID,
		CardID:          cardID,
		CardPatch:       dto.CardToResponse(cardMeta),
		SourceBoardID:   sourceBoardID,
		TargetBoardID:   req.TargetBoardID,
		SourceListID:    req.SourceListID,
		TargetListID:    req.TargetListID,
		ListCardPatch:   listCardPatch,
		FromListCards:   hydratedSourceResponses,
		ToListCards:     hydratedTargetResponses,
	}

	fmt.Println("MoveCardToBoard return: success", "boardLists", len(boardLists))
	return boardLists, eventData, nil
}

func (s *ListCardsService) MirrorCardToList(ctx context.Context, userID, workspaceUUID, boardID, cardID uuid.UUID,
	req MirrorCardToListRequest, correlationID uuid.UUID) ([]dto.ListCardResponse, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, req.TargetBoardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	allowedRoles := rbac.AllowedAtLeast(rbac.Member)
	if ok, err := s.CapabilitiesRepo.CanAccessListInBoard(ctx, s.db,
		userID, req.TargetBoardID, req.TargetListID, allowedRoles, rbac.BoardListEditable.String(), s.IncludeDeleted); err != nil {
		fmt.Println("MoveCardToBoard return: source list capability check errored", err)
		return nil, domainerr.MapRepoErr(err, false)
	} else if !*ok {
		fmt.Println("MoveCardToBoard return: source list capability forbidden")
		return nil, domainerr.ErrForbidden
	}

	var position string
	var err error
	fmt.Println("BeforeID:", req.BeforeID, "InsertAt:", req.InsertAt)
	if req.BeforeID != nil {
		listcard, err := s.ListCardsRepo.GetListCardByListAndCardTX(ctx, s.db, req.TargetListID, *req.BeforeID, s.IncludeDeleted)
		if err != nil {
			fmt.Println("MoveCardToBoard return: before-id list-card lookup failed", err)
			return nil, domainerr.MapRepoErr(err, false)
		}
		position, err = s.PositionHelper.CardPosBeforeID(ctx, req.TargetListID, listcard.ID)
		if err != nil {
			fmt.Println("MirrorCardToList return: position calculation failed", err)
			return nil, domainerr.MapRepoErr(err, false)
		}
	} else if req.InsertAt != nil && *req.InsertAt == "start" {
		position, err = s.PositionHelper.CardPosAtListStart(ctx, req.TargetListID)
		if err != nil {
			fmt.Println("MirrorCardToList return: position at-list-start calculation failed", err)
			return nil, domainerr.MapRepoErr(err, false)
		}
	} else {
		position, err = s.PositionHelper.CardPosAtListEnd(ctx, req.TargetListID)
		if err != nil {
			fmt.Println("MirrorCardToList return: position at-list-end calculation failed", err)
			return nil, domainerr.MapRepoErr(err, false)
		}
	}

	newListCard := &models.ListCard{
		ID:     uuid.New(),
		CardID: cardID,
		ListID: req.TargetListID,
		RootID: uuid.Nil,
		Pos:    position,
	}
	sourceCardRelation, err := s.ListCardsRepo.GetAnyListCardByCardIDTX(ctx, s.db, cardID, s.IncludeDeleted)
	if err != nil {
		fmt.Println("MirrorCardToList return: source relation lookup failed", err)
		return nil, domainerr.MapRepoErr(err, true)
	}
	newListCard.RootID = sourceCardRelation.RootID

	rootBoardID, err := s.resolveBoardIDForRootListCard(ctx, newListCard.RootID)
	if err != nil {
		fmt.Println("MirrorCardToList return: root board resolution failed", err)
		return nil, err
	}

	boardsPayload, err := s.buildBoardsPayload(ctx, []uuid.UUID{boardID, req.TargetBoardID, rootBoardID})
	if err != nil {
		fmt.Println("MirrorCardToList return: boards payload build failed", err)
		return nil, err
	}

	externalRootsByID, err := s.buildExternalRootsPayload(ctx, []uuid.UUID{newListCard.RootID})
	if err != nil {
		fmt.Println("MirrorCardToList return: external roots payload build failed", err)
		return nil, err
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := s.ListCardsRepo.CreateCardListTX(ctx, tx, newListCard); err != nil {
			return domainerr.MapRepoErr(err, false)
		}
		return nil
	})
	if err != nil {
		fmt.Println("MirrorCardToList return: transaction failed", err)
		return nil, err
	}

	targetListCards, err := s.ListCardsRepo.GetCardsInList(ctx, req.TargetListID, s.IncludeDeleted)
	if err != nil {
		fmt.Println("MirrorCardToList return: fetching target list cards failed", err)
		return nil, domainerr.MapRepoErr(err, false)
	}
	listCardResponses := dto.ListCardsToResponses(targetListCards)
	listCardResponses, err = s.HydrateListCardResponseMirrors(ctx, listCardResponses)
	if err != nil {
		return nil, err
	}

	statePayload := dto.BoardDetailResponse{
		Board: dto.BoardResponse{
			ID: req.TargetBoardID,
		},
		Boards:            boardsPayload,
		ExternalRootsByID: externalRootsByID,
		ListCardRelations: listCardResponses,
	}

	eventTargets := []EventRegistry.TargetRef{
		{
			EntityType: "card",
			EntityID:   cardID,
			BoardID:    &boardID,
		},
		{
			EntityType: "list",
			EntityID:   req.TargetListID,
			BoardID:    &req.TargetBoardID,
		},
		{
			EntityType: "board",
			EntityID:   req.TargetBoardID,
			BoardID:    &req.TargetBoardID,
		},
		{
			EntityType: "board",
			EntityID:   boardID,
			BoardID:    &boardID,
		},
	}

	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventCardMirroredTarget,
		WorkspaceID:   &workspaceUUID,
		BoardID:       &req.TargetBoardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload: EventRegistry.EventPayloadEnvelope{
			StatePayload: &statePayload,
		},
		Targets:    eventTargets,
		OccurredAt: time.Now(),
	}

	if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
		fmt.Println("MirrorCardToList return: event emission failed", err)

	}

	sourceListCardRelations := []dto.ListCardResponse{}
	if sourceCardRelation != nil && sourceCardRelation.ListID != uuid.Nil {
		sourceListCards, sourceListErr := s.ListCardsRepo.GetCardsInList(ctx, sourceCardRelation.ListID, s.IncludeDeleted)
		if sourceListErr != nil {
			fmt.Println("MirrorCardToList warning: fetching source list cards failed", sourceListErr)
		} else {
			hydratedSourceListCards, hydrateErr := s.HydrateListCardResponseMirrors(ctx, dto.ListCardsToResponses(sourceListCards))
			if hydrateErr != nil {
				fmt.Println("MirrorCardToList warning: hydrating source list cards failed", hydrateErr)
			} else {
				sourceListCardRelations = hydratedSourceListCards
			}
		}
	}

	statePayloadForSourceBoard := dto.BoardDetailResponse{
		Board: dto.BoardResponse{
			ID: boardID,
		},
		Boards:            boardsPayload,
		ExternalRootsByID: externalRootsByID,
		ListCardRelations: sourceListCardRelations,
	}
	domainEventForSourceBoard := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventCardMirroredSource,
		WorkspaceID:   &workspaceUUID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload: EventRegistry.EventPayloadEnvelope{
			StatePayload: &statePayloadForSourceBoard,
		},
		Targets:    eventTargets,
		OccurredAt: time.Now(),
	}

	if req.TargetBoardID != boardID {
		if err := s.EventRegistry.Emit(ctx, s.db, domainEventForSourceBoard); err != nil {
			fmt.Println("MirrorCardToList return: event emission to source board failed", err)

		}
	}

	return listCardResponses, nil

}

func (s *ListCardsService) resolveBoardIDForRootListCard(ctx context.Context, rootListCardID uuid.UUID) (uuid.UUID, error) {
	if rootListCardID == uuid.Nil {
		return uuid.Nil, nil
	}

	row := struct {
		BoardID uuid.UUID `gorm:"column:board_id"`
	}{}

	query := s.db.WithContext(ctx).
		Table("list_cards lc").
		Select("bl.board_id AS board_id").
		Joins("JOIN board_lists bl ON bl.list_id = lc.list_id").
		Where("lc.id = ?", rootListCardID)

	if !s.IncludeDeleted {
		query = query.Where("lc.deleted_at IS NULL").Where("bl.deleted_at IS NULL")
	} else {
		query = query.Unscoped()
	}

	err := query.Take(&row).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return uuid.Nil, nil
		}
		return uuid.Nil, domainerr.MapRepoErr(err, true)
	}

	return row.BoardID, nil
}

func (s *ListCardsService) buildBoardsPayload(ctx context.Context, boardIDs []uuid.UUID) (map[uuid.UUID]dto.BoardResponse, error) {
	uniqueBoardIDs := make([]uuid.UUID, 0, len(boardIDs))
	boardIDSet := make(map[uuid.UUID]struct{}, len(boardIDs))
	for _, boardID := range boardIDs {
		if boardID == uuid.Nil {
			continue
		}
		if _, exists := boardIDSet[boardID]; exists {
			continue
		}
		boardIDSet[boardID] = struct{}{}
		uniqueBoardIDs = append(uniqueBoardIDs, boardID)
	}

	if len(uniqueBoardIDs) == 0 {
		return map[uuid.UUID]dto.BoardResponse{}, nil
	}

	query := s.db.WithContext(ctx).Table("boards")
	if s.IncludeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}

	boards := make([]models.Board, 0, len(uniqueBoardIDs))
	if err := query.Where("id IN ?", uniqueBoardIDs).Find(&boards).Error; err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	payload := make(map[uuid.UUID]dto.BoardResponse, len(boards))
	for i := range boards {
		board := boards[i]
		payload[board.ID] = dto.BoardToResponse(&board)
	}

	return payload, nil
}

func (s *ListCardsService) buildExternalRootsPayload(ctx context.Context, rootIDs []uuid.UUID) (map[uuid.UUID]dto.ExternalRootRefResponse, error) {
	uniqueRootIDs := make([]uuid.UUID, 0, len(rootIDs))
	rootIDSet := make(map[uuid.UUID]struct{}, len(rootIDs))
	for _, rootID := range rootIDs {
		if rootID == uuid.Nil {
			continue
		}
		if _, exists := rootIDSet[rootID]; exists {
			continue
		}
		rootIDSet[rootID] = struct{}{}
		uniqueRootIDs = append(uniqueRootIDs, rootID)
	}

	if len(uniqueRootIDs) == 0 {
		return map[uuid.UUID]dto.ExternalRootRefResponse{}, nil
	}

	query := s.db.WithContext(ctx).Table("list_cards lc")
	if s.IncludeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("lc.deleted_at IS NULL").
			Where("bl.deleted_at IS NULL").
			Where("b.deleted_at IS NULL").
			Where("w.deleted_at IS NULL").
			Where("l.deleted_at IS NULL").
			Where("c.deleted_at IS NULL")
	}

	rows := make([]models.ExternalRootRefRow, 0, len(uniqueRootIDs))
	if err := query.
		Select(`
			lc.id AS root_list_card_id,
			lc.card_id AS card_id,
			bl.board_id AS board_id,
			b.workspace_id AS workspace_id,
			w.name AS workspace_name,
			lc.list_id AS list_id,
			b.name AS board_name,
			l.title AS list_title,
			c.title AS card_title,
			lc.updated_at AS updated_at
		`).
		Joins("JOIN board_lists bl ON bl.list_id = lc.list_id").
		Joins("JOIN boards b ON b.id = bl.board_id").
		Joins("JOIN workspaces w ON w.id = b.workspace_id").
		Joins("JOIN lists l ON l.id = lc.list_id").
		Joins("JOIN cards c ON c.id = lc.card_id").
		Where("lc.id IN ?", uniqueRootIDs).
		Order("lc.updated_at DESC").
		Scan(&rows).Error; err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	payload := make(map[uuid.UUID]dto.ExternalRootRefResponse, len(rows))
	for i := range rows {
		row := rows[i]
		if row.RootListCardID == uuid.Nil {
			continue
		}
		if _, exists := payload[row.RootListCardID]; exists {
			continue
		}
		payload[row.RootListCardID] = dto.ExternalRootRefToResponse(&row)
	}

	return payload, nil
}

func (s *ListCardsService) CopyCardToList(ctx context.Context, userID, workspaceUUID, boardID, cardID uuid.UUID,
	req CopyCardToListRequest, correlationID uuid.UUID) (*models.Card, *models.ListCard, error) {
	sourceBoardList, err := s.getBoardListForCardInBoard(ctx, cardID, boardID)
	if err != nil {
		fmt.Println("CopyCardToList return: source board-list lookup failed", err)
		return nil, nil, err
	}

	targetBoard, err := s.BoardsRepo.GetBoardByIDTX(ctx, s.db, req.TargetBoardID, s.IncludeDeleted)
	if err != nil {
		fmt.Println("CopyCardToList return: target board lookup failed", err)
		return nil, nil, domainerr.MapRepoErr(err, true)
	}

	targetBoardList, err := s.BoardListRepo.GetBoardList(ctx, req.TargetBoardID, req.TargetListID, s.IncludeDeleted)
	if err != nil {
		fmt.Println("CopyCardToList return: target board-list lookup failed", err)
		return nil, nil, domainerr.MapRepoErr(err, true)
	}

	authorization, err := s.authz.AuthorizeRequest(ctx, authzdto.Request{
		UserID:        userID,
		CorrelationID: correlationID,
		Action:        actions.CopyListCard,
		Payload: authzdto.RequestPayload{
			CopyListCardPayload: &authzdto.CopyListCardPayload{
				ReadListCardPayload: authzdto.ReadListCardPayload{
					WorkspaceID:       workspaceUUID,
					CardID:            cardID,
					SourceBoardListID: sourceBoardList.ID,
				},
				CreateListCardPayload: authzdto.CreateListCardPayload{
					TargetWorkspaceID: targetBoard.WorkspaceID,
					TargetBoardListID: targetBoardList.ID,
				},
			},
		},
	})
	if err != nil {
		fmt.Println("CopyCardToList return: authz failed", err)
		return nil, nil, err
	}
	if !authorization.Authorized {
		fmt.Println("CopyCardToList return: forbidden by authz")
		return nil, nil, domainerr.ErrForbidden
	}

	execResult, err := s.ExecuteCopyCardToList(ctx, userID, boardID, cardID, req)
	if err != nil {
		fmt.Println("CopyCardToList return: transaction failed", err)
		return nil, nil, err
	}

	statePayload := dto.BoardDetailResponse{
		Board: dto.BoardResponse{ID: req.TargetBoardID},
		Cards: map[uuid.UUID]dto.CardResponse{
			execResult.NewCard.ID: dto.CardToResponse(execResult.NewCard),
		},
		ListCardRelations: []dto.ListCardResponse{
			dto.ListCardToResponse(execResult.NewListCard),
		},
	}
	if req.KeepComments {
		commentResponses := make([]dto.CardCommentResponse, 0, len(execResult.Comments))
		for _, comment := range execResult.Comments {
			commentResponses = append(commentResponses, dto.CardCommentToResponse(&comment))
		}
		statePayload.CardComments = commentResponses
	}
	if req.KeepLabels {
		labelLinkResponses := make([]dto.CardLabelLinkResponse, 0, len(execResult.Labels))
		for _, labelLink := range execResult.Labels {
			labelLinkResponses = append(labelLinkResponses, dto.CardLabelLinkToResponse(&labelLink))
		}
		statePayload.CardLabelLinks = labelLinkResponses

		boardLabelResponses := make([]dto.BoardLabelResponse, 0, len(execResult.BoardLabels))
		for _, boardLabel := range execResult.BoardLabels {
			boardLabelResponses = append(boardLabelResponses, dto.BoardLabelToResponse(&boardLabel))
		}
		statePayload.BoardLabels = boardLabelResponses
	}
	if req.KeepMembers {
		memberResponses := make([]dto.CardMemberResponse, 0, len(execResult.Members))
		for _, memberLink := range execResult.Members {
			memberResponses = append(memberResponses, dto.CardMemberToResponse(&memberLink))
		}
		statePayload.CardMembers = memberResponses
	}
	if req.KeepChecklists {
		checklistResponses := make(map[uuid.UUID]dto.ChecklistResponse, len(execResult.Checklists))
		for _, checklist := range execResult.Checklists {
			checklistResponses[checklist.ID] = dto.ChecklistToResponse(&checklist)
		}
		statePayload.Checklists = checklistResponses

		entryResponses := make(map[uuid.UUID]dto.EntryResponse, len(execResult.Entries))
		for _, entry := range execResult.Entries {
			entryResponses[entry.ID] = dto.EntryToResponse(&entry)
		}
		statePayload.Entries = entryResponses

		cardChecklistResponses := make([]dto.CardChecklistResponse, 0, len(execResult.CardChecklists))
		for _, cc := range execResult.CardChecklists {
			cardChecklistResponses = append(cardChecklistResponses, dto.CardChecklistToResponse(&cc))
		}
		statePayload.CardChecklistRelations = cardChecklistResponses
		checklistEntryResponses := make([]dto.ChecklistEntryResponse, 0, len(execResult.ChecklistEntries))
		for _, checklistEntry := range execResult.ChecklistEntries {
			checklistEntryResponses = append(checklistEntryResponses, dto.ChecklistEntryToResponse(&checklistEntry))
		}
		statePayload.ChecklistEntryRelations = checklistEntryResponses
	}

	eventTargets := []EventRegistry.TargetRef{
		{
			EntityType: "card",
			EntityID:   execResult.NewCard.ID,
			BoardID:    &req.TargetBoardID,
		},
		{
			EntityType: "list",
			EntityID:   req.TargetListID,
			BoardID:    &req.TargetBoardID,
		},
		{
			EntityType: "board",
			EntityID:   req.TargetBoardID,
			BoardID:    &req.TargetBoardID,
		},
	}

	event := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventCardCreated,
		WorkspaceID:   &workspaceUUID,
		BoardID:       &req.TargetBoardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload: EventRegistry.EventPayloadEnvelope{
			StatePayload: &statePayload,
		},
		Targets:    eventTargets,
		OccurredAt: time.Now(),
	}

	if err := s.EventRegistry.Emit(ctx, s.db, event); err != nil {
		return nil, nil, err
	}

	return execResult.NewCard, execResult.NewListCard, nil
}

func (s *ListCardsService) ExecuteCopyCardToList(ctx context.Context, userID, boardID, cardID uuid.UUID, req CopyCardToListRequest) (*CopyCardToListExecutionResult, error) {
	var position string
	var err error
	if req.BeforeID != nil {
		listcard, err := s.ListCardsRepo.GetListCardByListAndCardTX(ctx, s.db, req.TargetListID, *req.BeforeID, s.IncludeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
		position, err = s.PositionHelper.CardPosBeforeID(ctx, req.TargetListID, listcard.ID)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
	} else if req.InsertAt != nil && *req.InsertAt == "start" {
		position, err = s.PositionHelper.CardPosAtListStart(ctx, req.TargetListID)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
	} else {
		position, err = s.PositionHelper.CardPosAtListEnd(ctx, req.TargetListID)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
	}

	result := &CopyCardToListExecutionResult{}
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		originalCard, err := s.CardsRepo.GetCardByIDTX(ctx, tx, cardID, s.IncludeDeleted)
		if err != nil {
			return domainerr.MapRepoErr(err, true)
		}
		result.NewCard = &models.Card{
			ID:              uuid.New(),
			Title:           originalCard.Title,
			Description:     originalCard.Description,
			StartDate:       originalCard.StartDate,
			EndDate:         originalCard.EndDate,
			Done:            originalCard.Done,
			Props:           originalCard.Props,
			CreatedByUserID: userID,
			CreatedInListID: req.TargetListID,
		}
		if req.Title != nil {
			result.NewCard.Title = *req.Title
		}
		if err := s.CardsRepo.CreateCardTX(ctx, tx, result.NewCard); err != nil {
			return domainerr.MapRepoErr(err, false)
		}
		result.NewListCard = &models.ListCard{
			ID:     uuid.New(),
			CardID: result.NewCard.ID,
			ListID: req.TargetListID,
			RootID: uuid.Nil,
			Pos:    position,
		}
		result.NewListCard.RootID = result.NewListCard.ID
		if err := s.ListCardsRepo.CreateCardListTX(ctx, tx, result.NewListCard); err != nil {
			return domainerr.MapRepoErr(err, false)
		}

		if req.KeepComments {
			result.Comments, err = s.CardCommentsRepo.GetCommentsByCardIDTX(ctx, tx, cardID, s.IncludeDeleted)
			if err != nil {
				return domainerr.MapRepoErr(err, false)
			}
			newComments := make([]models.CardComment, 0, len(result.Comments))
			for _, comment := range result.Comments {
				newComment := models.CardComment{
					ID:              uuid.New(),
					CardID:          result.NewCard.ID,
					CreatedByUserID: comment.CreatedByUserID,
					Content:         comment.Content,
				}
				newComments = append(newComments, newComment)
			}
			if err := s.CardCommentsRepo.BulkCreateCommentTX(ctx, tx, newComments); err != nil {
				return domainerr.MapRepoErr(err, false)
			}
			result.Comments = newComments
		}

		if req.KeepLabels {
			result.Labels, err = s.BoardLabelsRepo.GetLabelsByCardIDTX(ctx, tx, cardID, s.IncludeDeleted)
			if err != nil {
				return domainerr.MapRepoErr(err, false)
			}
			if req.TargetBoardID != boardID {
				originalBoardLabels, err := s.BoardLabelsRepo.GetLabelsByBoardIDTX(ctx, tx, boardID, s.IncludeDeleted)
				if err != nil {
					return domainerr.MapRepoErr(err, false)
				}
				newBoardLabels := make([]models.BoardLabel, 0, len(originalBoardLabels))
				newCardLabelLinks := make([]models.CardLabelLink, 0, len(result.Labels))
				for _, lbl := range originalBoardLabels {
					newLabel := models.BoardLabel{
						ID:              uuid.New(),
						BoardID:         req.TargetBoardID,
						Title:           lbl.Title,
						Color:           lbl.Color,
						CreatedByUserID: lbl.CreatedByUserID,
					}
					newBoardLabels = append(newBoardLabels, newLabel)
					newCardLabel := models.CardLabelLink{
						ID:           uuid.New(),
						CardID:       result.NewCard.ID,
						BoardID:      req.TargetBoardID,
						BoardLabelID: newLabel.ID,
					}
					newCardLabelLinks = append(newCardLabelLinks, newCardLabel)
				}
				if err := s.BoardLabelsRepo.BulkCreateLabelsTX(ctx, tx, newBoardLabels); err != nil {
					return domainerr.MapRepoErr(err, false)
				}
				if err := s.BoardLabelsRepo.BulkCreateLabelLinksTX(ctx, tx, newCardLabelLinks); err != nil {
					return domainerr.MapRepoErr(err, false)
				}
				result.Labels = newCardLabelLinks
				result.BoardLabels = newBoardLabels
			} else {
				newCardLabelLinks := make([]models.CardLabelLink, 0, len(result.Labels))
				for _, labelLink := range result.Labels {
					newLabelLink := models.CardLabelLink{
						ID:           uuid.New(),
						CardID:       result.NewCard.ID,
						BoardID:      boardID,
						BoardLabelID: labelLink.BoardLabelID,
					}
					newCardLabelLinks = append(newCardLabelLinks, newLabelLink)
				}
				if err := s.BoardLabelsRepo.BulkCreateLabelLinksTX(ctx, tx, newCardLabelLinks); err != nil {
					return domainerr.MapRepoErr(err, false)
				}
				result.Labels = newCardLabelLinks
				result.BoardLabels = nil
			}

			if req.KeepChecklists {
				result.Checklists, err = s.ChecklistRepo.GetChecklistsByCardIDTX(ctx, tx, cardID, s.IncludeDeleted)
				if err != nil {
					return domainerr.MapRepoErr(err, false)
				}
				result.Entries, err = s.ChecklistRepo.GetEntriesByCardIDTX(ctx, tx, cardID, s.IncludeDeleted)
				if err != nil {
					return domainerr.MapRepoErr(err, false)
				}
				result.CardChecklists, err = s.ChecklistRepo.GetCardChecklistsByCardIDTX(ctx, tx, cardID, s.IncludeDeleted)
				if err != nil {
					return domainerr.MapRepoErr(err, false)
				}
				result.ChecklistEntries, err = s.ChecklistRepo.GetChecklistEntriesByCardIDTX(ctx, tx, cardID, s.IncludeDeleted)
				if err != nil {
					return domainerr.MapRepoErr(err, false)
				}

				newChecklists := make([]models.Checklist, 0, len(result.Checklists))
				newEntries := make([]models.Entry, 0, len(result.Entries))
				newCardChecklists := make([]models.CardChecklist, 0, len(result.Checklists))
				newChecklistEntries := make([]models.ChecklistEntry, 0, len(result.Entries))

				for _, checklist := range result.Checklists {
					newChecklist := models.Checklist{
						ID:              uuid.New(),
						Title:           checklist.Title,
						CreatedByUserID: checklist.CreatedByUserID,
						CreatedInCardID: result.NewCard.ID,
					}
					originalCardChecklist := models.CardChecklist{}
					for _, cc := range result.CardChecklists {
						if cc.ChecklistID == checklist.ID {
							originalCardChecklist = cc
							break
						}
					}
					newCardChecklist := models.CardChecklist{
						ID:          uuid.New(),
						CardID:      result.NewCard.ID,
						ChecklistID: newChecklist.ID,
						Pos:         originalCardChecklist.Pos,
					}
					newCardChecklists = append(newCardChecklists, newCardChecklist)
					newChecklists = append(newChecklists, newChecklist)
					for _, checklistEntry := range result.ChecklistEntries {
						if checklistEntry.ChecklistID == checklist.ID {
							originalEntry := models.Entry{}
							for _, entry := range result.Entries {
								if entry.ID == checklistEntry.EntryID {
									originalEntry = entry
									break
								}
							}
							newEntry := models.Entry{
								ID:              uuid.New(),
								Title:           originalEntry.Title,
								Done:            originalEntry.Done,
								DueDate:         originalEntry.DueDate,
								CreatedByUserID: originalEntry.CreatedByUserID,
							}
							newEntries = append(newEntries, newEntry)
							newChecklistEntry := models.ChecklistEntry{
								ID:          uuid.New(),
								ChecklistID: newChecklist.ID,
								EntryID:     newEntry.ID,
								Pos:         checklistEntry.Pos,
							}
							newChecklistEntries = append(newChecklistEntries, newChecklistEntry)
						}
					}
				}

				if err := s.ChecklistRepo.BulkCreateChecklistsTX(ctx, tx, newChecklists); err != nil {
					return domainerr.MapRepoErr(err, false)
				}
				if err := s.ChecklistRepo.BulkCreateEntriesTX(ctx, tx, newEntries); err != nil {
					return domainerr.MapRepoErr(err, false)
				}
				if err := s.ChecklistRepo.BulkCreateCardChecklistsTX(ctx, tx, newCardChecklists); err != nil {
					return domainerr.MapRepoErr(err, false)
				}
				if err := s.ChecklistRepo.BulkCreateChecklistEntriesTX(ctx, tx, newChecklistEntries); err != nil {
					return domainerr.MapRepoErr(err, false)
				}

				result.Entries = newEntries
				result.Checklists = newChecklists
				result.CardChecklists = newCardChecklists
				result.ChecklistEntries = newChecklistEntries
			}
		}

		if req.KeepMembers {
			result.Members, err = s.CardMembersRepo.GetMembersByCardIDTX(ctx, tx, cardID, s.IncludeDeleted)
			if err != nil {
				return domainerr.MapRepoErr(err, false)
			}
			newMembers := make([]models.CardMember, 0, len(result.Members))
			for _, memberLink := range result.Members {
				newMemberLink := models.CardMember{ID: uuid.New(), CardID: result.NewCard.ID, UserID: memberLink.UserID}
				newMembers = append(newMembers, newMemberLink)
			}
			if err := s.CardMembersRepo.BulkCreateCardMembersLinkTX(ctx, tx, newMembers); err != nil {
				return domainerr.MapRepoErr(err, false)
			}
			result.Members = newMembers
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return result, nil
}

type CheckListDomain struct {
	cardChecklist    []models.CardChecklist
	checklists       []models.Checklist
	entries          []models.Entry
	checklistEntries []models.ChecklistEntry
}

func NewCheckListDomain() *CheckListDomain {
	return &CheckListDomain{}
}

func (s *ListCardsService) CopyCardChecklistsTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, newCard *models.Card,
	domain *CheckListDomain,
) error {

	checklists := domain.checklists
	entries := domain.entries
	cardChecklist := domain.cardChecklist
	checklistEntries := domain.checklistEntries
	var err error

	checklists, err = s.ChecklistRepo.GetChecklistsByCardIDTX(ctx, tx, cardID, s.IncludeDeleted)
	if err != nil {
		return domainerr.MapRepoErr(err, false)
	}
	entries, err = s.ChecklistRepo.GetEntriesByCardIDTX(ctx, tx, cardID, s.IncludeDeleted)
	if err != nil {
		return domainerr.MapRepoErr(err, false)
	}
	cardChecklist, err = s.ChecklistRepo.GetCardChecklistsByCardIDTX(ctx, tx, cardID, s.IncludeDeleted)
	if err != nil {
		return domainerr.MapRepoErr(err, false)
	}
	checklistEntries, err = s.ChecklistRepo.GetChecklistEntriesByCardIDTX(ctx, tx, cardID, s.IncludeDeleted)
	if err != nil {
		return domainerr.MapRepoErr(err, false)
	}

	newChecklists := make([]models.Checklist, 0, len(checklists))
	newEntries := make([]models.Entry, 0, len(entries))
	newCardChecklists := make([]models.CardChecklist, 0, len(checklists))
	newChecklistEntries := make([]models.ChecklistEntry, 0, len(entries))

	for _, checklist := range checklists {
		newChecklist := models.Checklist{
			ID:              uuid.New(),
			Title:           checklist.Title,
			CreatedByUserID: checklist.CreatedByUserID,
			CreatedInCardID: newCard.ID,
		}
		originalCardChecklist := models.CardChecklist{}
		for _, cc := range cardChecklist {
			if cc.ChecklistID == checklist.ID {
				originalCardChecklist = cc
				break
			}
		}
		newCardChecklist := models.CardChecklist{
			ID:          uuid.New(),
			CardID:      newCard.ID,
			ChecklistID: newChecklist.ID,
			Pos:         originalCardChecklist.Pos,
		}
		newCardChecklists = append(newCardChecklists, newCardChecklist)
		newChecklists = append(newChecklists, newChecklist)
		for _, checkListEntry := range checklistEntries {
			if checkListEntry.ChecklistID == checklist.ID {
				originalEntry := models.Entry{}
				for _, entry := range entries {
					if entry.ID == checkListEntry.EntryID {
						originalEntry = entry
						break
					}
				}
				newEntry := models.Entry{
					ID:    uuid.New(),
					Title: originalEntry.Title,

					Done:            originalEntry.Done,
					DueDate:         originalEntry.DueDate,
					CreatedByUserID: originalEntry.CreatedByUserID,
				}
				newEntries = append(newEntries, newEntry)

				newChecklistEntry := models.ChecklistEntry{
					ID:          uuid.New(),
					ChecklistID: newChecklist.ID,
					EntryID:     newEntry.ID,
					Pos:         checkListEntry.Pos,
				}
				newChecklistEntries = append(newChecklistEntries, newChecklistEntry)
			}
		}
	}

	if err := s.ChecklistRepo.BulkCreateChecklistsTX(ctx, tx, newChecklists); err != nil {
		return domainerr.MapRepoErr(err, false)
	}
	if err := s.ChecklistRepo.BulkCreateEntriesTX(ctx, tx, newEntries); err != nil {
		return domainerr.MapRepoErr(err, false)
	}
	if err := s.ChecklistRepo.BulkCreateCardChecklistsTX(ctx, tx, newCardChecklists); err != nil {
		return domainerr.MapRepoErr(err, false)
	}
	if err := s.ChecklistRepo.BulkCreateChecklistEntriesTX(ctx, tx, newChecklistEntries); err != nil {
		return domainerr.MapRepoErr(err, false)
	}

	domain.entries = newEntries
	domain.checklists = newChecklists
	domain.cardChecklist = newCardChecklists
	domain.checklistEntries = newChecklistEntries

	return nil
}

func (s *ListCardsService) GetRootBoardForListCard(ctx context.Context, userID, boardId uuid.UUID, listCardID uuid.UUID) (*dto.RootBoardListResponse, error) {

	listcard, err := s.ListCardsRepo.GetListCardByIDTX(ctx, s.db, listCardID, s.IncludeDeleted)
	if err != nil {
		fmt.Println("GetRootBoardForListCard warning: fetching list card with deleted filter failed, retrying with unscoped", err)
		if !isNotFoundError(err) {
			fmt.Println("GetRootBoardForListCard return: error fetching list card", err)
			return nil, domainerr.MapRepoErr(err, true)
		}

		listcard, err = s.ListCardsRepo.GetListCardByIDTX(ctx, s.db, listCardID, true)
		if err != nil {
			if isNotFoundError(err) {
				isMainListCardPurged := true
				fmt.Println("GetRootBoardForListCard return: main list card purged")
				return &dto.RootBoardListResponse{IsMainListCardPurged: &isMainListCardPurged}, nil
			}
			return nil, domainerr.MapRepoErr(err, true)
		}

		if listcard.DeletedAt.Valid {
			isMainListCardSoftDeleted := true
			fmt.Println("GetRootBoardForListCard warning: main list card is soft deleted, attempting to fetch root board info with unscoped list card", err)
			if listcard.RootID == uuid.Nil {
				return &dto.RootBoardListResponse{IsMainListCardSoftDeleted: &isMainListCardSoftDeleted}, nil
			}

			rootResponse, rootErr := s.buildRootBoardResponse(ctx, userID, listcard, &isMainListCardSoftDeleted, nil)
			if rootErr != nil {
				return nil, rootErr
			}
			return rootResponse, nil
		}

		isMainListCardPurged := true
		return &dto.RootBoardListResponse{IsMainListCardPurged: &isMainListCardPurged}, nil
	}

	if listcard.RootID == uuid.Nil {
		return nil, nil
	}

	return s.buildRootBoardResponse(ctx, userID, listcard, nil, nil)
}

func (s *ListCardsService) buildRootBoardResponse(ctx context.Context, userID uuid.UUID, listcard *models.ListCard, mainListCardSoftDeleted *bool, mainListCardPurged *bool) (*dto.RootBoardListResponse, error) {

	rootListcard, err := s.ListCardsRepo.GetListCardByIDTX(ctx, s.db, listcard.RootID, s.IncludeDeleted)
	if err != nil {
		if !isNotFoundError(err) {
			return nil, domainerr.MapRepoErr(err, true)
		}

		rootListcard, err = s.ListCardsRepo.GetListCardByIDTX(ctx, s.db, listcard.RootID, true)
		if err != nil {
			if isNotFoundError(err) {
				isRootPurged := true
				return &dto.RootBoardListResponse{
					IsMainListCardPurged:      mainListCardPurged,
					IsMainListCardSoftDeleted: mainListCardSoftDeleted,
					IsRootPurged:              &isRootPurged,
				}, nil
			}
			return nil, domainerr.MapRepoErr(err, true)
		}

		if rootListcard.DeletedAt.Valid {
			isRootSoftDeleted := true
			board, boardErr := s.resolveRootBoardPayloadBoard(ctx, rootListcard)
			if boardErr != nil {
				return nil, boardErr
			}
			list, listErr := s.ListRepo.GetListMeta(ctx, rootListcard.ListID, s.IncludeDeleted)
			if listErr != nil {
				return nil, domainerr.MapRepoErr(listErr, true)
			}
			boardList, boardListErr := s.resolveRootBoardList(ctx, rootListcard.ListID)
			if boardListErr != nil {
				return nil, boardListErr
			}
			if board == nil || boardList == nil {
				return &dto.RootBoardListResponse{
					IsMainListCardPurged:      mainListCardPurged,
					IsMainListCardSoftDeleted: mainListCardSoftDeleted,
					IsRootSoftDeleted:         &isRootSoftDeleted,
				}, nil
			}

			userBoardResponse, isUserBoardPurged, isUserBoardSoftDeleted, userBoardErr := s.resolveUserBoardResponse(ctx, userID, boardList.BoardID)
			if userBoardErr != nil {
				return nil, userBoardErr
			}

			boardResponse := dto.BoardToResponse(board)
			listResponse := dto.ListToResponse(list)
			boardListResponse := dto.BoardListToResponse(boardList)
			return &dto.RootBoardListResponse{
				IsUserBoardPurged:         isUserBoardPurged,
				IsUserBoardSoftDeleted:    isUserBoardSoftDeleted,
				IsMainListCardPurged:      mainListCardPurged,
				IsMainListCardSoftDeleted: mainListCardSoftDeleted,
				Board:                     &boardResponse,
				List:                      &listResponse,
				BoardList:                 &boardListResponse,
				UserBoard:                 userBoardResponse,
				IsRootSoftDeleted:         &isRootSoftDeleted,
			}, nil
		}

		isRootPurged := true
		return &dto.RootBoardListResponse{
			IsMainListCardPurged:      mainListCardPurged,
			IsMainListCardSoftDeleted: mainListCardSoftDeleted,
			IsRootPurged:              &isRootPurged,
		}, nil
	}
	listID := rootListcard.ListID

	rootBoardList, err := s.resolveRootBoardList(ctx, listID)
	if err != nil {
		return nil, err
	}
	if rootBoardList == nil {
		return nil, nil
	}

	board, err := s.resolveRootBoardPayloadBoard(ctx, rootListcard)
	if err != nil {
		return nil, err
	}
	if board == nil {
		return nil, nil
	}

	list, err := s.ListRepo.GetListMeta(ctx, rootListcard.ListID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	userBoardResponse, isUserBoardPurged, isUserBoardSoftDeleted, err := s.resolveUserBoardResponse(ctx, userID, rootBoardList.BoardID)
	if err != nil {
		return nil, err
	}
	boardResponse := dto.BoardToResponse(board)
	listResponse := dto.ListToResponse(list)
	boardListResponse := dto.BoardListToResponse(rootBoardList)

	response := dto.RootBoardListResponse{
		IsUserBoardPurged:         isUserBoardPurged,
		IsUserBoardSoftDeleted:    isUserBoardSoftDeleted,
		IsMainListCardPurged:      mainListCardPurged,
		IsMainListCardSoftDeleted: mainListCardSoftDeleted,
		Board:                     &boardResponse,
		List:                      &listResponse,
		BoardList:                 &boardListResponse,
		UserBoard:                 userBoardResponse,
	}

	return &response, nil
}

func (s *ListCardsService) resolveRootBoardList(ctx context.Context, listID uuid.UUID) (*models.BoardList, error) {
	boardLists, err := s.BoardListRepo.GetBoardListsByListIdTX(ctx, s.db, listID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	if len(boardLists) == 0 {
		return nil, nil
	}

	if len(boardLists) == 1 {
		return &boardLists[0], nil
	}

	for _, bl := range boardLists {
		if bl.RootID == bl.ID {
			copy := bl
			return &copy, nil
		}
	}

	return nil, nil
}

func (s *ListCardsService) resolveRootBoardPayloadBoard(ctx context.Context, rootListcard *models.ListCard) (*models.Board, error) {
	rootBoardList, err := s.resolveRootBoardList(ctx, rootListcard.ListID)
	if err != nil {
		return nil, err
	}
	if rootBoardList == nil {
		return nil, nil
	}

	board, err := s.BoardsRepo.GetBoardByIDTX(ctx, s.db, rootBoardList.BoardID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	return board, nil
}

func (s *ListCardsService) getBoardListForCardInBoard(ctx context.Context, cardID, boardID uuid.UUID) (*models.BoardList, error) {
	listCard, err := s.ListCardsRepo.GetAnyListCardByCardIDTX(ctx, s.db, cardID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	boardLists, err := s.BoardListRepo.GetBoardListsByListIdTX(ctx, s.db, listCard.ListID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	for i := range boardLists {
		if boardLists[i].BoardID == boardID {
			return &boardLists[i], nil
		}
	}

	return nil, domainerr.ErrNotFound
}

func (s *ListCardsService) DetatchCardFromList(ctx context.Context, userID uuid.UUID, workspaceUUID uuid.UUID, boardID uuid.UUID, listID uuid.UUID, cardID uuid.UUID, correlationID uuid.UUID) ([]uuid.UUID, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}

	listCard, err := s.ListCardsRepo.GetListCardByListAndCardTX(ctx, s.db, listID, cardID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	// collect all IDs to delete: the listcard itself plus all mirror children if it's a root
	idsToDelete := []uuid.UUID{listCard.ID}
	if listCard.ID == listCard.RootID {
		childIDs, err := s.ListCardsRepo.GetListCardsIdsByRootIdsTX(ctx, s.db, []uuid.UUID{listCard.RootID}, s.IncludeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
		seen := map[uuid.UUID]struct{}{listCard.ID: {}}
		for _, id := range childIDs {
			if _, exists := seen[id]; !exists {
				seen[id] = struct{}{}
				idsToDelete = append(idsToDelete, id)
			}
		}
	}

	boardIds, err := s.ResolveBoardIdsForListCardIds(ctx, idsToDelete)
	if err != nil {
		fmt.Println("DetatchCardFromList: resolving board ids failed", err)
		return nil, err
	}

	var deletedListCards []models.ListCard
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		deletedListCards, err = s.ListCardsRepo.GetListCardsByIdsTX(ctx, tx, idsToDelete, false)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}
		_, err = s.ListCardsRepo.BulkDeleteListCardsByIdsTX(ctx, tx, idsToDelete)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}
		return nil
	})
	if err != nil {
		fmt.Println("DetatchCardFromList: transaction failed", err)
		return nil, err
	}

	targets := make([]EventRegistry.TargetRef, 0, len(boardIds))
	for _, bId := range boardIds {
		targets = append(targets, EventRegistry.TargetRef{
			EntityType: "board",
			EntityID:   bId,
		})
	}
	for _, lc := range deletedListCards {
		targets = append(targets, EventRegistry.TargetRef{
			EntityType: "list_card",
			EntityID:   lc.ID,
			BoardID:    &boardID,
		})
	}

	listCardResponses := make([]dto.ListCardResponse, 0, len(deletedListCards))
	for _, lc := range deletedListCards {
		listCardResponses = append(listCardResponses, dto.ListCardToResponse(&lc))
	}

	statePayload := dto.BoardDetailResponse{
		ListCardRelations: listCardResponses,
	}

	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventBoardListCardDetatched,
		BoardID:       &boardID,
		WorkspaceID:   &workspaceUUID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Targets:       targets,
		Payload: EventRegistry.EventPayloadEnvelope{
			StatePayload: &statePayload,
		},
		OccurredAt: time.Now(),
	}
	if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
		fmt.Println("DetatchCardFromList: event emission failed", err)
	}

	return idsToDelete, nil
}

func (s *ListCardsService) BulkDetatchCardsFromList(ctx context.Context, userID uuid.UUID, workspaceUUID uuid.UUID, boardID uuid.UUID, listID uuid.UUID, correlationID uuid.UUID) ([]uuid.UUID, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}

	listcards, err := s.ListCardsRepo.GetCardsInList(ctx, listID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	var scheduledRoots []models.ListCard
	for _, lc := range listcards {
		if lc.ID == lc.RootID {
			scheduledRoots = append(scheduledRoots, lc)
		}
	}

	var idsToDelete map[uuid.UUID]struct{}

	if len(scheduledRoots) > 0 {
		rootIdsMap := make(map[uuid.UUID]struct{}, len(scheduledRoots))
		for _, root := range scheduledRoots {
			rootIdsMap[root.ID] = struct{}{}
		}
		rootIds := make([]uuid.UUID, 0, len(rootIdsMap))
		for rootId := range rootIdsMap {
			rootIds = append(rootIds, rootId)
		}

		childListCardIds, err := s.ListCardsRepo.GetListCardsIdsByRootIdsTX(ctx, s.db, rootIds, s.IncludeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
		idsToDelete = make(map[uuid.UUID]struct{}, len(childListCardIds))
		for _, id := range childListCardIds {
			idsToDelete[id] = struct{}{}
		}

	}

	for _, lc := range listcards {
		idsToDelete[lc.ID] = struct{}{}
	}

	idsToDeleteSlice := make([]uuid.UUID, 0, len(idsToDelete))
	for id := range idsToDelete {
		idsToDeleteSlice = append(idsToDeleteSlice, id)
	}

	boardIds, err := s.ResolveBoardIdsForListCardIds(ctx, idsToDeleteSlice)
	if err != nil {
		fmt.Println("BulkDetatchCardsFromList return: resolving board ids for list cards failed", err)
		return nil, err
	}

	var deletedListCards []models.ListCard
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		deletedListCards, err = s.ListCardsRepo.GetListCardsByIdsTX(ctx, tx, idsToDeleteSlice, false)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}

		_, err = s.ListCardsRepo.BulkDeleteListCardsByIdsTX(ctx, tx, idsToDeleteSlice)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}
		return nil
	})
	if err != nil {
		fmt.Println("BulkDetatchCardsFromList return: transaction failed", err)
		return nil, err
	}

	targets := []EventRegistry.TargetRef{}
	for _, bId := range boardIds {
		targets = append(targets, EventRegistry.TargetRef{
			EntityType: "board",
			EntityID:   bId,
		})
	}
	for _, lc := range deletedListCards {
		targets = append(targets, EventRegistry.TargetRef{
			EntityType: "list_card",
			EntityID:   lc.ID,
			BoardID:    &boardID,
		})
	}

	listCardResponses := make([]dto.ListCardResponse, 0, len(deletedListCards))
	for _, lc := range deletedListCards {
		listCardResponses = append(listCardResponses, dto.ListCardToResponse(&lc))
	}

	statePayload := dto.BoardDetailResponse{
		ListCardRelations: listCardResponses,
	}

	payloadEnvolope := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}

	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventBoardListCardsDetatched,
		BoardID:       &boardID, // board primario per l'audit
		WorkspaceID:   &workspaceUUID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Targets:       targets,
		Payload:       payloadEnvolope,
		OccurredAt:    time.Now(),
	}
	if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
		fmt.Println("BulkDetatchCardsFromList return: event emission failed", err)
	}

	return idsToDeleteSlice, nil
}

func (s *ListCardsService) ResolveBoardIdsForListCardIds(ctx context.Context, listCardIds []uuid.UUID) ([]uuid.UUID, error) {

	listcards, err := s.ListCardsRepo.GetListCardsByIdsTX(ctx, s.db, listCardIds, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	listIdsmap := map[uuid.UUID]struct{}{}
	for _, lc := range listcards {
		listIdsmap[lc.ListID] = struct{}{}
	}
	listIds := make([]uuid.UUID, 0, len(listIdsmap))
	for listId := range listIdsmap {
		listIds = append(listIds, listId)
	}

	boardLists, err := s.BoardListRepo.GetBoardListsByListIdsTX(ctx, s.db, listIds, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	boardIdMap := map[uuid.UUID]struct{}{}
	for _, bl := range boardLists {
		boardIdMap[bl.BoardID] = struct{}{}
	}
	boardIds := make([]uuid.UUID, 0, len(boardIdMap))
	for boardId := range boardIdMap {
		boardIds = append(boardIds, boardId)
	}

	return boardIds, nil
}

// GetListCardsIdsByRootIds returns all list_card IDs (including mirrors) for the given root IDs.
// Used by external services (e.g. links) to resolve cascade deletes.
func (s *ListCardsService) GetListCardsIdsByRootIds(ctx context.Context, rootIDs []uuid.UUID) ([]uuid.UUID, error) {
	return s.ListCardsRepo.GetListCardsIdsByRootIdsTX(ctx, s.db, rootIDs, s.IncludeDeleted)
}

// GetListCardsIdsByRootIdsTX is the transaction-aware variant for use inside an external tx.
func (s *ListCardsService) GetListCardsIdsByRootIdsTX(ctx context.Context, tx *gorm.DB, rootIDs []uuid.UUID) ([]uuid.UUID, error) {
	return s.ListCardsRepo.GetListCardsIdsByRootIdsTX(ctx, tx, rootIDs, s.IncludeDeleted)
}

// GetListCardsByIdsTX fetches list_cards by IDs inside an external transaction.
func (s *ListCardsService) GetListCardsByIdsTX(ctx context.Context, tx *gorm.DB, ids []uuid.UUID, includeDeleted bool) ([]models.ListCard, error) {
	return s.ListCardsRepo.GetListCardsByIdsTX(ctx, tx, ids, includeDeleted)
}

// BulkDeleteListCardsByIDsTX deletes list_cards by IDs inside an external transaction.
// Returns the soft-deleted records.
func (s *ListCardsService) BulkDeleteListCardsByIDsTX(ctx context.Context, tx *gorm.DB, ids []uuid.UUID) ([]models.ListCard, error) {
	return s.ListCardsRepo.BulkDeleteListCardsByIdsTX(ctx, tx, ids)
}

func (s *ListCardsService) GetWorkspaceCardMirrors(ctx context.Context, userID, workspaceID, cardID uuid.UUID) (*MirrorCardsResponse, error) {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, userID, workspaceID, rbac.Viewer, s.IncludeDeleted); err != nil {
		return nil, err
	}

	baseQuery := s.db.WithContext(ctx).Table("list_cards lc").
		Joins("JOIN board_lists bl ON bl.list_id = lc.list_id").
		Joins("JOIN boards b ON b.id = bl.board_id").
		Where("b.workspace_id = ?", workspaceID)

	if s.IncludeDeleted {
		baseQuery = baseQuery.Unscoped()
	} else {
		baseQuery = baseQuery.
			Where("lc.deleted_at IS NULL").
			Where("bl.deleted_at IS NULL").
			Where("b.deleted_at IS NULL")
	}

	seed := &models.ListCard{}
	if err := baseQuery.
		Select("lc.*").
		Where("lc.card_id = ?", cardID).
		Order("lc.created_at ASC").
		Take(seed).Error; err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	rootID := seed.RootID
	if rootID == uuid.Nil {
		rootID = seed.ID
	}

	mirrorQuery := s.db.WithContext(ctx).Table("list_cards lc").
		Joins("JOIN board_lists bl ON bl.list_id = lc.list_id").
		Joins("JOIN boards b ON b.id = bl.board_id").
		Select("lc.*").
		Where("b.workspace_id = ?", workspaceID).
		Where("lc.root_id = ?", rootID)

	if s.IncludeDeleted {
		mirrorQuery = mirrorQuery.Unscoped()
	} else {
		mirrorQuery = mirrorQuery.
			Where("lc.deleted_at IS NULL").
			Where("bl.deleted_at IS NULL").
			Where("b.deleted_at IS NULL")
	}

	listCards := make([]models.ListCard, 0)
	if err := mirrorQuery.Order("lc.created_at ASC").Find(&listCards).Error; err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	if len(listCards) == 0 {
		listCards = append(listCards, *seed)
	}

	listIDSet := make(map[uuid.UUID]struct{}, len(listCards))
	listIDs := make([]uuid.UUID, 0, len(listCards))
	for i := range listCards {
		id := listCards[i].ListID
		if id == uuid.Nil {
			continue
		}
		if _, exists := listIDSet[id]; exists {
			continue
		}
		listIDSet[id] = struct{}{}
		listIDs = append(listIDs, id)
	}

	boardLists := make([]models.BoardList, 0)
	if len(listIDs) > 0 {
		boardListQuery := s.db.WithContext(ctx).Table("board_lists bl").
			Joins("JOIN boards b ON b.id = bl.board_id").
			Select("bl.*").
			Where("bl.list_id IN ?", listIDs).
			Where("b.workspace_id = ?", workspaceID)

		if s.IncludeDeleted {
			boardListQuery = boardListQuery.Unscoped()
		} else {
			boardListQuery = boardListQuery.
				Where("bl.deleted_at IS NULL").
				Where("b.deleted_at IS NULL")
		}

		if err := boardListQuery.Find(&boardLists).Error; err != nil {
			return nil, domainerr.MapRepoErr(err, true)
		}
	}

	boardIDSet := make(map[uuid.UUID]struct{}, len(boardLists))
	boardIDs := make([]uuid.UUID, 0, len(boardLists))
	for i := range boardLists {
		id := boardLists[i].BoardID
		if id == uuid.Nil {
			continue
		}
		if _, exists := boardIDSet[id]; exists {
			continue
		}
		boardIDSet[id] = struct{}{}
		boardIDs = append(boardIDs, id)
	}

	boards := make([]models.Board, 0)
	if len(boardIDs) > 0 {
		boardsQuery := s.db.WithContext(ctx).Table("boards")
		if s.IncludeDeleted {
			boardsQuery = boardsQuery.Unscoped()
		} else {
			boardsQuery = boardsQuery.Where("deleted_at IS NULL")
		}

		if err := boardsQuery.
			Where("id IN ?", boardIDs).
			Where("workspace_id = ?", workspaceID).
			Find(&boards).Error; err != nil {
			return nil, domainerr.MapRepoErr(err, true)
		}
	}

	userBoards := make([]models.UserBoard, 0)
	if len(boardIDs) > 0 {
		userBoardsQuery := s.db.WithContext(ctx).Table("user_boards")
		if s.IncludeDeleted {
			userBoardsQuery = userBoardsQuery.Unscoped()
		} else {
			userBoardsQuery = userBoardsQuery.Where("deleted_at IS NULL")
		}

		if err := userBoardsQuery.
			Where("user_id = ?", userID).
			Where("board_id IN ?", boardIDs).
			Find(&userBoards).Error; err != nil {
			return nil, domainerr.MapRepoErr(err, true)
		}
	}

	lists := make([]models.List, 0)
	if len(listIDs) > 0 {
		listsQuery := s.db.WithContext(ctx).Table("lists")
		if s.IncludeDeleted {
			listsQuery = listsQuery.Unscoped()
		} else {
			listsQuery = listsQuery.Where("deleted_at IS NULL")
		}

		if err := listsQuery.Where("id IN ?", listIDs).Find(&lists).Error; err != nil {
			return nil, domainerr.MapRepoErr(err, true)
		}
	}

	res := &MirrorCardsResponse{
		MirrorDataByListCardID: make(map[uuid.UUID][]MirrorCardData, len(listCards)),
		Boards:                 make([]dto.BoardResponse, 0, len(boards)),
		UserBoards:             make([]dto.UserBoardResponse, 0, len(userBoards)),
		Lists:                  make([]dto.ListResponse, 0, len(lists)),
		BoardLists:             make([]dto.BoardListResponse, 0, len(boardLists)),
		ListCards:              make([]dto.ListCardResponse, 0, len(listCards)),
	}

	userIDByBoardID := make(map[uuid.UUID]uuid.UUID, len(userBoards))
	for i := range userBoards {
		userIDByBoardID[userBoards[i].BoardID] = userBoards[i].UserID
	}

	boardListsByListID := make(map[uuid.UUID][]models.BoardList, len(boardLists))
	for i := range boardLists {
		bl := boardLists[i]
		boardListsByListID[bl.ListID] = append(boardListsByListID[bl.ListID], bl)
	}

	for i := range boards {
		res.Boards = append(res.Boards, dto.BoardToResponse(&boards[i]))
	}
	for i := range userBoards {
		res.UserBoards = append(res.UserBoards, dto.UserBoardToResponse(&userBoards[i]))
	}
	for i := range lists {
		res.Lists = append(res.Lists, dto.ListToResponse(&lists[i]))
	}
	for i := range boardLists {
		res.BoardLists = append(res.BoardLists, dto.BoardListToResponse(&boardLists[i]))
	}
	for i := range listCards {
		if listCards[i].RootID == uuid.Nil {
			listCards[i].RootID = listCards[i].ID
		}
		current := listCards[i]
		res.ListCards = append(res.ListCards, dto.ListCardToResponse(&current))

		mapped := make([]MirrorCardData, 0)
		for _, boardList := range boardListsByListID[current.ListID] {
			mapped = append(mapped, MirrorCardData{
				UserID:      userIDByBoardID[boardList.BoardID],
				BoardID:     boardList.BoardID,
				ListID:      current.ListID,
				BoardListID: boardList.ID,
				ListCardID:  current.ID,
				CardID:      current.CardID,
			})
		}

		sort.Slice(mapped, func(a, b int) bool {
			if mapped[a].BoardID == mapped[b].BoardID {
				return mapped[a].BoardListID.String() < mapped[b].BoardListID.String()
			}
			return mapped[a].BoardID.String() < mapped[b].BoardID.String()
		})

		res.MirrorDataByListCardID[current.ID] = mapped
	}

	return res, nil
}
