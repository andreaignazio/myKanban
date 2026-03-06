package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/internal/dto"
	"context"
	"fmt"

	"github.com/google/uuid"
)

type CardMirrorHandler struct {
	auditRepo auditcontext.Reader
}

func NewCardMirrorHandler(auditRepo auditcontext.Reader) *CardMirrorHandler {
	return &CardMirrorHandler{auditRepo: auditRepo}
}

func (h *CardMirrorHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	if evt.BoardID == nil || evt.ActorUserID == nil || evt.WorkspaceID == nil {
		return EventBuildResult{}, fmt.Errorf("card.mirror: missing boardID/actorUserID/workspaceID")
	}
	if len(evt.Targets) < 4 {
		return EventBuildResult{}, fmt.Errorf("card.mirror: invalid targets")
	}

	statePayload := evt.Payload.StatePayload
	if statePayload == nil || len(statePayload.ListCardRelations) == 0 {
		return EventBuildResult{}, fmt.Errorf("card.mirror: invalid state payload")
	}
	if statePayload.Cards == nil {
		statePayload.Cards = make(map[uuid.UUID]dto.CardResponse)
	}

	actor, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	sourceBoardID := evt.Targets[3].BoardID
	targetBoardID := evt.Targets[2].BoardID
	if sourceBoardID == nil || targetBoardID == nil {
		return EventBuildResult{}, fmt.Errorf("card.mirror: missing source/target board references")
	}
	targetListID := evt.Targets[1].EntityID
	sourceCardID := statePayload.ListCardRelations[0].CardID

	sourceBoardMeta, err := h.auditRepo.GetBoardMeta(ctx, *sourceBoardID)
	if err != nil {
		return EventBuildResult{}, err
	}
	targetBoardMeta, err := h.auditRepo.GetBoardMeta(ctx, *targetBoardID)
	if err != nil {
		return EventBuildResult{}, err
	}
	targetListMeta, err := h.auditRepo.GetListMeta(ctx, targetListID)
	if err != nil {
		return EventBuildResult{}, err
	}
	cardMeta, err := h.auditRepo.GetCardMeta(ctx, sourceCardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	cardMetaResponse := dto.CardToResponse(cardMeta)

	sourceBoardLink := AuditEntityLink{
		EntityType:  "board",
		EntityID:    *sourceBoardID,
		BoardID:     sourceBoardID,
		WorkspaceID: evt.WorkspaceID,
	}

	targetBoardLink := AuditEntityLink{
		EntityType:  "board",
		EntityID:    *targetBoardID,
		BoardID:     targetBoardID,
		WorkspaceID: evt.WorkspaceID,
	}

	targetListLink := AuditEntityLink{
		EntityType:  "list",
		EntityID:    targetListID,
		BoardID:     targetBoardID,
		WorkspaceID: evt.WorkspaceID,
	}

	cardLink := AuditEntityLink{
		EntityType:  "card",
		EntityID:    sourceCardID,
		BoardID:     targetBoardID,
		WorkspaceID: evt.WorkspaceID,
	}

	links := map[string]AuditEntityLink{
		"sourceBoard": sourceBoardLink,
		"targetBoard": targetBoardLink,
		"targetList":  targetListLink,
		"card":        cardLink,
	}

	params := map[string]interface{}{
		"cardTitle":       cardMeta.Title,
		"sourceBoardName": sourceBoardMeta.Name,
		"targetBoardName": targetBoardMeta.Name,
		"targetListTitle": targetListMeta.Title,
	}

	templateKey := AuditTemplateCardMirrored

	feed := AuditRenderPayload{
		TemplateKey: templateKey,
		Params:      params,
		Actor:       *actor,
		Links:       links,
	}

	statePayload.Cards[sourceCardID] = cardMetaResponse

	result := EventBuildResult{
		StatePayload: statePayload,
		FeedPayload:  feed,
		Targets:      evt.Targets,
		MainEntity: MainEntityRef{
			EntityType: "card",
			EntityID:   sourceCardID,
		},
	}
	return result, nil
}
