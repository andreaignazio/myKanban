package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/models"
	"context"
	"fmt"
)

type LabelHandlerMode string

const (
	LabelHandlerModeCreated     LabelHandlerMode = "created"
	LabelHandlerModeDeleted     LabelHandlerMode = "deleted"
	LabelHandlerModePatched     LabelHandlerMode = "patched"
	LabelHandlerModeCardAdded   LabelHandlerMode = "card_added"
	LabelHandlerModeCardRemoved LabelHandlerMode = "card_removed"
)

type BoardLabelCreatedHandler struct {
	auditRepo auditcontext.Reader
	mode      LabelHandlerMode
}

func NewBoardLabelCreatedHandler(auditRepo auditcontext.Reader) *BoardLabelCreatedHandler {
	return &BoardLabelCreatedHandler{auditRepo: auditRepo, mode: LabelHandlerModeCreated}
}

func NewBoardLabelDeletedHandler(auditRepo auditcontext.Reader) *BoardLabelCreatedHandler {
	return &BoardLabelCreatedHandler{auditRepo: auditRepo, mode: LabelHandlerModeDeleted}
}
func NewBoardLabelPatchedHandler(auditRepo auditcontext.Reader) *BoardLabelCreatedHandler {
	return &BoardLabelCreatedHandler{auditRepo: auditRepo, mode: LabelHandlerModePatched}
}

func NewCardLabelAddedHandler(auditRepo auditcontext.Reader) *BoardLabelCreatedHandler {
	return &BoardLabelCreatedHandler{auditRepo: auditRepo, mode: LabelHandlerModeCardAdded}
}

func NewCardLabelRemovedHandler(auditRepo auditcontext.Reader) *BoardLabelCreatedHandler {
	return &BoardLabelCreatedHandler{auditRepo: auditRepo, mode: LabelHandlerModeCardRemoved}
}

func (h *BoardLabelCreatedHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	statePayload := evt.Payload.StatePayload
	if statePayload == nil || statePayload.BoardLabels == nil {
		return EventBuildResult{}, fmt.Errorf("board.label.created: invalid state payload type")
	}

	actor, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	boardLink := AuditEntityLink{
		EntityType:  "board",
		EntityID:    *evt.BoardID,
		BoardID:     evt.BoardID,
		WorkspaceID: evt.WorkspaceID,
	}

	var card *models.Card
	if h.mode == LabelHandlerModeCardAdded || h.mode == LabelHandlerModeCardRemoved {
		card, err = h.auditRepo.GetCardMeta(ctx, statePayload.CardLabelLinks[0].CardID)
		if err != nil {
			return EventBuildResult{}, err
		}
	}
	var list *models.List
	if h.mode == LabelHandlerModeCardAdded || h.mode == LabelHandlerModeCardRemoved {
		list, err = h.auditRepo.GetListMetaByCardID(ctx, *evt.BoardID, statePayload.CardLabelLinks[0].CardID)
		if err != nil {
			return EventBuildResult{}, err
		}
	}

	var templateKey AuditTemplateKey
	switch h.mode {
	case LabelHandlerModeCreated:
		templateKey = AuditTemplateLabelCreated
	case LabelHandlerModeDeleted:
		templateKey = AuditTemplateLabelDeleted
	case LabelHandlerModePatched:
		templateKey = AuditTemplateLabelPatched
	case LabelHandlerModeCardAdded:
		templateKey = AuditTemplateCardLabelAdded
	case LabelHandlerModeCardRemoved:
		templateKey = AuditTemplateCardLabelRemoved
	}

	params := map[string]interface{}{
		"labelTitle": statePayload.BoardLabels[0].Title,
		"labelColor": statePayload.BoardLabels[0].Color,
	}
	if h.mode == LabelHandlerModeCardAdded || h.mode == LabelHandlerModeCardRemoved {
		params["cardTitle"] = card.Title
		params["listTitle"] = list.Title
	}

	links := map[string]AuditEntityLink{
		"board": boardLink,
	}
	if h.mode == LabelHandlerModeCardAdded || h.mode == LabelHandlerModeCardRemoved {
		cardLink := AuditEntityLink{
			EntityType:  "card",
			EntityID:    card.ID,
			BoardID:     evt.BoardID,
			WorkspaceID: evt.WorkspaceID,
		}
		links["card"] = cardLink
		listLink := AuditEntityLink{
			EntityType:  "list",
			EntityID:    list.ID,
			BoardID:     evt.BoardID,
			WorkspaceID: evt.WorkspaceID,
		}
		links["list"] = listLink
	}

	feed := AuditRenderPayload{
		TemplateKey: templateKey,
		Actor:       *actor,
		Params:      params,

		Links: links,
	}

	boardTarget := TargetRef{
		EntityType: "board",
		EntityID:   *evt.BoardID,
		BoardID:    evt.BoardID,
	}

	targets := []TargetRef{boardTarget}
	if h.mode == LabelHandlerModeCardAdded || h.mode == LabelHandlerModeCardRemoved {
		cardTarget := TargetRef{
			EntityType:  "card",
			EntityID:    card.ID,
			BoardID:     evt.BoardID,
			WorkspaceID: evt.WorkspaceID,
		}
		listTarget := TargetRef{
			EntityType:  "list",
			EntityID:    list.ID,
			BoardID:     evt.BoardID,
			WorkspaceID: evt.WorkspaceID,
		}
		targets = []TargetRef{cardTarget, listTarget}
	}

	var mainEntity MainEntityRef
	if h.mode != LabelHandlerModeCardAdded && h.mode != LabelHandlerModeCardRemoved {
		mainEntity = MainEntityRef{
			EntityType: "board",
			EntityID:   *evt.BoardID,
		}
	} else if h.mode == LabelHandlerModeCardAdded || h.mode == LabelHandlerModeCardRemoved {
		mainEntity = MainEntityRef{
			EntityType: "card",
			EntityID:   card.ID,
		}
	}

	result := EventBuildResult{
		StatePayload: statePayload,
		FeedPayload:  feed,
		Targets:      targets,
		MainEntity:   mainEntity,
	}

	return result, nil

}
