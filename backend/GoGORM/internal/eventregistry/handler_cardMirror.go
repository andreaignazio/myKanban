package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"context"
)

type CardMirrorHandler struct {
	auditRepo auditcontext.Reader
}

func NewCardMirrorHandler(auditRepo auditcontext.Reader) *CardMirrorHandler {
	return &CardMirrorHandler{auditRepo: auditRepo}
}

func (h *CardMirrorHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {

	statePayload := evt.Payload.StatePayload

	actor, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	sourceBoardID := evt.Targets[3].BoardID
	targetBoardID := evt.Targets[2].BoardID
	targetListID := evt.Targets[1].EntityID
	sourceCardID := evt.Targets[0].EntityID

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
