package listcards

import (
	"GoGORM/internal/authz"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/internal/rank"
	"GoGORM/internal/rbac"
	"GoGORM/internal/ws"
	"GoGORM/models"
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ListCardsService struct {
	db               *gorm.DB
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
	IncludeDeleted   bool
}

func NewListCardsService(db *gorm.DB, hub *ws.Hub, eventRegistry *EventRegistry.EventRegistryService, listCardsRepo ListCardsRepo, cardsRepo CardsRepo, cardCommentsRepo CardCommentsRepo, cardMembersRepo CardMembersRepo, boardLabelsRepo BoardLabelsRepo, checklistRepo ChecklistRepo, listRepo ListRepo, boardListRepo BoardListRepo, positionHelper PositionHelper, membershipRepo MembershipRepo, capabilitiesRepo CapabilitiesRepo) *ListCardsService {
	return &ListCardsService{db: db, Hub: hub, EventRegistry: eventRegistry, ListCardsRepo: listCardsRepo, CardsRepo: cardsRepo, CardCommentsRepo: cardCommentsRepo, CardMembersRepo: cardMembersRepo, BoardLabelsRepo: boardLabelsRepo, ChecklistRepo: checklistRepo, ListRepo: listRepo, BoardListRepo: boardListRepo, PositionHelper: positionHelper, MembershipRepo: membershipRepo, CapabilitiesRepo: capabilitiesRepo, IncludeDeleted: false}
}

type ListCardsRepo interface {
	CreateCardListTX(ctx context.Context, db *gorm.DB, listCard *models.ListCard) error
	DeleteCardListTX(ctx context.Context, db *gorm.DB, listCard *models.ListCard) error
	GetListCardByListAndCardTX(ctx context.Context, db *gorm.DB, listID, cardID uuid.UUID, includeDeleted bool) (*models.ListCard, error)
	GetAnyListCardByCardIDTX(ctx context.Context, db *gorm.DB, cardID uuid.UUID, includeDeleted bool) (*models.ListCard, error)
	GetCardsInList(ctx context.Context, listID uuid.UUID, includeDeleted bool) ([]models.ListCard, error)
	GetListCardsDetail(ctx context.Context, listID uuid.UUID, includeDeleted bool) ([]ListCardDetail, error)
	GetListCardsByCardIDsTX(ctx context.Context, db *gorm.DB, cardIDs []uuid.UUID, includeDeleted bool) ([]models.ListCard, error)
	BulkUpsertListCardsPosTX(ctx context.Context, db *gorm.DB, listCards []models.ListCard) error
	BulkDeleteListCardsTX(ctx context.Context,
		db *gorm.DB, listID uuid.UUID, cardIDs []uuid.UUID) ([]models.ListCard, error)
	GetListCardByListIDsTX(ctx context.Context, db *gorm.DB, listIDs []uuid.UUID) ([]models.ListCard, error)
	GetListCardsByIDsTX(ctx context.Context, db *gorm.DB, listCardIDs []uuid.UUID, includeDeleted bool) ([]models.ListCard, error)
	UpsertListCardByIdTX(ctx context.Context, db *gorm.DB, listCard *models.ListCard) error
	GetListCardsByRootIDTX(ctx context.Context, db *gorm.DB, rootID uuid.UUID, includeDeleted bool) ([]models.ListCard, error)
}

type CapabilitiesRepo interface {
	CanEditCardInBoard(ctx context.Context, db *gorm.DB, userID, boardID, cardID uuid.UUID, roles []string, includeDeleted bool) (*bool, error)
	CanAccessListInBoard(ctx context.Context, db *gorm.DB,
		userID, boardID, listID uuid.UUID, roles []string, accessMode string, includeDeleted bool) (*bool, error)
}

type CardsRepo interface {
	CreateCard(ctx context.Context, db *gorm.DB, card *models.Card) error
	CreateCardTX(ctx context.Context, tx *gorm.DB, card *models.Card) error
	GetCardByIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) (*models.Card, error)
}

type CardCommentsRepo interface {
	GetCommentsByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.CardComment, error)
	CreateCommentTX(ctx context.Context, tx *gorm.DB, comment *models.CardComment) error
	BulkCreateCommentTX(ctx context.Context, tx *gorm.DB, comments []models.CardComment) error
}

