package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/internal/dto"
	"context"
	"fmt"

	"github.com/google/uuid"
)

type BoardListCardsDetatchedHandler struct {
	auditRepo auditcontext.Reader
}

func NewBoardListCardsDetatchedHandler(auditRepo auditcontext.Reader) *BoardListCardsDetatchedHandler {
	return &BoardListCardsDetatchedHandler{auditRepo: auditRepo}
}

func (h *BoardListCardsDetatchedHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	if evt.BoardID == nil || evt.ActorUserID == nil || evt.WorkspaceID == nil {
		return EventBuildResult{}, fmt.Errorf("board.listcards.detatched: missing boardID/actorUserID/workspaceID")
	}

	payload, ok := evt.Payload.RealtimePayload.(dto.BulkDetatchListCardsEventPayload)
	if !ok {
		payloadPtr, okPtr := evt.Payload.RealtimePayload.(*dto.BulkDetatchListCardsEventPayload)
		if !okPtr || payloadPtr == nil {
			return EventBuildResult{}, fmt.Errorf("board.listcards.detatched: invalid realtime payload")
		}
		payload = *payloadPtr
	}

	listID, err := uuid.Parse(payload.ListID)
	if err != nil {
		return EventBuildResult{}, fmt.Errorf("board.listcards.detatched: invalid list id")
	}

	actor, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	boardMeta, err := h.auditRepo.GetBoardMeta(ctx, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	listMeta, err := h.auditRepo.GetListMeta(ctx, listID)
	if err != nil {
		return EventBuildResult{}, err
	}

	feed := AuditRenderPayload{
		TemplateKey: AuditTemplateBoardListCardsBulkDetatched,
		Actor:       *actor,
		Params: map[string]interface{}{
			"boardName":      boardMeta.Name,
			"listTitle":      listMeta.Title,
			"detatchedCount": payload.DetatchedCount,
		},
		Links: map[string]AuditEntityLink{
			"board": {
				EntityType:  "board",
				EntityID:    *evt.BoardID,
				BoardID:     evt.BoardID,
				WorkspaceID: evt.WorkspaceID,
			},
			"list": {
				EntityType:  "list",
				EntityID:    listID,
				BoardID:     evt.BoardID,
				WorkspaceID: evt.WorkspaceID,
			},
		},
	}

	targets := []TargetRef{{EntityType: "list", EntityID: listID, BoardID: evt.BoardID}}

	return EventBuildResult{
		RealtimePayload: payload,
		FeedPayload:     feed,
		Targets:         targets,
		MainEntity: MainEntityRef{
			EntityType: "list",
			EntityID:   listID,
		},
	}, nil
}
