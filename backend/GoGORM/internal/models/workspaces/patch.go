package workspaces

import (
	"GoGORM/internal/actions"
	"GoGORM/internal/authzdto"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/models"
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

func (s *WorkspaceService) PatchWorkspaceProps(ctx context.Context, userID, workspaceID, correlationID uuid.UUID, req PatchWorkspacePropsRequest) (*dto.WorkspaceResponse, error) {
	userworkspace, err := s.WorkspaceRepo.GetUserWorkspace(ctx, userID, workspaceID)

	if err != nil {
		return nil, err
	}
	if userworkspace == nil {
		return nil, domainerr.ErrForbidden
	}
	// Role authorization is currently delegated to the authz flow below.
	// if !rbac.AtLeast(userworkspace.Role, rbac.Admin) {
	// 	return nil, domainerr.ErrForbidden
	// }

	authorization, err := s.authz.AuthorizeRequest(ctx, authzdto.Request{
		UserID:        userID,
		Action:        actions.WorkspacePatch,
		WorkspaceID:   &workspaceID,
		CorrelationID: correlationID,
		Resource: authzdto.ResourceRef{
			ResourceType: authzdto.ResourceTypeWorkspace,
			ResourceID:   workspaceID,
		},
	})

	if err != nil {
		return nil, err
	}
	if !authorization.Authorized {
		return nil, domainerr.ErrForbidden
	}

	workspace, err := s.WorkspaceRepo.GetWorkspaceByID(ctx, workspaceID, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}

	mergedProps, err := dto.MergeNestedProps(req.Props, workspace.Props)
	if err != nil {
		return nil, domainerr.ErrValidation
	}

	jsonProps, err := json.Marshal(mergedProps)
	if err != nil {
		return nil, domainerr.ErrValidation
	}

	updateMap := map[string]any{
		"props": datatypes.JSON(jsonProps),
	}

	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return nil, domainerr.ErrValidation
		}
		updateMap["name"] = name
	}

	if req.Visibility != nil {
		visibility := strings.ToLower(strings.TrimSpace(*req.Visibility))
		switch visibility {
		case string(models.WorkspaceVisibilityPrivate), string(models.WorkspaceVisibilityPublic), string(models.WorkspaceVisibilityWorkspace):
			updateMap["workspace_visibility"] = visibility
		default:
			return nil, domainerr.ErrValidation
		}
	}

	updatedWorkspace, err := s.WorkspaceRepo.PatchWorkspaceByID(ctx, workspaceID, updateMap)
	if err != nil {
		return nil, err
	}

	response := dto.WorkspaceToResponse(updatedWorkspace)
	statePayload := dto.BoardDetailResponse{
		Workspace: &response,
	}
	domainPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	targets := []EventRegistry.TargetRef{
		{
			EntityType: "workspace",
			EntityID:   workspaceID,
		},
	}
	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventWorkspacePatched,
		WorkspaceID:   &workspaceID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       domainPayload,
		OccurredAt:    time.Now(),
		Targets:       targets,
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvent)

	return &response, nil
}
