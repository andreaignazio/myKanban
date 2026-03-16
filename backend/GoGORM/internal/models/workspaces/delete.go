package workspaces

import (
	"GoGORM/internal/actions"
	"GoGORM/internal/authzdto"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/models"
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func (s *WorkspaceService) DeleteWorkspace(ctx context.Context, userID, workspaceID, correlationID uuid.UUID) (*dto.WorkspaceResponse, error) {
	userWorkspace, err := s.WorkspaceRepo.GetUserWorkspace(ctx, userID, workspaceID)
	if err != nil {
		return nil, err
	}
	if userWorkspace == nil {
		return nil, domainerr.ErrForbidden
	}

	authorization, err := s.authz.AuthorizeRequest(ctx, authzdto.Request{
		UserID:        userID,
		Action:        actions.WorkspaceDelete,
		CorrelationID: correlationID,
		Payload: authzdto.RequestPayload{
			WorkspaceDeletePayload: &authzdto.WorkspaceDeletePayload{
				WorkspaceID: workspaceID,
			},
		},
	})
	if err != nil {
		return nil, err
	}
	if !authorization.Authorized {
		return nil, domainerr.ErrForbidden
	}

	var deletedWorkspace *models.Workspace
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var txErr error
		if txErr = s.WorkspaceRepo.SoftDeleteWorkspaceBoardsTX(ctx, tx, workspaceID); txErr != nil {
			return txErr
		}
		deletedWorkspace, txErr = s.WorkspaceRepo.SoftDeleteWorkspaceTX(ctx, tx, workspaceID)
		return txErr
	})
	if err != nil {
		return nil, err
	}
	if deletedWorkspace == nil {
		return nil, domainerr.ErrNotFound
	}

	response := dto.WorkspaceToResponse(deletedWorkspace)
	statePayload := dto.BoardDetailResponse{
		Workspace: &response,
	}
	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventWorkspaceDeleted,
		WorkspaceID:   &workspaceID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       EventRegistry.EventPayloadEnvelope{StatePayload: &statePayload},
		OccurredAt:    time.Now(),
		Targets: []EventRegistry.TargetRef{
			{EntityType: "workspace", EntityID: workspaceID},
		},
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvent)

	return &response, nil
}
