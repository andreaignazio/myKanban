package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"context"
	"fmt"
)

type WorkspaceDeletedHandler struct {
	auditRepo auditcontext.Reader
}

func NewWorkspaceDeletedHandler(auditRepo auditcontext.Reader) *WorkspaceDeletedHandler {
	return &WorkspaceDeletedHandler{auditRepo: auditRepo}
}

func (h *WorkspaceDeletedHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	if evt.WorkspaceID == nil || evt.ActorUserID == nil {
		return EventBuildResult{}, fmt.Errorf("workspace.deleted: missing workspaceID/actorUserID")
	}

	statePayload := evt.Payload.StatePayload
	if statePayload == nil || statePayload.Workspace == nil {
		return EventBuildResult{}, fmt.Errorf("workspace.deleted: invalid state payload")
	}

	actor, err := h.auditRepo.GetUserLiteOnlyWorkspaceRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID)
	if err != nil {
		return EventBuildResult{}, err
	}

	workspaceLink := AuditEntityLink{
		EntityType:  "workspace",
		EntityID:    *evt.WorkspaceID,
		WorkspaceID: evt.WorkspaceID,
	}
	actorLink := AuditEntityLink{
		EntityType:  "user",
		EntityID:    *evt.ActorUserID,
		WorkspaceID: evt.WorkspaceID,
	}

	feed := AuditRenderPayload{
		Actor:       *actor,
		TemplateKey: AuditTemplateWorkspaceDeleted,
		Params: map[string]interface{}{
			"workspaceName": statePayload.Workspace.Name,
		},
		Links: map[string]AuditEntityLink{
			"workspace": workspaceLink,
			"actor":     actorLink,
		},
	}

	return EventBuildResult{
		StatePayload: statePayload,
		FeedPayload:  feed,
		Targets:      evt.Targets,
		MainEntity: MainEntityRef{
			EntityType: "workspace",
			EntityID:   *evt.WorkspaceID,
		},
	}, nil
}
