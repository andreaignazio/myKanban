package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"context"
	"fmt"
)

type WorkspacePatchedHandler struct {
	auditRepo auditcontext.Reader
}

func NewWorkspacePatchedHandler(auditRepo auditcontext.Reader) *WorkspacePatchedHandler {
	return &WorkspacePatchedHandler{auditRepo: auditRepo}
}

func (h *WorkspacePatchedHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	if evt.WorkspaceID == nil || evt.ActorUserID == nil {
		return EventBuildResult{}, fmt.Errorf("workspace.patched: missing workspaceID/actorUserID")
	}

	statePayload := evt.Payload.StatePayload
	if statePayload == nil || statePayload.Workspace == nil {
		return EventBuildResult{}, fmt.Errorf("workspace.patched: invalid state payload type")
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

	links := map[string]AuditEntityLink{
		"workspace": workspaceLink,
		"actor":     actorLink,
	}

	params := map[string]interface{}{
		"workspaceName": statePayload.Workspace.Name,
	}

	feed := AuditRenderPayload{
		Actor:       *actor,
		TemplateKey: AuditTemplateWorkspacePatched,
		Params:      params,
		Links:       links,
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
