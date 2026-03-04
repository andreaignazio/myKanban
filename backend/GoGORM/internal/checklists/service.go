package checklists

import (
	"GoGORM/internal/authz"
	"GoGORM/internal/dbx"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/internal/rank"
	"GoGORM/internal/rbac"
	"GoGORM/models"
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ChecklistsService struct {
	repo           ChecklistsRepo
	db             *gorm.DB
	MembershipRepo MembershipRepo
	PositionHelper PositionHelper
	EventRegistry  *EventRegistry.EventRegistryService
	IncludeDeleted bool
}

func NewChecklistsService(repo ChecklistsRepo, db *gorm.DB, membershipRepo MembershipRepo, positionHelper PositionHelper, eventRegistry *EventRegistry.EventRegistryService) *ChecklistsService {
	return &ChecklistsService{
		repo:           repo,
		db:             db,
		MembershipRepo: membershipRepo,
		PositionHelper: positionHelper,
		EventRegistry:  eventRegistry,
		IncludeDeleted: false,
	}
}

type ChecklistsRepo interface {
	CreateChecklist(ctx context.Context, tx *gorm.DB, checklist *models.Checklist) error
	UpdateChecklist(ctx context.Context, checklistID uuid.UUID, updateMap map[string]any) (*models.Checklist, error)
	UpdateCardChecklist(ctx context.Context, checklistID, cardID uuid.UUID, updateMap map[string]any) (*models.CardChecklist, error)
	DeleteChecklist(ctx context.Context, checklistID uuid.UUID) (*models.Checklist, error)
	DeleteCardChecklist(ctx context.Context, tx *gorm.DB, cardID, checklistID uuid.UUID) (*models.CardChecklist, error)
	CreateCardChecklist(ctx context.Context, tx *gorm.DB, cardChecklist *models.CardChecklist) error
	CreateEntry(ctx context.Context, tx *gorm.DB, entry *models.Entry) error
	CreateChecklistEntry(ctx context.Context, tx *gorm.DB, checklistEntry *models.ChecklistEntry) error
	UpdateEntry(ctx context.Context, entryID uuid.UUID, updateMap map[string]any) (*models.Entry, error)
	UpdateChecklistEntry(ctx context.Context, checklistID, entryID uuid.UUID, updateMap map[string]any) (*models.ChecklistEntry, error)
	DeleteEntry(ctx context.Context, tx *gorm.DB, entryID uuid.UUID) (*models.Entry, error)
	DeleteChecklistEntry(ctx context.Context, tx *gorm.DB, checklistID, entryID uuid.UUID) (*models.ChecklistEntry, error)
	CreateCard(ctx context.Context, tx *gorm.DB, card *models.Card) error
	CreateListCardTX(ctx context.Context, tx *gorm.DB, listCard *models.ListCard) error
	GetCardsInListTX(ctx context.Context, tx *gorm.DB, listID uuid.UUID, includeDeleted bool) ([]models.ListCard, error)
	IsListInBoardTX(ctx context.Context, tx *gorm.DB, boardID, listID uuid.UUID) (bool, error)
	GetCardChecklists(ctx context.Context, cardID uuid.UUID, includeDeleted bool) ([]models.CardChecklist, error)
	GetChecklistEntries(ctx context.Context, checklistID uuid.UUID, includeDeleted bool) ([]models.ChecklistEntry, error)
	GetChecklistByID(ctx context.Context, checklistID uuid.UUID, includeDeleted bool) (*models.Checklist, error)
	GetEntriesByChecklistID(ctx context.Context, checklistID uuid.UUID, includeDeleted bool) ([]models.Entry, error)
}

type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
	AddMemberToChecklistEntry(ctx context.Context, entryMember *models.EntryMember) error
	RemoveMemberFromChecklistEntry(ctx context.Context, entryID, memberID uuid.UUID) (*models.EntryMember, error)
}

type PositionHelper interface {
	ChecklistPosAtCardStart(ctx context.Context, cardID uuid.UUID) (string, error)
	ChecklistPosAtCardEnd(ctx context.Context, cardID uuid.UUID) (string, error)
	ChecklistPosBeforeID(ctx context.Context, cardID, beforeChecklistID uuid.UUID) (string, error)
	EntryPosAtChecklistStart(ctx context.Context, checklistID uuid.UUID) (string, error)
	EntryPosAtChecklistEnd(ctx context.Context, checklistID uuid.UUID) (string, error)
	EntryPosBeforeID(ctx context.Context, checklistID, beforeEntryID uuid.UUID) (string, error)
}

