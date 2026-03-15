package EventRegistry

import (
	"GoGORM/internal/dto"
	"context"
	"fmt"
)

type WorkspaceBoardSuspensionHandler struct{}

func NewWorkspaceBoardSuspensionHandler() *WorkspaceBoardSuspensionHandler {
	return &WorkspaceBoardSuspensionHandler{}
}

func (h *WorkspaceBoardSuspensionHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	if evt.WorkspaceID == nil {
		return EventBuildResult{}, fmt.Errorf("workspace.board.suspension.updated: missing workspaceID")
	}
	statePayload := evt.Payload.StatePayload
	if statePayload == nil || len(statePayload.Boards) == 0 {
		return EventBuildResult{}, fmt.Errorf("workspace.board.suspension.updated: missing Boards in state payload")
	}

	feed := AuditRenderPayload{
		TemplateKey: AuditTemplateWorkspaceBoardSuspensionUpdated,
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
			Boards: statePayload.Boards,
		},
		FeedPayload: feed,
		MainEntity: MainEntityRef{
			EntityType: "workspace",
			EntityID:   *evt.WorkspaceID,
		},
	}, nil
}
