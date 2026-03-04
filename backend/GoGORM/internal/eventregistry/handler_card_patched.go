package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/internal/dto"
	"context"
	"fmt"

	"github.com/google/uuid"
)

type CardPatchedHandler struct {
	auditRepo auditcontext.Reader
}

func NewCardPatchedHandler(auditRepo auditcontext.Reader) *CardPatchedHandler {
	return &CardPatchedHandler{auditRepo: auditRepo}
}

func (h *CardPatchedHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	if evt.BoardID == nil || evt.ActorUserID == nil || evt.WorkspaceID == nil {
		return EventBuildResult{}, fmt.Errorf("card.patched: missing boardID/actorUserID/workspaceID")
	}

	if len(evt.Targets) == 0 {
		return EventBuildResult{}, fmt.Errorf("card.patched: missing target card")
	}

	statePayload := evt.Payload.StatePayload
	if statePayload == nil || statePayload.Cards == nil {
		return EventBuildResult{}, fmt.Errorf("card.patched: invalid state payload")
	}
	if statePayload.Lists == nil {
		statePayload.Lists = make(map[uuid.UUID]dto.ListResponse)
	}

	var feed AuditRenderPayload

	feed.TemplateKey = AuditTemplateCardPatched

	board, err := h.auditRepo.GetBoardMeta(ctx, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, nil
	}

	userLite, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, nil
	}

	cardID := evt.Targets[0].EntityID

	list, err := h.auditRepo.GetListMetaByCardID(ctx, *evt.BoardID, cardID)
	if err != nil {
		return EventBuildResult{}, nil
	}
	feed.Params = map[string]interface{}{
		"boardName": board.Name,
		"cardTitle": statePayload.Cards[cardID].Title,
		"listTitle": list.Title,
	}
	feed.Actor = *userLite

	cardLink := AuditEntityLink{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     evt.BoardID,
		WorkspaceID: evt.WorkspaceID,
	}
	baordLink := AuditEntityLink{
		EntityType:  "board",
		EntityID:    *evt.BoardID,
		BoardID:     evt.BoardID,
		WorkspaceID: evt.WorkspaceID,
	}
	listLink := AuditEntityLink{
		EntityType:  "list",
		EntityID:    list.ID,
		BoardID:     evt.BoardID,
		WorkspaceID: evt.WorkspaceID,
	}

	feed.Links = make(map[string]AuditEntityLink)
	feed.Links["card"] = cardLink
	feed.Links["board"] = baordLink
	feed.Links["list"] = listLink

	targets := []TargetRef{
		{
			EntityType: "card",
			EntityID:   cardID,
			BoardID:    evt.BoardID,
		},
		{
			EntityType: "list",
			EntityID:   list.ID,
			BoardID:    evt.BoardID,
		},
	}

	MainEntityRef := MainEntityRef{
		EntityType: "card",
		EntityID:   cardID,
	}

	statePayload.Board = dto.BoardToResponse(board)
	statePayload.Lists[list.ID] = dto.ListToResponse(list)

	buildResult := &EventBuildResult{
		StatePayload: statePayload,
		FeedPayload:  feed,
		Targets:      targets,
		MainEntity:   MainEntityRef,
	}
	return *buildResult, nil
}