type CardMembersRepo interface {
	GetMembersByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.CardMember, error)
	CreateMemberLinkTX(ctx context.Context, tx *gorm.DB, member *models.CardMember) error
	BulkCreateCardMembersLinkTX(ctx context.Context, tx *gorm.DB, members []models.CardMember) error
}

type BoardLabelsRepo interface {
	GetLabelsByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.CardLabelLink, error)
	GetLabelsByBoardIDTX(ctx context.Context, tx *gorm.DB, boardID uuid.UUID, includeDeleted bool) ([]models.BoardLabel, error)
	CreateLabelLinkTX(ctx context.Context, tx *gorm.DB, link *models.CardLabelLink) error
	BulkCreateLabelsTX(ctx context.Context, tx *gorm.DB, labels []models.BoardLabel) error
	BulkCreateLabelLinksTX(ctx context.Context, tx *gorm.DB, links []models.CardLabelLink) error
}

type ChecklistRepo interface {
	GetChecklistsByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.Checklist, error)
	GetEntriesByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.Entry, error)
	GetCardChecklistsByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.CardChecklist, error)
	GetChecklistEntriesByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.ChecklistEntry, error)
	BulkCreateChecklistsTX(ctx context.Context, tx *gorm.DB, checklists []models.Checklist) error
	BulkCreateEntriesTX(ctx context.Context, tx *gorm.DB, entries []models.Entry) error
	BulkCreateCardChecklistsTX(ctx context.Context, tx *gorm.DB, cardChecklists []models.CardChecklist) error
	BulkCreateChecklistEntriesTX(ctx context.Context, tx *gorm.DB, checklistEntries []models.ChecklistEntry) error
}

type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
}

type ListRepo interface {
	GetListMeta(ctx context.Context, listID uuid.UUID, includeDeleted bool) (*models.List, error)
}

type BoardListRepo interface {
	GetBoardList(ctx context.Context, boardID, listID uuid.UUID, includeDeleted bool) (*models.BoardList, error)
}

type PositionHelper interface {
	CardPosAtListEnd(ctx context.Context, listID uuid.UUID) (string, error)
	CardPosAtListStart(ctx context.Context, listID uuid.UUID) (string, error)
	CardPosAfterID(ctx context.Context, listID, afterID uuid.UUID) (string, error)
	CardPosBeforeID(ctx context.Context, listID, afterID uuid.UUID) (string, error)
	BulkCardPosAfterID(ctx context.Context, cardIDs []uuid.UUID, sourceListId uuid.UUID,
		targetListID, afterID uuid.UUID, isCrossList bool) ([]string, error)
}

func (s *ListCardsService) CreateCardInList(ctx context.Context, userID, workspaceID, boardID, listID uuid.UUID,
	request CreateCardRequest, correlationID uuid.UUID) (*models.Card, *models.ListCard, error) {

	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
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
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
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
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Viewer, s.IncludeDeleted); err != nil {
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

	cardIDSet := make(map[uuid.UUID]struct{}, len(listCardRelations))
	cardIDs := make([]uuid.UUID, 0, len(listCardRelations))
	for _, rel := range listCardRelations {
		if _, ok := cardIDSet[rel.CardID]; ok {
			continue
		}
		cardIDSet[rel.CardID] = struct{}{}
		cardIDs = append(cardIDs, rel.CardID)
	}

	instancesByCardID := make(map[uuid.UUID][]models.ListCard)
	if len(cardIDs) > 0 {
		allInstances, err := s.ListCardsRepo.GetListCardsByCardIDsTX(ctx, s.db, cardIDs, s.IncludeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, true)
		}
		for i := range allInstances {
			lc := allInstances[i]
			instancesByCardID[lc.CardID] = append(instancesByCardID[lc.CardID], lc)
		}
	}

	for i := range listCardRelations {
		rel := &listCardRelations[i]
		if rel.RootID == uuid.Nil {
			rel.RootID = rel.ID
		}
		instances := instancesByCardID[rel.CardID]
		mirrors := make([]uuid.UUID, 0, len(instances))
		for _, inst := range instances {
			if inst.ID == rel.ID {
				continue
			}
			mirrors = append(mirrors, inst.ID)
		}
		rel.Mirrors = mirrors
	}

	return &ListDetailPatchResponse{
		Cards:             cards,
		ListCardRelations: listCardRelations,
	}, nil
}

