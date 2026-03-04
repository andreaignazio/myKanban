package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/internal/dto"
	"context"
	"fmt"

	"github.com/google/uuid"
)

type BoardListCardMovedHandler struct {
	auditRepo auditcontext.Reader
}

func NewBoardListCardMovedHandler(auditRepo auditcontext.Reader) *BoardListCardMovedHandler {
	return &BoardListCardMovedHandler{auditRepo: auditRepo}
}

func (h *BoardListCardMovedHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	if evt.BoardID == nil || evt.ActorUserID == nil || evt.WorkspaceID == nil {
		return EventBuildResult{}, fmt.Errorf("board.listcard.moved: missing boardID/actorUserID/workspaceID")
	}

	movePayload, ok := evt.Payload.RealtimePayload.(dto.MoveCardEventPayload)
	if !ok {
		movePayloadPtr, okPtr := evt.Payload.RealtimePayload.(*dto.MoveCardEventPayload)
		if !okPtr || movePayloadPtr == nil {
			return EventBuildResult{}, fmt.Errorf("board.listcard.moved: invalid realtime payload")
		}
		movePayload = *movePayloadPtr
	}

	if movePayload.ListCardPatch.ID == uuid.Nil || movePayload.ListCardPatch.CardID == uuid.Nil {
		return EventBuildResult{}, fmt.Errorf("board.listcard.moved: missing listcard/card identifiers")
	}

	fromListID, err := uuid.Parse(movePayload.FromListID)
	if err != nil {
		return EventBuildResult{}, fmt.Errorf("board.listcard.moved: invalid FromListID")
	}
	toListID, err := uuid.Parse(movePayload.ToListID)
	if err != nil {
		return EventBuildResult{}, fmt.Errorf("board.listcard.moved: invalid ToListID")
	}

	actor, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	boardMeta, err := h.auditRepo.GetBoardMeta(ctx, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	fromListMeta, err := h.auditRepo.GetListMeta(ctx, fromListID)
	if err != nil {
		return EventBuildResult{}, err
	}
	toListMeta, err := h.auditRepo.GetListMeta(ctx, toListID)
	if err != nil {
		return EventBuildResult{}, err
	}

	if movePayload.MoveAllCardsInList {
		feed := AuditRenderPayload{
			TemplateKey: AuditTemplateBoardListCardsBulkMoved,
			Actor:       *actor,
			Params: map[string]interface{}{
				"boardName":     boardMeta.Name,
				"fromListTitle": fromListMeta.Title,
				"toListTitle":   toListMeta.Title,
				"movedCount":    movePayload.MovedCount,
			},
			Links: map[string]AuditEntityLink{
				"board": {
					EntityType:  "board",
					EntityID:    *evt.BoardID,
					BoardID:     evt.BoardID,
					WorkspaceID: evt.WorkspaceID,
				},
				"fromList": {
					EntityType:  "list",
					EntityID:    fromListID,
					BoardID:     evt.BoardID,
					WorkspaceID: evt.WorkspaceID,
				},
				"toList": {
					EntityType:  "list",
					EntityID:    toListID,
					BoardID:     evt.BoardID,
					WorkspaceID: evt.WorkspaceID,
				},
			},
		}

		targets := []TargetRef{
			{EntityType: "list", EntityID: fromListID, BoardID: evt.BoardID},
			{EntityType: "list", EntityID: toListID, BoardID: evt.BoardID},
		}

		return EventBuildResult{
			RealtimePayload: movePayload,
			FeedPayload:     feed,
			Targets:         targets,
			MainEntity: MainEntityRef{
				EntityType: "list",
				EntityID:   fromListID,
			},
		}, nil
	}

	cardMeta, err := h.auditRepo.GetCardMeta(ctx, movePayload.ListCardPatch.CardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	feed := AuditRenderPayload{
		TemplateKey: AuditTemplateBoardListCardMoved,
		Actor:       *actor,
		Params: map[string]interface{}{
			"boardName":     boardMeta.Name,
			"cardTitle":     cardMeta.Title,
			"fromListTitle": fromListMeta.Title,
			"toListTitle":   toListMeta.Title,
		},
		Links: map[string]AuditEntityLink{
			"board": {
				EntityType:  "board",
				EntityID:    *evt.BoardID,
				BoardID:     evt.BoardID,
				WorkspaceID: evt.WorkspaceID,
			},
			"card": {
				EntityType:  "card",
				EntityID:    movePayload.ListCardPatch.CardID,
				BoardID:     evt.BoardID,
				WorkspaceID: evt.WorkspaceID,
			},
			"fromList": {
				EntityType:  "list",
				EntityID:    fromListID,
				BoardID:     evt.BoardID,
				WorkspaceID: evt.WorkspaceID,
			},
			"toList": {
				EntityType:  "list",
				EntityID:    toListID,
				BoardID:     evt.BoardID,
				WorkspaceID: evt.WorkspaceID,
			},
		},
	}

	targets := []TargetRef{
		{EntityType: "card", EntityID: movePayload.ListCardPatch.CardID, BoardID: evt.BoardID},
		{EntityType: "list", EntityID: fromListID, BoardID: evt.BoardID},
		{EntityType: "list", EntityID: toListID, BoardID: evt.BoardID},
	}

	return EventBuildResult{
		RealtimePayload: movePayload,
		FeedPayload:     feed,
		Targets:         targets,
		MainEntity: MainEntityRef{
			EntityType: "card",
			EntityID:   movePayload.ListCardPatch.CardID,
		},
	}, nil
}
