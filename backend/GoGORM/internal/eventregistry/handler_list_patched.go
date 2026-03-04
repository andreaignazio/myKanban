package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"context"
	"fmt"
)

type ListPatchedHandler struct {
	auditRepo auditcontext.Reader
}

func NewListPatchedHandler(auditRepo auditcontext.Reader) *ListPatchedHandler {
	return &ListPatchedHandler{auditRepo: auditRepo}
}

func (h *ListPatchedHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	if evt.BoardID == nil || evt.ActorUserID == nil || evt.WorkspaceID == nil {
		return EventBuildResult{}, fmt.Errorf("list.patched: missing boardID/actorUserID/workspaceID")
	}

	statePayload := evt.Payload.StatePayload
	if statePayload == nil || statePayload.Lists == nil {
		return EventBuildResult{}, fmt.Errorf("list.patched: invalid state payload")
	}

	templateKey := AuditTemplateListPatched

	board, err := h.auditRepo.GetBoardMeta(ctx, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, nil
	}

	listMeta := statePayload.Lists[evt.Targets[0].EntityID]

	actor, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, nil
	}

	params := map[string]interface{}{
		"boardName": board.Name,
		"listTitle": listMeta.Title,
		"actorName": actor.Name,
	}

	feed := AuditRenderPayload{
		Actor:       *actor,
		TemplateKey: templateKey,
		Params:      params,
	}

	result := EventBuildResult{
		StatePayload: statePayload,
		FeedPayload:  feed,
		Targets:      evt.Targets,
		MainEntity: MainEntityRef{
			EntityType: "list",
			EntityID:   evt.Targets[0].EntityID,
		},
	}
	return result, nil
}