func (s *ChecklistsService) CreateChecklist(ctx context.Context, userID, workspaceID, boardID, cardID, correlationID uuid.UUID, req *CreateChecklistRequest) (*dto.ChecklistResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}

	checklist := &models.Checklist{
		ID:              uuid.New(),
		Title:           req.Title,
		CreatedByUserID: userID,
		CreatedInCardID: cardID,
	}

	cardChecklist := &models.CardChecklist{
		ID:          uuid.New(),
		CardID:      cardID,
		ChecklistID: checklist.ID,
	}
	if req.BeforeID != nil {
		pos, err := s.PositionHelper.ChecklistPosBeforeID(ctx, cardID, *req.BeforeID)
		if err != nil {
			return nil, dbx.WrapDBErr(err, "error generating checklist position")
		}
		cardChecklist.Pos = pos
	} else if req.InsertAt != nil && *req.InsertAt == "start" {
		pos, err := s.PositionHelper.ChecklistPosAtCardStart(ctx, cardID)
		if err != nil {
			return nil, dbx.WrapDBErr(err, "error generating checklist position")
		}
		cardChecklist.Pos = pos
	} else {
		pos, err := s.PositionHelper.ChecklistPosAtCardEnd(ctx, cardID)
		if err != nil {
			return nil, dbx.WrapDBErr(err, "error generating checklist position")
		}
		cardChecklist.Pos = pos
	}

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := s.repo.CreateChecklist(ctx, tx, checklist); err != nil {
			return dbx.WrapDBErr(err, "error creating checklist")
		}
		if err := s.repo.CreateCardChecklist(ctx, tx, cardChecklist); err != nil {
			return dbx.WrapDBErr(err, "error creating card checklist")
		}
		return nil

	})
	if err != nil {
		return nil, err
	}

	checklistResponse := dto.ChecklistToResponse(checklist)
	cardChecklistResponse := dto.CardChecklistToResponse(cardChecklist)

	checklistMap := map[uuid.UUID]dto.ChecklistResponse{
		checklist.ID: checklistResponse,
	}

	statePayload := dto.BoardDetailResponse{
		Checklists:             checklistMap,
		CardChecklistRelations: []dto.CardChecklistResponse{cardChecklistResponse},
	}
	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	cardRef := &EventRegistry.TargetRef{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	checklistRef := &EventRegistry.TargetRef{
		EntityType:  "checklist",
		EntityID:    checklist.ID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}

	domainEvt := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventChecklistCreated,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		Targets:       []EventRegistry.TargetRef{*cardRef, *checklistRef},
		OccurredAt:    time.Now(),
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvt)

	return &checklistResponse, nil

}