type listCardMirrorReferenceRow struct {
	BoardListID    uuid.UUID `gorm:"column:board_list_id"`
	BoardID        uuid.UUID `gorm:"column:board_id"`
	WorkspaceID    uuid.UUID `gorm:"column:workspace_id"`
	BoardName      string    `gorm:"column:board_name"`
	IsRootList     bool      `gorm:"column:is_root_list"`
	ListCardID     uuid.UUID `gorm:"column:list_card_id"`
	RootListCardID uuid.UUID `gorm:"column:root_list_card_id"`
	ListID         uuid.UUID `gorm:"column:list_id"`
	ListTitle      string    `gorm:"column:list_title"`
	CardID         uuid.UUID `gorm:"column:card_id"`
	CardTitle      string    `gorm:"column:card_title"`
}

func (s *ListCardsService) GetListCardMirrors(ctx context.Context, userID, boardID, listCardID uuid.UUID) (*ListCardMirrorsResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Viewer, s.IncludeDeleted); err != nil {
		return nil, err
	}

	currentRows, err := s.ListCardsRepo.GetListCardsByIDsTX(ctx, s.db, []uuid.UUID{listCardID}, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	if len(currentRows) == 0 {
		return nil, domainerr.ErrNotFound
	}
	current := currentRows[0]

	if _, err := s.BoardListRepo.GetBoardList(ctx, boardID, current.ListID, s.IncludeDeleted); err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	rootID := current.RootID
	if rootID == uuid.Nil {
		rootID = current.ID
	}

	instances, err := s.ListCardsRepo.GetListCardsByRootIDTX(ctx, s.db, rootID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	if len(instances) == 0 {
		return &ListCardMirrorsResponse{
			RootListCardID:    rootID,
			CurrentListCardID: current.ID,
			Items:             []ListCardMirrorReference{},
		}, nil
	}

	instanceIDs := make([]uuid.UUID, 0, len(instances))
	for i := range instances {
		instanceIDs = append(instanceIDs, instances[i].ID)
	}

	rows := make([]listCardMirrorReferenceRow, 0)
	query := s.db.WithContext(ctx).Table("list_cards lc")
	if s.IncludeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("lc.deleted_at IS NULL").
			Where("bl.deleted_at IS NULL").
			Where("b.deleted_at IS NULL").
			Where("l.deleted_at IS NULL").
			Where("c.deleted_at IS NULL")
	}

	if err := query.
		Select(`
			bl.id AS board_list_id,
			bl.board_id AS board_id,
			b.workspace_id AS workspace_id,
			b.name AS board_name,
			(bl.id = bl.root_id) AS is_root_list,
			lc.id AS list_card_id,
			lc.root_id AS root_list_card_id,
			lc.list_id AS list_id,
			l.title AS list_title,
			lc.card_id AS card_id,
			c.title AS card_title
		`).
		Joins("JOIN board_lists bl ON bl.list_id = lc.list_id").
		Joins("JOIN boards b ON b.id = bl.board_id").
		Joins("JOIN lists l ON l.id = lc.list_id").
		Joins("JOIN cards c ON c.id = lc.card_id").
		Where("lc.id IN ?", instanceIDs).
		Order("b.name ASC, l.title ASC, c.title ASC, lc.created_at ASC, bl.created_at ASC").
		Scan(&rows).Error; err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	items := make([]ListCardMirrorReference, 0, len(rows))
	for i := range rows {
		row := rows[i]
		role, roleErr := s.MembershipRepo.GetUserRole(ctx, userID, row.BoardID, s.IncludeDeleted)
		if roleErr != nil {
			continue
		}
		if _, roleErr = domainerr.ParseAndCheckRole(role, rbac.Viewer); roleErr != nil {
			continue
		}

		resolvedRootID := row.RootListCardID
		if resolvedRootID == uuid.Nil {
			resolvedRootID = row.ListCardID
		}

		items = append(items, ListCardMirrorReference{
			BoardListID:    row.BoardListID,
			BoardID:        row.BoardID,
			WorkspaceID:    row.WorkspaceID,
			BoardName:      row.BoardName,
			IsRootList:     row.IsRootList,
			ListCardID:     row.ListCardID,
			RootListCardID: resolvedRootID,
			ListID:         row.ListID,
			ListTitle:      row.ListTitle,
			CardID:         row.CardID,
			CardTitle:      row.CardTitle,
			IsRoot:         row.ListCardID == rootID,
			IsCurrent:      row.ListCardID == current.ID,
		})
	}

	return &ListCardMirrorsResponse{
		RootListCardID:    rootID,
		CurrentListCardID: current.ID,
		Items:             items,
	}, nil
}

