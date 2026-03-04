package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/internal/dto"
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

type BoardPatchedHandler struct {
	auditRepo auditcontext.Reader
}

func NewBoardPatchedHandler(auditRepo auditcontext.Reader) *BoardPatchedHandler {
	return &BoardPatchedHandler{auditRepo: auditRepo}
}

func (h *BoardPatchedHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	if evt.BoardID == nil || evt.ActorUserID == nil || evt.WorkspaceID == nil {
		return EventBuildResult{}, fmt.Errorf("board.patched: missing boardID/actorUserID/workspaceID")
	}

	statePayload := evt.Payload.StatePayload
	if statePayload == nil || statePayload.Board.ID == uuid.Nil {
		return EventBuildResult{}, fmt.Errorf("board.patched: invalid state payload")
	}

	actor, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	changedFields := []string{}
	switch payload := evt.Payload.RealtimePayload.(type) {
	case dto.BoardPatchedEventPayload:
		changedFields = payload.ChangedFields
	case *dto.BoardPatchedEventPayload:
		if payload != nil {
			changedFields = payload.ChangedFields
		}
	case map[string]interface{}:
		if raw, ok := payload["ChangedFields"]; ok {
			switch values := raw.(type) {
			case []string:
				changedFields = values
			case []interface{}:
				for _, value := range values {
					if field, ok := value.(string); ok {
						changedFields = append(changedFields, field)
					}
				}
			}
		}
	}

	if len(changedFields) == 0 {
		changedFields = []string{"board settings"}
	}

	links := map[string]AuditEntityLink{
		"board": {
			EntityType:  "board",
			EntityID:    *evt.BoardID,
			BoardID:     evt.BoardID,
			WorkspaceID: evt.WorkspaceID,
		},
		"actor": {
			EntityType:  "user",
			EntityID:    *evt.ActorUserID,
			BoardID:     evt.BoardID,
			WorkspaceID: evt.WorkspaceID,
		},
	}

	params := map[string]interface{}{
		"boardName":     statePayload.Board.Name,
		"changedFields": strings.Join(changedFields, ", "),
	}

	feed := AuditRenderPayload{
		Actor:       *actor,
		TemplateKey: AuditTemplateBoardPatched,
		Params:      params,
		Links:       links,
	}

	return EventBuildResult{
		StatePayload: statePayload,
		FeedPayload:  feed,
		Targets:      evt.Targets,
		MainEntity: MainEntityRef{
			EntityType: "board",
			EntityID:   *evt.BoardID,
		},
	}, nil
}