func (s *ChecklistsService) CloneChecklist(ctx context.Context, userID, workspaceID, boardID, cardID, correlationID uuid.UUID, req *CloneChecklistRequest) (*CloneChecklistResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}

	_, err := s.repo.GetChecklistByID(ctx, req.ChecklistIDSource, s.IncludeDeleted)
	if err != nil {
		return nil, dbx.WrapDBErr(err, "error fetching source checklist")
	}

	sourceChecklistEntries, err := s.repo.GetChecklistEntries(ctx, req.ChecklistIDSource, s.IncludeDeleted)
	if err != nil {
		return nil, dbx.WrapDBErr(err, "error fetching source checklist entries")
	}

	sourceEntries, err := s.repo.GetEntriesByChecklistID(ctx, req.ChecklistIDSource, s.IncludeDeleted)
	if err != nil {
		return nil, dbx.WrapDBErr(err, "error fetching source entries")
	}

	entryByID := make(map[uuid.UUID]models.Entry, len(sourceEntries))
	for i := range sourceEntries {
		entryByID[sourceEntries[i].ID] = sourceEntries[i]
	}

	checklist := &models.Checklist{
		ID:              uuid.New(),
		Title:           req.NewTitle,
		CreatedByUserID: userID,
		CreatedInCardID: cardID,
	}

	cardChecklist := &models.CardChecklist{
		ID:          uuid.New(),
		CardID:      cardID,
		ChecklistID: checklist.ID,
	}

	pos, err := s.PositionHelper.ChecklistPosAtCardEnd(ctx, cardID)
	if err != nil {
		return nil, dbx.WrapDBErr(err, "error generating checklist position")
	}
	cardChecklist.Pos = pos

	newEntries := make([]models.Entry, 0, len(sourceChecklistEntries))
	newChecklistEntries := make([]models.ChecklistEntry, 0, len(sourceChecklistEntries))

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := s.repo.CreateChecklist(ctx, tx, checklist); err != nil {
			return dbx.WrapDBErr(err, "error creating checklist")
		}
		if err := s.repo.CreateCardChecklist(ctx, tx, cardChecklist); err != nil {
			return dbx.WrapDBErr(err, "error creating card checklist")
		}

		for i := range sourceChecklistEntries {
			sourceChecklistEntry := sourceChecklistEntries[i]
			sourceEntry, ok := entryByID[sourceChecklistEntry.EntryID]
			if !ok {
				continue
			}

			entry := models.Entry{
				ID:              uuid.New(),
				Title:           sourceEntry.Title,
				Done:            sourceEntry.Done,
				DueDate:         sourceEntry.DueDate,
				CreatedByUserID: userID,
			}
			if err := s.repo.CreateEntry(ctx, tx, &entry); err != nil {
				return dbx.WrapDBErr(err, "error creating checklist cloned entry")
			}

			checklistEntry := models.ChecklistEntry{
				ID:          uuid.New(),
				ChecklistID: checklist.ID,
				EntryID:     entry.ID,
				Pos:         sourceChecklistEntry.Pos,
			}
			if err := s.repo.CreateChecklistEntry(ctx, tx, &checklistEntry); err != nil {
				return dbx.WrapDBErr(err, "error creating checklist cloned relation")
			}

			newEntries = append(newEntries, entry)
			newChecklistEntries = append(newChecklistEntries, checklistEntry)
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	checklistResponse := dto.ChecklistToResponse(checklist)
	cardChecklistResponse := dto.CardChecklistToResponse(cardChecklist)
	entriesResponses := dto.EntriesToResponses(newEntries)
	checklistEntriesResponses := dto.ChecklistEntriesToResponses(newChecklistEntries)

	entriesMap := make(map[uuid.UUID]dto.EntryResponse, len(entriesResponses))
	for i := range entriesResponses {
		entry := entriesResponses[i]
		entriesMap[entry.ID] = entry
	}

	statePayload := dto.BoardDetailResponse{
		Checklists: map[uuid.UUID]dto.ChecklistResponse{
			checklist.ID: checklistResponse,
		},
		Entries:                 entriesMap,
		CardChecklistRelations:  []dto.CardChecklistResponse{cardChecklistResponse},
		ChecklistEntryRelations: checklistEntriesResponses,
	}

	realtimePayload := CloneChecklistRealtimePayload{
		CardID:           cardID,
		CardChecklist:    cardChecklistResponse,
		Checklist:        checklistResponse,
		Entries:          entriesResponses,
		ChecklistEntries: checklistEntriesResponses,
	}

	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload:    &statePayload,
		RealtimePayload: realtimePayload,
	}
	cardRef := &EventRegistry.TargetRef{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	checklistRef := &EventRegistry.TargetRef{
		EntityType:  "checklist",
		EntityID:    checklist.ID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}

	domainEvt := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventChecklistCopied,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		Targets:       []EventRegistry.TargetRef{*cardRef, *checklistRef},
		OccurredAt:    time.Now(),
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvt)

	return &CloneChecklistResponse{
		CardID:           cardID,
		CardChecklist:    &cardChecklistResponse,
		Checklist:        &checklistResponse,
		Entries:          entriesResponses,
		ChecklistEntries: checklistEntriesResponses,
	}, nil
}

func (s *ChecklistsService) PatchChecklist(ctx context.Context, userID, workspaceID, boardID, cardID, checklistID, correlationID uuid.UUID, req *PatchChecklistRequest) (*dto.ChecklistResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}

	updateMap := map[string]any{}

	if req.Title != nil {
		updateMap["title"] = *req.Title
	}
	updateMap["updated_at"] = time.Now()

	checklist, err := s.repo.UpdateChecklist(ctx, checklistID, updateMap)
	if err != nil {
		return nil, dbx.WrapDBErr(err, "error updating checklist")
	}
	checklistResponse := dto.ChecklistToResponse(checklist)
	statePayload := dto.BoardDetailResponse{
		Checklists: map[uuid.UUID]dto.ChecklistResponse{
			checklist.ID: checklistResponse,
		},
	}
	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	cardRef := &EventRegistry.TargetRef{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	checklistRef := &EventRegistry.TargetRef{
		EntityType:  "checklist",
		EntityID:    checklist.ID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	domainEvt := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventChecklistPatched,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		Targets:       []EventRegistry.TargetRef{*cardRef, *checklistRef},
		OccurredAt:    time.Now(),
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvt)

	return &checklistResponse, nil

}