func (s *ListCardsService) CrossMoveCard(ctx context.Context,
	userID, boardID, cardID uuid.UUID,
	req CrossMoveCardRequest,
	correlationID uuid.UUID) (*models.ListCard, *models.ListCard, *dto.MoveCardEventPayload, error) {

	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
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
		s.Hub.BroadCastToBoard(ws.Event{
			Type:    "card.attached",
			BoardID: boardID,
			Payload: dto.BoardDetailResponse{
				ListCardRelations: []dto.ListCardResponse{
					dto.ListCardToResponse(targetListCard),
				},
			},
			TS:            time.Now(),
			CorrelationID: &correlationID,
		})
	}
	return targetListCard, sourceListCard, movePayload, nil
}

func (s *ListCardsService) DetatchCardFromList(ctx context.Context, userID, boardID, listID, cardID uuid.UUID) (*models.ListCard, error) {

	if ok, err := s.CapabilitiesRepo.CanAccessListInBoard(ctx, s.db, userID, boardID, listID, rbac.AllowedAtLeast(rbac.Member), rbac.BoardListEditable.String(), s.IncludeDeleted); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	} else if !*ok {
		return nil, domainerr.ErrForbidden
	}

	listCard := &models.ListCard{
		CardID: cardID,
		ListID: listID,
	}
	err := s.ListCardsRepo.DeleteCardListTX(ctx, s.db, listCard)
	if err != nil {
		fmt.Println("error 4")

		return nil, domainerr.MapRepoErr(err, false)
	}
	return listCard, nil
}

func (s *ListCardsService) BulkDetatchCardsFromList(ctx context.Context, userID, boardID, listID uuid.UUID) ([]models.ListCard, error) {

	if ok, err := s.CapabilitiesRepo.CanAccessListInBoard(ctx, s.db, userID, boardID, listID, rbac.AllowedAtLeast(rbac.Member), rbac.BoardListEditable.String(), s.IncludeDeleted); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	} else if !*ok {
		return nil, domainerr.ErrForbidden
	}

	listCards, err := s.ListCardsRepo.GetCardsInList(ctx, listID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	if len(listCards) == 0 {
		return []models.ListCard{}, nil
	}

	cardIDs := make([]uuid.UUID, 0, len(listCards))
	for i := range listCards {
		cardIDs = append(cardIDs, listCards[i].CardID)
	}

	var detatchedListCards []models.ListCard
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		detatchedListCards, err = s.ListCardsRepo.BulkDeleteListCardsTX(ctx, tx, listID, cardIDs)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return detatchedListCards, nil
}

func (s *ListCardsService) BulkCrossMoveCards(ctx context.Context,
	userID, boardID uuid.UUID, req BulkCrossMoveCardsRequest) ([]models.ListCard, []models.ListCard, error) {

	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
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

	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
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
		listCardsByListID[listID] = listCardResponses
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
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Viewer, s.IncludeDeleted); err != nil {
		return nil, err
	}

	listcards, err := s.ListCardsRepo.GetCardsInList(ctx, listID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	return listcards, nil

}

