package EventRegistry

import (
	"GoGORM/internal/dto"
	"GoGORM/internal/ws"
	"context"
	"fmt"

	"github.com/google/uuid"
)

type WorkspaceMemberSuspensionHandler struct{}

func NewWorkspaceMemberSuspensionHandler() *WorkspaceMemberSuspensionHandler {
	return &WorkspaceMemberSuspensionHandler{}
}

func (h *WorkspaceMemberSuspensionHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	if evt.WorkspaceID == nil {
		return EventBuildResult{}, fmt.Errorf("workspace.member.suspension.updated: missing workspaceID")
	}
	statePayload := evt.Payload.StatePayload
	if statePayload == nil || len(statePayload.UserWorkspaceRelations) == 0 {
		return EventBuildResult{}, fmt.Errorf("workspace.member.suspension.updated: missing UserWorkspaceRelations in state payload")
	}

	userPayloadMap := make(map[uuid.UUID]ws.UserEventPayload, len(statePayload.UserWorkspaceRelations))
	for _, uw := range statePayload.UserWorkspaceRelations {
		uwCopy := uw
		userPayloadMap[uw.UserID] = ws.UserEventPayload{
			WorkspaceMemberSuspensionUpdatedPayload: &ws.WorkspaceMemberSuspensionUpdatedPayload{
				UserWorkspace: uwCopy,
			},
		}
	}

	userEventType := ws.EventUserWorkspaceMemberSuspensionUpdated

	feed := AuditRenderPayload{
		TemplateKey: AuditTemplateWorkspaceMemberSuspensionUpdated,
		Params:      map[string]interface{}{},
		Links: map[string]AuditEntityLink{
			"workspace": {
				EntityType:  "workspace",
				EntityID:    *evt.WorkspaceID,
				WorkspaceID: evt.WorkspaceID,
			},
		},
	}

	return EventBuildResult{
		StatePayload: &dto.BoardDetailResponse{
			UserWorkspaceRelations: statePayload.UserWorkspaceRelations,
		},
		FeedPayload:   feed,
		UserPayload:   userPayloadMap,
		UserEventType: &userEventType,
		MainEntity: MainEntityRef{
			EntityType: "workspace",
			EntityID:   *evt.WorkspaceID,
		},
	}, nil
}