func (s *ChecklistsService) MoveChecklist(ctx context.Context, userID, workspaceID, boardID, cardID, checklistID, correlationID uuid.UUID, req *MoveChecklistRequest) (*dto.CardChecklistResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	updateMap := map[string]any{}
	if req.BeforeID != nil {
		pos, err := s.PositionHelper.ChecklistPosBeforeID(ctx, cardID, *req.BeforeID)
		if err != nil {
			return nil, dbx.WrapDBErr(err, "error generating checklist position")
		}
		updateMap["pos"] = pos
	} else if req.InsertAt != nil && *req.InsertAt == "start" {
		pos, err := s.PositionHelper.ChecklistPosAtCardStart(ctx, cardID)
		if err != nil {
			return nil, dbx.WrapDBErr(err, "error generating checklist position")
		}
		updateMap["pos"] = pos
	} else {
		pos, err := s.PositionHelper.ChecklistPosAtCardEnd(ctx, cardID)
		if err != nil {
			return nil, dbx.WrapDBErr(err, "error generating checklist position")
		}
		updateMap["pos"] = pos
	}

	cardChecklist, err := s.repo.UpdateCardChecklist(ctx, cardID, checklistID, updateMap)
	if err != nil {
		return nil, dbx.WrapDBErr(err, "error updating checklist position")
	}
	cardChecklistsInCard, err := s.repo.GetCardChecklists(ctx, cardID, s.IncludeDeleted)
	if err != nil {
		return nil, dbx.WrapDBErr(err, "error fetching card checklists")
	}
	cardChecklistResponse := dto.CardChecklistToResponse(cardChecklist)
	ccInCardResponses := dto.CardChecklistsToResponses(cardChecklistsInCard)
	statePayload := dto.BoardDetailResponse{
		CardChecklistRelations: ccInCardResponses,
	}
	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	cardRef := &EventRegistry.TargetRef{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	checklistRef := &EventRegistry.TargetRef{
		EntityType:  "checklist",
		EntityID:    checklistID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	domainEvt := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventChecklistMoved,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		Targets:       []EventRegistry.TargetRef{*cardRef, *checklistRef},
		OccurredAt:    time.Now(),
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvt)

	return &cardChecklistResponse, nil
}

func (s *ChecklistsService) DeleteChecklist(ctx context.Context, userID, workspaceID, boardID, cardID, checklistID, correlationID uuid.UUID) (*dto.CardChecklistResponse, *dto.ChecklistResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, nil, err
	}

	var checklist *models.Checklist
	var cardChecklist *models.CardChecklist
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var err error
		checklist, err = s.repo.DeleteChecklist(ctx, checklistID)
		if err != nil {
			return dbx.WrapDBErr(err, "error deleting checklist")
		}
		cardChecklist, err = s.repo.DeleteCardChecklist(ctx, tx, cardID, checklistID)
		if err != nil {
			return dbx.WrapDBErr(err, "error deleting card checklist")
		}
		return nil
	})
	if err != nil {
		return nil, nil, dbx.WrapDBErr(err, "error deleting checklist")
	}

	checklistResponse := dto.ChecklistToResponse(checklist)
	cardChecklistResponse := dto.CardChecklistToResponse(cardChecklist)

	statePayload := dto.BoardDetailResponse{
		Checklists: map[uuid.UUID]dto.ChecklistResponse{
			checklistID: checklistResponse,
		},
		CardChecklistRelations: []dto.CardChecklistResponse{cardChecklistResponse},
	}
	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	cardRef := &EventRegistry.TargetRef{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	checklistRef := &EventRegistry.TargetRef{
		EntityType:  "checklist",
		EntityID:    checklist.ID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	domainEvt := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventChecklistDeleted,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		Targets:       []EventRegistry.TargetRef{*cardRef, *checklistRef},
		OccurredAt:    time.Now(),
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvt)

	return &cardChecklistResponse, &checklistResponse, nil
}

func (s *ChecklistsService) CreateChecklistEntry(ctx context.Context, userID, workspaceID, boardID, cardID, checklistID, correlationID uuid.UUID, req *CreateChecklistEntryRequest) (*dto.ChecklistEntryResponse, *dto.EntryResponse, error) {
	//check permissions
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, nil, err
	}

	entry := &models.Entry{
		ID:              uuid.New(),
		Title:           req.Title,
		Done:            false,
		CreatedByUserID: userID,
	}
	checklistEntry := &models.ChecklistEntry{
		ID:          uuid.New(),
		ChecklistID: checklistID,
		EntryID:     entry.ID,
	}

	if req.BeforeID != nil {
		pos, err := s.PositionHelper.EntryPosBeforeID(ctx, checklistID, *req.BeforeID)
		if err != nil {
			return nil, nil, dbx.WrapDBErr(err, "error generating checklist entry position")
		}
		checklistEntry.Pos = pos
	} else if req.InsertAt != nil && *req.InsertAt == "start" {
		pos, err := s.PositionHelper.EntryPosAtChecklistStart(ctx, checklistID)
		if err != nil {
			return nil, nil, dbx.WrapDBErr(err, "error generating checklist entry position")
		}
		checklistEntry.Pos = pos
	} else {
		pos, err := s.PositionHelper.EntryPosAtChecklistEnd(ctx, checklistID)
		if err != nil {
			return nil, nil, dbx.WrapDBErr(err, "error generating checklist entry position")
		}
		checklistEntry.Pos = pos
	}
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {

		if err := s.repo.CreateEntry(ctx, tx, entry); err != nil {
			return dbx.WrapDBErr(err, "error creating entry")
		}

		if err := s.repo.CreateChecklistEntry(ctx, tx, checklistEntry); err != nil {
			return dbx.WrapDBErr(err, "error creating checklist entry")
		}

		return nil
	})
	if err != nil {
		return nil, nil, err
	}

	checklistEntryResponse := dto.ChecklistEntryToResponse(checklistEntry)
	entryResponse := dto.EntryToResponse(entry)
	statePayload := dto.BoardDetailResponse{
		ChecklistEntryRelations: []dto.ChecklistEntryResponse{checklistEntryResponse},

		Entries: map[uuid.UUID]dto.EntryResponse{
			entry.ID: entryResponse,
		},
	}

	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	cardRef := &EventRegistry.TargetRef{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	checklistRef := &EventRegistry.TargetRef{
		EntityType:  "checklist",
		EntityID:    checklistID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	domainEvt := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventChecklistEntryCreated,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		Targets:       []EventRegistry.TargetRef{*cardRef, *checklistRef},
		OccurredAt:    time.Now(),
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvt)

	return &checklistEntryResponse, &entryResponse, nil
}

