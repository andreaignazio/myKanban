package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/internal/dto"
	"GoGORM/internal/ws"
	"context"
	"fmt"

	"github.com/google/uuid"
)

type WorkspaceMembershipHandlerMode string

const (
	WorkspaceMembershipHandlerModeRoleChanged WorkspaceMembershipHandlerMode = "role_changed"
	WorkspaceMembershipHandlerModeRemoved     WorkspaceMembershipHandlerMode = "removed"
)

type WorkspaceMembershipHandler struct {
	auditRepo auditcontext.Reader
	mode      WorkspaceMembershipHandlerMode
}

func NewWorkspaceMembershipHandlerRoleChanged(auditRepo auditcontext.Reader) *WorkspaceMembershipHandler {
	return &WorkspaceMembershipHandler{auditRepo: auditRepo, mode: WorkspaceMembershipHandlerModeRoleChanged}
}

func NewWorkspaceMembershipHandlerRemoved(auditRepo auditcontext.Reader) *WorkspaceMembershipHandler {
	return &WorkspaceMembershipHandler{auditRepo: auditRepo, mode: WorkspaceMembershipHandlerModeRemoved}
}

func (h *WorkspaceMembershipHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	statePayload := evt.Payload.StatePayload
	if statePayload == nil || statePayload.UserWorkspaceRelations == nil {
		return EventBuildResult{}, fmt.Errorf("workspace.member.role.changed: invalid state payload type")
	}

	actor, err := h.auditRepo.GetUserLiteOnlyWorkspaceRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID)
	if err != nil {
		return EventBuildResult{}, err
	}

	workspaceMeta, err := h.auditRepo.GetWorkspaceMeta(ctx, *evt.WorkspaceID)
	if err != nil {
		return EventBuildResult{}, err
	}
	workspaceMetaResponse := dto.WorkspaceToResponse(workspaceMeta)

	targetUserID := statePayload.UserWorkspaceRelations[0].UserID
	targetUserMeta, err := h.auditRepo.GetUserLiteOnlyWorkspaceRoleByID(ctx, targetUserID, *evt.WorkspaceID)
	if err != nil {
		return EventBuildResult{}, err
	}

	workspaceLink := AuditEntityLink{
		EntityType:  "workspace",
		EntityID:    *evt.WorkspaceID,
		WorkspaceID: evt.WorkspaceID,
	}

	targetUserLink := AuditEntityLink{
		EntityType:  "user",
		EntityID:    statePayload.UserWorkspaceRelations[0].UserID,
		WorkspaceID: evt.WorkspaceID,
	}

	actorLink := AuditEntityLink{
		EntityType:  "user",
		EntityID:    *evt.ActorUserID,
		WorkspaceID: evt.WorkspaceID,
	}

	links := map[string]AuditEntityLink{
		"workspace":   workspaceLink,
		"target_user": targetUserLink,
		"actor":       actorLink,
	}

	params := map[string]any{
		"new_role":           statePayload.UserWorkspaceRelations[0].Role,
		"workspaceName":      workspaceMeta.Name,
		"targetUserUsername": targetUserMeta.Username,
		"targetUserName":     targetUserMeta.Name,
	}

	userPayload := ws.WorkspaceMembershipPayload{
		UserID:        targetUserID,
		Workspace:     workspaceMetaResponse,
		UserWorkspace: statePayload.UserWorkspaceRelations[0],
	}
	userPayloadMap := map[uuid.UUID]ws.UserEventPayload{
		targetUserID: {
			WorkspaceMembershipPayload: &userPayload,
		},
	}

	var templateKey AuditTemplateKey
	isSelfAction := targetUserID == *evt.ActorUserID
	switch h.mode {
	case WorkspaceMembershipHandlerModeRoleChanged:
		templateKey = AuditTemplateWorkspaceMemberRoleChanged
	case WorkspaceMembershipHandlerModeRemoved:
		templateKey = AuditTemplateWorkspaceMemberRemoved
	default:
		return EventBuildResult{}, fmt.Errorf("workspace.member.role.changed: invalid handler mode")
	}
	if isSelfAction {
		switch h.mode {
		case WorkspaceMembershipHandlerModeRoleChanged:
			templateKey = AuditTemplateWorkspaceMemberRoleChangedSelf
		case WorkspaceMembershipHandlerModeRemoved:
			templateKey = AuditTemplateWorkspaceMemberRemovedSelf
		}
	}

	feed := AuditRenderPayload{
		TemplateKey: templateKey,
		Actor:       *actor,
		Params:      params,
		Links:       links,
	}

	result := EventBuildResult{

		StatePayload: statePayload,
		FeedPayload:  feed,
		Targets:      evt.Targets,
		MainEntity: MainEntityRef{
			EntityType: "workspace",
			EntityID:   *evt.WorkspaceID,
		},
		UserPayload: userPayloadMap,
	}

	return result, nil
}
