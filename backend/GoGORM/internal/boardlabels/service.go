package BoardLabels

import (
	"GoGORM/internal/authz"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/internal/rbac"
	"GoGORM/models"
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BoardLabelsService struct {
	db             *gorm.DB
	repo           BoardLabelsRepo
	MembershipRepo MembershipRepo
	IncludeDeleted bool
	EventRegistry  *EventRegistry.EventRegistryService
}

func NewBoardLabelsService(db *gorm.DB, repo BoardLabelsRepo, membershipRepo MembershipRepo, includeDeleted bool, eventRegistry *EventRegistry.EventRegistryService) *BoardLabelsService {
	return &BoardLabelsService{
		db:             db,
		repo:           repo,
		MembershipRepo: membershipRepo,
		IncludeDeleted: includeDeleted,
		EventRegistry:  eventRegistry,
	}
}

type BoardLabelsRepo interface {
	GetBoardLabels(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.BoardLabel, error)
	CreateBoardLabel(ctx context.Context, label *models.BoardLabel) error
	DeleteBoardLabel(ctx context.Context, labelID uuid.UUID) (*models.BoardLabel, error)
	PatchBoardLabel(ctx context.Context, labelID uuid.UUID, updates map[string]any) (*models.BoardLabel, error)
	AddLabelToCard(ctx context.Context, link *models.CardLabelLink) error
	GetBoardLabelByID(ctx context.Context, labelID uuid.UUID) (*models.BoardLabel, error)
	RemoveLabelFromCard(ctx context.Context, boardID, cardID, labelID uuid.UUID) (*models.CardLabelLink, error)
}

type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
}

func normalizeOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	if strings.TrimSpace(*value) == "" {
		return nil
	}
	return value
}

func (s *BoardLabelsService) GetBoardLabels(ctx context.Context, userID, workspaceID, boardID, correlationID uuid.UUID) ([]models.BoardLabel, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Viewer, s.IncludeDeleted); err != nil {
		return nil, err
	}

	// Implement the logic to get board labels from the repository
	labels, err := s.repo.GetBoardLabels(ctx, boardID, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}
	return labels, nil
}

func (s *BoardLabelsService) CreateBoardLabel(ctx context.Context, userID, workspaceID, boardID, correlationID uuid.UUID, req CreateBoardLabelRequest) (*models.BoardLabel, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	normalizedTitle := normalizeOptionalString(req.Title)
	if normalizedTitle == nil && req.Color == nil {

		return nil, domainerr.ErrValidation
	}

	// Implement the logic to create a new board label
	label := &models.BoardLabel{
		ID:              uuid.New(),
		BoardID:         boardID,
		CreatedByUserID: userID,
	}
	label.Title = normalizedTitle
	label.Color = req.Color
	if err := s.repo.CreateBoardLabel(ctx, label); err != nil {
		return nil, err
	}
	labelResponse := dto.BoardLabelToResponse(label)
	statePayload := dto.BoardDetailResponse{
		BoardLabels: []dto.BoardLabelResponse{labelResponse},
	}
	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}

	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventBoardLabelCreated,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		Targets:       []EventRegistry.TargetRef{},
		OccurredAt:    time.Now(),
	}
	if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
		// Log the error but do not fail the request since the main operation succeeded
		// You can use a logging library here to log the error with more context
		// For example: log.Errorf("Failed to emit event: %v", err)
	}

	return label, nil
}

func (s *BoardLabelsService) DeleteBoardLabel(ctx context.Context, userID, workspaceID, boardID, labelID, correlationID uuid.UUID) error {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return err
	}
	label, err := s.repo.DeleteBoardLabel(ctx, labelID)
	if err != nil {
		return err
	}
	//deleted := models.BoardLabel{ID: labelID, BoardID: boardID} // Create a minimal struct for the deleted label

	statePayload := dto.BoardDetailResponse{
		BoardLabels: []dto.BoardLabelResponse{dto.BoardLabelToResponse(label)},
	}
	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}

	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventBoardLabelDeleted,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		Targets:       []EventRegistry.TargetRef{},
		OccurredAt:    time.Now(),
	}
	if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
		// Log the error but do not fail the request since the main operation succeeded
		// You can use a logging library here to log the error with more context
		// For example: log.Errorf("Failed to emit event: %v", err)
	}

	return nil
}