func (s *ChecklistsService) PatchChecklistEntry(ctx context.Context, userID, workspaceID, boardID, cardID, checklistID, entryID, correlationID uuid.UUID, req *PatchChecklistEntryRequest) (*dto.EntryResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}

	updateMap := map[string]any{}

	if req.Title != nil {

		updateMap["title"] = *req.Title
	}
	if req.Done != nil {

		updateMap["done"] = *req.Done
	}
	if req.DueDate != nil {
		t, err := time.Parse(time.RFC3339, *req.DueDate)
		if err != nil {
			return nil, dbx.WrapDBErr(err, "invalid due date format")
		}

		updateMap["due_date"] = &t
	}

	entry, err := s.repo.UpdateEntry(ctx, entryID, updateMap)
	if err != nil {
		return nil, dbx.WrapDBErr(err, "error updating checklist entry")
	}
	entryResponse := dto.EntryToResponse(entry)
	statePayload := dto.BoardDetailResponse{
		Entries: map[uuid.UUID]dto.EntryResponse{
			entry.ID: entryResponse,
		},
	}
	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	cardRef := &EventRegistry.TargetRef{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	checklistRef := &EventRegistry.TargetRef{
		EntityType:  "checklist",
		EntityID:    checklistID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	domainEvt := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventChecklistEntryPatched,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		Targets:       []EventRegistry.TargetRef{*cardRef, *checklistRef},
		OccurredAt:    time.Now(),
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvt)

	return &entryResponse, nil
}

func (s *ChecklistsService) MoveChecklistEntry(ctx context.Context, userID, workspaceID, boardID, cardID, checklistID, entryID, correlationID uuid.UUID, req *MoveChecklistEntryRequest) (*dto.ChecklistEntryResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	updateMap := map[string]any{}
	if req.BeforeID != nil {
		pos, err := s.PositionHelper.EntryPosBeforeID(ctx, checklistID, *req.BeforeID)
		if err != nil {
			return nil, dbx.WrapDBErr(err, "error generating checklist entry position")
		}
		updateMap["pos"] = pos
	} else if req.InsertAt != nil && *req.InsertAt == "start" {
		pos, err := s.PositionHelper.EntryPosAtChecklistStart(ctx, checklistID)
		if err != nil {
			return nil, dbx.WrapDBErr(err, "error generating checklist entry position")
		}
		updateMap["pos"] = pos
	} else {
		pos, err := s.PositionHelper.EntryPosAtChecklistEnd(ctx, checklistID)
		if err != nil {
			return nil, dbx.WrapDBErr(err, "error generating checklist entry position")
		}
		updateMap["pos"] = pos
	}

	checklistEntry, err := s.repo.UpdateChecklistEntry(ctx, checklistID, entryID, updateMap)
	if err != nil {
		return nil, dbx.WrapDBErr(err, "error updating checklist entry position")
	}
	entriesInChecklist, err := s.repo.GetChecklistEntries(ctx, checklistID, s.IncludeDeleted)
	if err != nil {
		return nil, dbx.WrapDBErr(err, "error fetching checklist entries")
	}
	entriesInChecklistResponses := dto.ChecklistEntriesToResponses(entriesInChecklist)
	checklistEntryResponse := dto.ChecklistEntryToResponse(checklistEntry)
	statePayload := dto.BoardDetailResponse{
		ChecklistEntryRelations: entriesInChecklistResponses,
	}
	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	cardRef := &EventRegistry.TargetRef{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	checklistRef := &EventRegistry.TargetRef{
		EntityType:  "checklist",
		EntityID:    checklistID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	domainEvt := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventChecklistEntryMoved,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		Targets:       []EventRegistry.TargetRef{*cardRef, *checklistRef},
		OccurredAt:    time.Now(),
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvt)

	return &checklistEntryResponse, nil
}

func (s *ChecklistsService) DeleteChecklistEntry(ctx context.Context, userID, workspaceID, boardID, cardID, checklistID, entryID, correlationID uuid.UUID) (*dto.EntryResponse, *dto.ChecklistEntryResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, nil, err
	}
	var entry *models.Entry
	var checklistEntry *models.ChecklistEntry
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var err error
		entry, err = s.repo.DeleteEntry(ctx, tx, entryID)
		if err != nil {
			return dbx.WrapDBErr(err, "error deleting entry")
		}
		checklistEntry, err = s.repo.DeleteChecklistEntry(ctx, tx, checklistID, entryID)
		if err != nil {
			return dbx.WrapDBErr(err, "error deleting checklist entry")
		}
		return nil
	})
	if err != nil {
		return nil, nil, err
	}
	entryResponse := dto.EntryToResponse(entry)
	checklistEntryResponse := dto.ChecklistEntryToResponse(checklistEntry)
	statePayload := dto.BoardDetailResponse{
		Entries: map[uuid.UUID]dto.EntryResponse{
			entry.ID: entryResponse,
		},
		ChecklistEntryRelations: []dto.ChecklistEntryResponse{checklistEntryResponse},
	}
	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	cardRef := &EventRegistry.TargetRef{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	checklistRef := &EventRegistry.TargetRef{
		EntityType:  "checklist",
		EntityID:    checklistID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	domainEvt := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventChecklistEntryDeleted,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		Targets:       []EventRegistry.TargetRef{*cardRef, *checklistRef},
		OccurredAt:    time.Now(),
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvt)
	return &entryResponse, &checklistEntryResponse, nil
}