func (s *ListCardsService) MoveCardToBoard(ctx context.Context, userID, sourceBoardID, cardID uuid.UUID, req MoveCardToBoardRequest) ([]dto.BoardListResponse, *MoveCardToBoardEventData, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, sourceBoardID, rbac.Member, s.IncludeDeleted); err != nil {
		fmt.Println("MoveCardToBoard return: source board role check failed", err)
		return nil, nil, err
	}
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, req.TargetBoardID, rbac.Member, s.IncludeDeleted); err != nil {
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
	listCardPatch := dto.ListCardToResponse(movedListCard)
	listcardMirrors, err := s.ListCardsRepo.GetListCardsByRootIDTX(ctx, s.db, movedListCard.RootID, s.IncludeDeleted)
	if err != nil {
		fmt.Println("MoveCardToBoard return: listcard mirrors lookup failed", err)
		return nil, nil, domainerr.MapRepoErr(err, false)
	}
	mirrorIds := make([]uuid.UUID, 0, len(listcardMirrors))
	for _, mirror := range listcardMirrors {
		if mirror.ID == movedListCard.ID {
			continue
		}
		mirrorIds = append(mirrorIds, mirror.ID)
	}
	listCardPatch.Mirrors = mirrorIds

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
		FromListCards:   sourceResponses,
		ToListCards:     targetResponses,
	}

	fmt.Println("MoveCardToBoard return: success", "boardLists", len(boardLists))
	return boardLists, eventData, nil
}

