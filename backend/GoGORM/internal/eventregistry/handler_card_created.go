package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/internal/dto"
	"context"
	"fmt"

	"github.com/google/uuid"
)

type CardCreatedHandler struct {
	auditRepo auditcontext.Reader
}

func NewCardCreatedHandler(auditRepo auditcontext.Reader) *CardCreatedHandler {
	return &CardCreatedHandler{auditRepo: auditRepo}
}

func (h *CardCreatedHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	if evt.BoardID == nil || evt.ActorUserID == nil || evt.WorkspaceID == nil {
		return EventBuildResult{}, fmt.Errorf("card.created: missing boardID/actorUserID/workspaceID")
	}

	statePayload := evt.Payload.StatePayload
	if statePayload == nil || statePayload.Cards == nil {
		return EventBuildResult{}, fmt.Errorf("card.created: invalid state payload type")
	}

	feed := evt.Payload.FeedPayload

	if feed.Actor.ID == uuid.Nil {
		actor, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
		if err != nil {
			return EventBuildResult{}, err
		}
		feed.Actor = *actor
	}

	var cardID uuid.UUID
	var cardTitle string
	for id, card := range statePayload.Cards {
		cardID = id
		cardTitle = card.Title
		break
	}
	if cardID == uuid.Nil {
		return EventBuildResult{}, fmt.Errorf("card.created: missing card in state payload")
	}

	var listID uuid.UUID
	if len(statePayload.ListCardRelations) > 0 {
		listID = statePayload.ListCardRelations[0].ListID
	}
	if listID == uuid.Nil {
		return EventBuildResult{}, fmt.Errorf("card.created: missing list relation in state payload")
	}

	listTitle := ""
	listMeta, err := h.auditRepo.GetListMeta(ctx, listID)
	if err != nil {
		return EventBuildResult{}, err
	}
	if listMeta != nil {
		listTitle = listMeta.Title
	}
	boardName := ""
	boardMeta, err := h.auditRepo.GetBoardMeta(ctx, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}
	if boardMeta != nil {
		boardName = boardMeta.Name
	}

	if feed.TemplateKey == "" {
		feed.TemplateKey = AuditTemplateCardCreated
	}
	if feed.Params == nil {
		feed.Params = map[string]interface{}{}
	}
	feed.Params["cardTitle"] = cardTitle
	feed.Params["listTitle"] = listTitle
	feed.Params["boardName"] = boardName

	if feed.Links == nil {
		feed.Links = map[string]AuditEntityLink{}
	}
	feed.Links["board"] = AuditEntityLink{
		EntityType:  "board",
		EntityID:    *evt.BoardID,
		BoardID:     evt.BoardID,
		WorkspaceID: evt.WorkspaceID,
	}
	feed.Links["list"] = AuditEntityLink{
		EntityType:  "list",
		EntityID:    listID,
		BoardID:     evt.BoardID,
		WorkspaceID: evt.WorkspaceID,
	}
	feed.Links["card"] = AuditEntityLink{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     evt.BoardID,
		WorkspaceID: evt.WorkspaceID,
	}

	targets := evt.Targets
	if len(targets) == 0 {
		targets = []TargetRef{
			//{EntityType: "board", EntityID: *evt.BoardID, BoardID: evt.BoardID},
			{EntityType: "list", EntityID: listID, BoardID: evt.BoardID},
			{EntityType: "card", EntityID: cardID, BoardID: evt.BoardID},
		}
	}

	if statePayload.Lists == nil {
		statePayload.Lists = make(map[uuid.UUID]dto.ListResponse)
	}

	statePayload.Board = dto.BoardToResponse(boardMeta)
	statePayload.Lists[listID] = dto.ListToResponse(listMeta)

	return EventBuildResult{
		StatePayload: statePayload,
		FeedPayload:  feed,
		Targets:      targets,
		MainEntity: MainEntityRef{
			EntityType: "card",
			EntityID:   cardID,
		},
	}, nil
}