func (s *ChecklistsService) ConvertChecklistEntryToCard(ctx context.Context, userID, workspaceID, boardID, sourceCardID, checklistID, entryID, correlationID uuid.UUID, req *ConvertChecklistEntryRequest) (*ConvertChecklistEntryResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}

	if req.EntryID != entryID || req.BoardID != boardID {
		return nil, domainerr.ErrValidation
	}

	var deletedEntry *models.Entry
	var deletedChecklistEntry *models.ChecklistEntry
	var newCard *models.Card
	var newListCard *models.ListCard
	var targetListCards []models.ListCard

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var err error

		listBelongsToBoard, err := s.repo.IsListInBoardTX(ctx, tx, req.BoardID, req.ListID)
		if err != nil {
			return dbx.WrapDBErr(err, "error validating target list in board")
		}
		if !listBelongsToBoard {
			return domainerr.ErrValidation
		}

		deletedEntry, err = s.repo.DeleteEntry(ctx, tx, entryID)
		if err != nil {
			return dbx.WrapDBErr(err, "error deleting entry")
		}

		deletedChecklistEntry, err = s.repo.DeleteChecklistEntry(ctx, tx, checklistID, entryID)
		if err != nil {
			return dbx.WrapDBErr(err, "error deleting checklist entry")
		}

		cardsInList, err := s.repo.GetCardsInListTX(ctx, tx, req.ListID, s.IncludeDeleted)
		if err != nil {
			return dbx.WrapDBErr(err, "error reading target list cards")
		}

		generator := rank.NewRankGenerator()
		position := ""
		if len(cardsInList) == 0 {
			position, err = generator.GenerateRankBetween("", "")
			if err != nil {
				return dbx.WrapDBErr(err, "error generating first card position")
			}
		} else {
			idx := -1
			for i := range cardsInList {
				if cardsInList[i].CardID == req.CardID {
					idx = i
					break
				}
			}
			if idx == -1 {
				return domainerr.ErrValidation
			}

			prevPos := cardsInList[idx].Pos
			nextPos := ""
			if idx+1 < len(cardsInList) {
				nextPos = cardsInList[idx+1].Pos
			}
			position, err = generator.GenerateRankBetween(prevPos, nextPos)
			if err != nil {
				return dbx.WrapDBErr(err, "error generating converted card position")
			}
		}

		cardTitle := deletedEntry.Title
		if cardTitle == "" {
			cardTitle = "Checklist entry"
		}

		newCard = &models.Card{
			ID:              uuid.New(),
			Title:           cardTitle,
			Done:            false,
			CreatedByUserID: userID,
			CreatedInListID: req.ListID,
		}
		if err := s.repo.CreateCard(ctx, tx, newCard); err != nil {
			return dbx.WrapDBErr(err, "error creating card from checklist entry")
		}

		newListCard = &models.ListCard{
			ID:     uuid.New(),
			CardID: newCard.ID,
			ListID: req.ListID,
			Pos:    position,
		}
		newListCard.RootID = newListCard.ID

		if err := s.repo.CreateListCardTX(ctx, tx, newListCard); err != nil {
			return dbx.WrapDBErr(err, "error creating listcard from checklist entry")
		}

		targetListCards, err = s.repo.GetCardsInListTX(ctx, tx, req.ListID, s.IncludeDeleted)
		if err != nil {
			return dbx.WrapDBErr(err, "error fetching target list cards")
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	remainingChecklistEntries, err := s.repo.GetChecklistEntries(ctx, checklistID, s.IncludeDeleted)
	if err != nil {
		return nil, dbx.WrapDBErr(err, "error fetching remaining checklist entries")
	}

	listCardIDs := make([]uuid.UUID, 0, len(targetListCards))
	for i := range targetListCards {
		listCardIDs = append(listCardIDs, targetListCards[i].ID)
	}

	entryIDs := make([]uuid.UUID, 0, len(remainingChecklistEntries))
	for i := range remainingChecklistEntries {
		entryIDs = append(entryIDs, remainingChecklistEntries[i].EntryID)
	}

	cardResponse := dto.CardToResponse(newCard)
	listCardResponse := dto.ListCardToResponse(newListCard)
	entryResponse := dto.EntryToResponse(deletedEntry)
	checklistEntryResponse := dto.ChecklistEntryToResponse(deletedChecklistEntry)

	statePayload := dto.BoardDetailResponse{
		Cards: map[uuid.UUID]dto.CardResponse{
			newCard.ID: cardResponse,
		},
		ListCardRelations: []dto.ListCardResponse{listCardResponse},
		Entries: map[uuid.UUID]dto.EntryResponse{
			deletedEntry.ID: entryResponse,
		},
		ChecklistEntryRelations: []dto.ChecklistEntryResponse{checklistEntryResponse},
	}

	realtimePayload := ConvertChecklistEntryRealtimePayload{
		CardID:         newCard.ID,
		ListCardID:     newListCard.ID,
		ListID:         req.ListID,
		ListCardIDs:    listCardIDs,
		ChecklistID:    checklistID,
		EntryIDs:       entryIDs,
		DeletedEntryID: entryID,
	}

	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload:    &statePayload,
		RealtimePayload: realtimePayload,
	}

	domainEvt := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventChecklistEntryConverted,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		Targets: []EventRegistry.TargetRef{
			{EntityType: "card", EntityID: sourceCardID, BoardID: &boardID, WorkspaceID: &workspaceID},
			{EntityType: "checklist", EntityID: checklistID, BoardID: &boardID, WorkspaceID: &workspaceID},
			{EntityType: "list", EntityID: req.ListID, BoardID: &boardID, WorkspaceID: &workspaceID},
			{EntityType: "card", EntityID: newCard.ID, BoardID: &boardID, WorkspaceID: &workspaceID},
		},
		OccurredAt: time.Now(),
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvt)

	return &ConvertChecklistEntryResponse{
		Card:           &cardResponse,
		ListCard:       &listCardResponse,
		ListCardIDs:    listCardIDs,
		ListID:         req.ListID,
		ChecklistID:    checklistID,
		EntryIDs:       entryIDs,
		DeletedEntryID: entryID,
	}, nil
}