func (s *ListCardsService) MirrorCardToList(ctx context.Context, userID, workspaceUUID, boardID, cardID uuid.UUID,
	req MirrorCardToListRequest, correlationID uuid.UUID) ([]dto.ListCardResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, req.TargetBoardID, rbac.Member, s.IncludeDeleted); err != nil {
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

	statePayload := dto.BoardDetailResponse{
		Board: dto.BoardResponse{
			ID: boardID,
		},
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
		Type:          EventRegistry.EventCardMirrored,
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

	statePayloadForSourceBoard := dto.BoardDetailResponse{
		Board: dto.BoardResponse{
			ID: boardID,
		},
	}
	domainEventForSourceBoard := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventCardMirrored,
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

func (s *ListCardsService) CopyCardToList(ctx context.Context, userID, workspaceUUID, boardID, cardID uuid.UUID,
	req CopyCardToListRequest, correlationID uuid.UUID) (*models.Card, *models.ListCard, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, nil, err
	}
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, req.TargetBoardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, nil, err
	}
	allowedRoles := rbac.AllowedAtLeast(rbac.Member)
	if ok, err := s.CapabilitiesRepo.CanAccessListInBoard(ctx, s.db,
		userID, req.TargetBoardID, req.TargetListID, allowedRoles, rbac.BoardListEditable.String(), s.IncludeDeleted); err != nil {
		fmt.Println("CopyCardToList return: target list capability check errored", err)
		return nil, nil, domainerr.MapRepoErr(err, false)
	} else if !*ok {
		fmt.Println("CopyCardToList return: target list capability forbidden")
		return nil, nil, domainerr.ErrForbidden
	}

	var position string
	var err error
	if req.BeforeID != nil {
		listcard, err := s.ListCardsRepo.GetListCardByListAndCardTX(ctx, s.db, req.TargetListID, *req.BeforeID, s.IncludeDeleted)
		if err != nil {
			fmt.Println("CopyCardToList return: before-id list-card lookup failed", err)
			return nil, nil, domainerr.MapRepoErr(err, false)
		}
		position, err = s.PositionHelper.CardPosBeforeID(ctx, req.TargetListID, listcard.ID)
		if err != nil {
			fmt.Println("CopyCardToList return: position calculation failed", err)
			return nil, nil, domainerr.MapRepoErr(err, false)
		}
	} else if req.InsertAt != nil && *req.InsertAt == "start" {
		position, err = s.PositionHelper.CardPosAtListStart(ctx, req.TargetListID)
		if err != nil {
			fmt.Println("CopyCardToList return: position at-list-start calculation failed", err)
			return nil, nil, domainerr.MapRepoErr(err, false)
		}
	} else {
		position, err = s.PositionHelper.CardPosAtListEnd(ctx, req.TargetListID)
		if err != nil {
			fmt.Println("CopyCardToList return: position at-list-end calculation failed", err)
			return nil, nil, domainerr.MapRepoErr(err, false)
		}
	}

	var newCard *models.Card
	var newListCard *models.ListCard
	var comments []models.CardComment
	var labels []models.CardLabelLink
	var boardLabels []models.BoardLabel
	var members []models.CardMember
	var cardChecklist []models.CardChecklist
	var checklists []models.Checklist
	var entries []models.Entry
	var checklistEntries []models.ChecklistEntry

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		originalCard, err := s.CardsRepo.GetCardByIDTX(ctx, tx, cardID, s.IncludeDeleted)
		if err != nil {
			return domainerr.MapRepoErr(err, true)
		}
		newCard = &models.Card{
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
			newCard.Title = *req.Title
		}
		if err := s.CardsRepo.CreateCardTX(ctx, tx, newCard); err != nil {
			return domainerr.MapRepoErr(err, false)
		}
		newListCard = &models.ListCard{
			ID:     uuid.New(),
			CardID: newCard.ID,
			ListID: req.TargetListID,
			RootID: uuid.Nil,
			Pos:    position,
		}
		newListCard.RootID = newListCard.ID
		if err := s.ListCardsRepo.CreateCardListTX(ctx, tx, newListCard); err != nil {
			return domainerr.MapRepoErr(err, false)
		}

		if req.KeepComments {
			comments, err = s.CardCommentsRepo.GetCommentsByCardIDTX(ctx, tx, cardID, s.IncludeDeleted)
			if err != nil {
				return domainerr.MapRepoErr(err, false)
			}
			newcomments := make([]models.CardComment, 0, len(comments))
			for _, comment := range comments {
				newComment := models.CardComment{
					ID:              uuid.New(),
					CardID:          newCard.ID,
					CreatedByUserID: comment.CreatedByUserID,
					Content:         comment.Content,
				}
				newcomments = append(newcomments, newComment)
			}
			if err := s.CardCommentsRepo.BulkCreateCommentTX(ctx, tx, newcomments); err != nil {
				return domainerr.MapRepoErr(err, false)
			}
			comments = newcomments
		}

		if req.KeepLabels {
			labels, err = s.BoardLabelsRepo.GetLabelsByCardIDTX(ctx, tx, cardID, s.IncludeDeleted)
			if err != nil {
				return domainerr.MapRepoErr(err, false)
			}
			if req.TargetBoardID != boardID {
				orginalBoardLabels, err := s.BoardLabelsRepo.GetLabelsByBoardIDTX(ctx, tx, boardID, s.IncludeDeleted)
				if err != nil {
					return domainerr.MapRepoErr(err, false)
				}
				newboardlabels := make([]models.BoardLabel, 0, len(orginalBoardLabels))
				newcardlabellinks := make([]models.CardLabelLink, 0, len(labels))
				for _, lbl := range orginalBoardLabels {
					newLabel := models.BoardLabel{
						ID:              uuid.New(),
						BoardID:         req.TargetBoardID,
						Title:           lbl.Title,
						Color:           lbl.Color,
						CreatedByUserID: lbl.CreatedByUserID,
					}
					newboardlabels = append(newboardlabels, newLabel)
					newcardlabel := models.CardLabelLink{
						ID:           uuid.New(),
						CardID:       newCard.ID,
						BoardID:      req.TargetBoardID,
						BoardLabelID: newLabel.ID,
					}
					newcardlabellinks = append(newcardlabellinks, newcardlabel)
				}
				if err := s.BoardLabelsRepo.BulkCreateLabelsTX(ctx, tx, newboardlabels); err != nil {
					return domainerr.MapRepoErr(err, false)
				}
				if err := s.BoardLabelsRepo.BulkCreateLabelLinksTX(ctx, tx, newcardlabellinks); err != nil {
					return domainerr.MapRepoErr(err, false)
				}
				labels = newcardlabellinks
				boardLabels = newboardlabels
			} else {
				newcardlabellinks := make([]models.CardLabelLink, 0, len(labels))
				for _, labelLink := range labels {
					newLabelLink := models.CardLabelLink{
						ID:           uuid.New(),
						CardID:       newCard.ID,
						BoardID:      boardID,
						BoardLabelID: labelLink.BoardLabelID,
					}
					newcardlabellinks = append(newcardlabellinks, newLabelLink)

				}
				if err := s.BoardLabelsRepo.BulkCreateLabelLinksTX(ctx, tx, newcardlabellinks); err != nil {
					return domainerr.MapRepoErr(err, false)
				}
				labels = newcardlabellinks
				boardLabels = nil

			}

			if req.KeepChecklists {
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

				entries = newEntries
				checklists = newChecklists
				cardChecklist = newCardChecklists
				checklistEntries = newChecklistEntries
			}
		}

		if req.KeepMembers {
			members, err = s.CardMembersRepo.GetMembersByCardIDTX(ctx, tx, cardID, s.IncludeDeleted)
			if err != nil {
				return domainerr.MapRepoErr(err, false)
			}
			newmembers := make([]models.CardMember, 0, len(members))
			for _, memberLink := range members {
				newMemberLink := models.CardMember{
					ID:     uuid.New(),
					CardID: newCard.ID,
					UserID: memberLink.UserID,
				}
				newmembers = append(newmembers, newMemberLink)
			}
			if err := s.CardMembersRepo.BulkCreateCardMembersLinkTX(ctx, tx, newmembers); err != nil {
				return domainerr.MapRepoErr(err, false)
			}
			members = newmembers
		}

		return nil
	})

	if err != nil {
		fmt.Println("CopyCardToList return: transaction failed", err)
		return nil, nil, err
	}

	statePayload := dto.BoardDetailResponse{
		Board: dto.BoardResponse{ID: req.TargetBoardID},
		Cards: map[uuid.UUID]dto.CardResponse{
			newCard.ID: dto.CardToResponse(newCard),
		},
		ListCardRelations: []dto.ListCardResponse{
			dto.ListCardToResponse(newListCard),
		},
	}
	if req.KeepComments {
		commentResponses := make([]dto.CardCommentResponse, 0, len(comments))
		for _, comment := range comments {
			commentResponses = append(commentResponses, dto.CardCommentToResponse(&comment))
		}
		statePayload.CardComments = commentResponses
	}
	if req.KeepLabels {
		labelLinkResponses := make([]dto.CardLabelLinkResponse, 0, len(labels))
		for _, labelLink := range labels {
			labelLinkResponses = append(labelLinkResponses, dto.CardLabelLinkToResponse(&labelLink))
		}
		statePayload.CardLabelLinks = labelLinkResponses

		boardLabelResponses := make([]dto.BoardLabelResponse, 0, len(boardLabels))
		for _, boardLabel := range boardLabels {
			boardLabelResponses = append(boardLabelResponses, dto.BoardLabelToResponse(&boardLabel))
		}
		statePayload.BoardLabels = boardLabelResponses
	}
	if req.KeepMembers {
		memberResponses := make([]dto.CardMemberResponse, 0, len(members))
		for _, memberLink := range members {
			memberResponses = append(memberResponses, dto.CardMemberToResponse(&memberLink))
		}
		statePayload.CardMembers = memberResponses
	}
	if req.KeepChecklists {
		checklistResponses := make(map[uuid.UUID]dto.ChecklistResponse, len(checklists))
		for _, checklist := range checklists {
			checklistResponses[checklist.ID] = dto.ChecklistToResponse(&checklist)
		}
		statePayload.Checklists = checklistResponses

		entryResponses := make(map[uuid.UUID]dto.EntryResponse, len(entries))
		for _, entry := range entries {
			entryResponses[entry.ID] = dto.EntryToResponse(&entry)
		}
		statePayload.Entries = entryResponses

		cardChecklistResponses := make([]dto.CardChecklistResponse, 0, len(cardChecklist))
		for _, cc := range cardChecklist {
			cardChecklistResponses = append(cardChecklistResponses, dto.CardChecklistToResponse(&cc))
		}
		statePayload.CardChecklistRelations = cardChecklistResponses
		checklistEntryResponses := make([]dto.ChecklistEntryResponse, 0, len(checklistEntries))
		for _, checklistEntry := range checklistEntries {
			checklistEntryResponses = append(checklistEntryResponses, dto.ChecklistEntryToResponse(&checklistEntry))
		}
		statePayload.ChecklistEntryRelations = checklistEntryResponses
	}

	eventTargets := []EventRegistry.TargetRef{
		{
			EntityType: "card",
			EntityID:   newCard.ID,
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

	return newCard, newListCard, nil
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