func (s *BoardLabelsService) PatchBoardLabel(ctx context.Context,
	userID, workspaceID, boardID, labelID, correlationID uuid.UUID, req PatchBoardLabelRequest) (*dto.BoardLabelResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	if !req.Title.Set && !req.Color.Set {
		return nil, domainerr.ErrValidation
	}
	currentLabel, err := s.repo.GetBoardLabelByID(ctx, labelID)
	if err != nil {
		return nil, err
	}
	if currentLabel.BoardID != boardID {
		return nil, domainerr.ErrValidation
	}

	finalTitle := currentLabel.Title
	finalColor := currentLabel.Color

	updates := make(map[string]any)
	if req.Title.Set {
		normalizedTitle := normalizeOptionalString(req.Title.Value)
		if normalizedTitle == nil {
			updates["title"] = nil
		} else {
			updates["title"] = *normalizedTitle
		}
		finalTitle = normalizedTitle
	}
	if req.Color.Set {
		if req.Color.Value == nil {
			updates["color"] = nil
		} else {
			updates["color"] = *req.Color.Value
		}
		finalColor = req.Color.Value
	}
	if finalTitle == nil && finalColor == nil {
		return nil, domainerr.ErrValidation
	}
	if len(updates) == 0 {
		return nil, domainerr.ErrValidation
	}

	updatedLabel, err := s.repo.PatchBoardLabel(ctx, labelID, updates)
	if err != nil {
		return nil, err
	}
	labelResponse := dto.BoardLabelToResponse(updatedLabel)

	statePayload := dto.BoardDetailResponse{
		BoardLabels: []dto.BoardLabelResponse{labelResponse},
	}
	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventBoardLabelPatched,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		Targets:       []EventRegistry.TargetRef{},
		OccurredAt:    time.Now(),
	}
	if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
		// Log the error but do not fail the request since the main operation succeeded
		// You can use a logging library here to log the error with more context
		// For example: log.Errorf("Failed to emit event: %v", err)
	}

	return &labelResponse, nil
}

func (s *BoardLabelsService) AddLabelToCard(ctx context.Context, userID, workspaceID, boardID, cardID, labelID, correlationID uuid.UUID) (*dto.CardLabelLinkResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	label, err := s.repo.GetBoardLabelByID(ctx, labelID)
	if err != nil {
		fmt.Println("Error getting board label:", err)
		return nil, err
	}
	if label.BoardID != boardID {
		return nil, domainerr.ErrValidation
	}

	link := &models.CardLabelLink{
		ID:           uuid.New(),
		CardID:       cardID,
		BoardID:      boardID,
		BoardLabelID: labelID,
	}

	if err := s.repo.AddLabelToCard(ctx, link); err != nil {
		return nil, err
	}
	linkResponse := dto.CardLabelLinkToResponse(link)
	labelResponse := dto.BoardLabelToResponse(label)

	statePayload := dto.BoardDetailResponse{
		BoardLabels:    []dto.BoardLabelResponse{labelResponse},
		CardLabelLinks: []dto.CardLabelLinkResponse{linkResponse},
	}
	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventCardLabelAdded,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		Targets:       []EventRegistry.TargetRef{},
		OccurredAt:    time.Now(),
	}
	if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
		// Log the error but do not fail the request since the main operation succeeded
		// You can use a logging library here to log the error with more context
		// For example: log.Errorf("Failed to emit event: %v", err)
	}

	return &linkResponse, nil
}

func (s *BoardLabelsService) RemoveLabelFromCard(ctx context.Context, userID, workspaceID, boardID, cardID, labelID, correlationID uuid.UUID) (*dto.CardLabelLinkResponse, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	label, err := s.repo.GetBoardLabelByID(ctx, labelID)
	if err != nil {
		return nil, err
	}
	if label.BoardID != boardID {
		return nil, domainerr.ErrValidation
	}
	link, err := s.repo.RemoveLabelFromCard(ctx, boardID, cardID, labelID)
	if err != nil {
		return nil, err
	}
	linkResponse := dto.CardLabelLinkToResponse(link)
	labelResponse := dto.BoardLabelToResponse(label)

	statePayload := dto.BoardDetailResponse{
		BoardLabels:    []dto.BoardLabelResponse{labelResponse},
		CardLabelLinks: []dto.CardLabelLinkResponse{linkResponse},
	}
	eventPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventCardLabelRemoved,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       eventPayload,
		Targets:       []EventRegistry.TargetRef{},
		OccurredAt:    time.Now(),
	}
	fmt.Println("Emitting event for removing label from card:", domainEvent)
	if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
		fmt.Println("Error emitting event for removing label from card:", err)
		// Log the error but do not fail the request since the main operation succeeded
		// You can use a logging library here to log the error with more context
		// For example: log.Errorf("Failed to emit event: %v", err)
	}

	return &linkResponse, nil
}