func (s *ChecklistsService) AddMemberToChecklistEntry(ctx context.Context, userID, workspaceID, boardID, cardID, checklistID, entryID, memberID, correlationID uuid.UUID) (*dto.EntryMemberResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	entryMember := &models.EntryMember{
		ID:      uuid.New(),
		EntryID: entryID,
		UserID:  memberID,
	}

	if err := s.MembershipRepo.AddMemberToChecklistEntry(ctx, entryMember); err != nil {
		return nil, dbx.WrapDBErr(err, "error adding member to checklist entry")
	}
	entryMemberResponse := dto.EntryMemberToResponse(entryMember)

	statePayload := dto.BoardDetailResponse{
		EntryMembers: []dto.EntryMemberResponse{entryMemberResponse},
	}
	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	cardRef := &EventRegistry.TargetRef{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	checklistRef := &EventRegistry.TargetRef{
		EntityType:  "checklist",
		EntityID:    checklistID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	domainEvt := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventEntryMemberAdded,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		Targets:       []EventRegistry.TargetRef{*cardRef, *checklistRef},
		OccurredAt:    time.Now(),
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvt)

	return &entryMemberResponse, nil
}

func (s *ChecklistsService) RemoveMemberFromChecklistEntry(ctx context.Context, userID, workspaceID, boardID, cardID, checklistID, entryID, memberID, correlationID uuid.UUID) (*dto.EntryMemberResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	entryMember, err := s.MembershipRepo.RemoveMemberFromChecklistEntry(ctx, entryID, memberID)
	if err != nil {
		return nil, dbx.WrapDBErr(err, "error removing member from checklist entry")
	}
	entryMemberResponse := dto.EntryMemberToResponse(entryMember)
	statePayload := dto.BoardDetailResponse{
		EntryMembers: []dto.EntryMemberResponse{entryMemberResponse},
	}
	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	cardRef := &EventRegistry.TargetRef{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	checklistRef := &EventRegistry.TargetRef{
		EntityType:  "checklist",
		EntityID:    checklistID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	domainEvt := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventEntryMemberRemoved,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		Targets:       []EventRegistry.TargetRef{*cardRef, *checklistRef},
		OccurredAt:    time.Now(),
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvt)

	return &entryMemberResponse, nil
}

func (s *ChecklistsService) CrossMoveChecklistEntry(ctx context.Context, userID, workspaceID,
	boardID, cardID, checklistID, entryID, correlationID uuid.UUID, req *CrossMoveChecklistEntryRequest) (map[uuid.UUID][]dto.ChecklistEntryResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}

	var updatedChecklistEntry *models.ChecklistEntry
	if req.TargetChecklistID == checklistID { //Move within the same checklist, treat as a normal move
		var pos string
		var err error
		if req.TargetBeforeID != nil {
			pos, err = s.PositionHelper.EntryPosBeforeID(ctx, checklistID, *req.TargetBeforeID)
			if err != nil {
				return nil, dbx.WrapDBErr(err, "error generating checklist entry position")
			}

		} else if req.InsertAt != nil && *req.InsertAt == "start" {
			pos, err = s.PositionHelper.EntryPosAtChecklistStart(ctx, checklistID)
			if err != nil {
				return nil, dbx.WrapDBErr(err, "error generating checklist entry position")
			}
		} else {
			pos, err = s.PositionHelper.EntryPosAtChecklistEnd(ctx, checklistID)
			if err != nil {
				return nil, dbx.WrapDBErr(err, "error generating checklist entry position")
			}
		}

		updateMap := map[string]any{
			"pos": pos,
		}
		updatedChecklistEntry, err = s.repo.UpdateChecklistEntry(ctx, checklistID, entryID, updateMap)
		if err != nil {
			return nil, dbx.WrapDBErr(err, "error updating checklist entry position")
		}
	} else {
		var pos string
		var err error
		if req.TargetBeforeID != nil {
			pos, err = s.PositionHelper.EntryPosBeforeID(ctx, req.TargetChecklistID, *req.TargetBeforeID)
			if err != nil {
				return nil, dbx.WrapDBErr(err, "error generating checklist entry position")
			}
		} else if req.InsertAt != nil && *req.InsertAt == "start" {
			pos, err = s.PositionHelper.EntryPosAtChecklistStart(ctx, req.TargetChecklistID)
			if err != nil {
				return nil, dbx.WrapDBErr(err, "error generating checklist entry position")
			}
		} else {
			pos, err = s.PositionHelper.EntryPosAtChecklistEnd(ctx, req.TargetChecklistID)
			if err != nil {
				return nil, dbx.WrapDBErr(err, "error generating checklist entry position")
			}
		}
		updateMap := map[string]any{
			"pos":          pos,
			"checklist_id": req.TargetChecklistID,
		}
		updatedChecklistEntry, err = s.repo.UpdateChecklistEntry(ctx, checklistID, entryID, updateMap)
		if err != nil {
			return nil, dbx.WrapDBErr(err, "error updating checklist entry position")
		}
	}

	updatedChecklistEntryResponse := dto.ChecklistEntryToResponse(updatedChecklistEntry)

	entriesInTargetChecklist, err := s.repo.GetChecklistEntries(ctx, req.TargetChecklistID, s.IncludeDeleted)
	if err != nil {
		return nil, dbx.WrapDBErr(err, "error fetching checklist entries")
	}
	entriesInSourceChecklist, err := s.repo.GetChecklistEntries(ctx, checklistID, s.IncludeDeleted)
	if err != nil {
		return nil, dbx.WrapDBErr(err, "error fetching checklist entries")
	}
	entriesInTargetChecklistResponses := dto.ChecklistEntriesToResponses(entriesInTargetChecklist)
	entriesInSourceChecklistResponses := dto.ChecklistEntriesToResponses(entriesInSourceChecklist)
	response := map[uuid.UUID][]dto.ChecklistEntryResponse{
		checklistID:           entriesInSourceChecklistResponses,
		req.TargetChecklistID: entriesInTargetChecklistResponses,
	}

	statePayload := dto.BoardDetailResponse{
		MovedChecklistEntriesByChecklistID: response,
		ChecklistEntryRelations:            []dto.ChecklistEntryResponse{updatedChecklistEntryResponse},
	}
	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	cardRef := &EventRegistry.TargetRef{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	sourceChecklistRef := &EventRegistry.TargetRef{
		EntityType:  "checklist",
		EntityID:    checklistID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	targetChecklistRef := &EventRegistry.TargetRef{
		EntityType:  "checklist",
		EntityID:    req.TargetChecklistID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	targetsRefs := []EventRegistry.TargetRef{*cardRef, *sourceChecklistRef, *targetChecklistRef}
	domainEvt := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventChecklistEntryCrossMoved,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		Targets:       targetsRefs,
		OccurredAt:    time.Now(),
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvt)

	return response, nil
}
