package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"context"
)

type CardCommentHandlerMode string

const (
	CardCommentHandlerModeCreated CardCommentHandlerMode = "created"
	CardCommentHandlerModeDeleted CardCommentHandlerMode = "deleted"
	CardCommentHandlerModeEdited  CardCommentHandlerMode = "edited"
)

type CardCommentHandler struct {
	auditRepo auditcontext.Reader
	mode      CardCommentHandlerMode
}

func NewCardCommentCreatedHandler(auditRepo auditcontext.Reader) *CardCommentHandler {
	return &CardCommentHandler{
		auditRepo: auditRepo,
		mode:      CardCommentHandlerModeCreated,
	}
}

func NewCardCommentDeletedHandler(auditRepo auditcontext.Reader) *CardCommentHandler {
	return &CardCommentHandler{
		auditRepo: auditRepo,
		mode:      CardCommentHandlerModeDeleted,
	}
}

func NewCardCommentEditedHandler(auditRepo auditcontext.Reader) *CardCommentHandler {
	return &CardCommentHandler{
		auditRepo: auditRepo,
		mode:      CardCommentHandlerModeEdited,
	}
}

func (h *CardCommentHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	statePayload := evt.Payload.StatePayload
	if statePayload == nil || len(statePayload.CardComments) == 0 {
		return EventBuildResult{}, nil
	}
	actor, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}
	cardID := evt.Targets[0].EntityID
	boardMeta, err := h.auditRepo.GetBoardMeta(ctx, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}
	listMeta, err := h.auditRepo.GetListMetaByCardID(ctx, *evt.BoardID, cardID)
	if err != nil {
		return EventBuildResult{}, err
	}
	cardMeta, err := h.auditRepo.GetCardMeta(ctx, cardID)
	if err != nil {
		return EventBuildResult{}, err
	}
	commentMeta := evt.Payload.StatePayload.CardComments[0]
	usersMeta, err := h.auditRepo.GetUsersLiteWithBoardRoleByIDs(ctx, evt.MentionedUserIDs, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	var templateKey AuditTemplateKey
	switch h.mode {
	case CardCommentHandlerModeCreated:
		templateKey = AuditTemplateCardCommentCreated
	case CardCommentHandlerModeDeleted:
		templateKey = AuditTemplateCardCommentDeleted
	case CardCommentHandlerModeEdited:
		templateKey = AuditTemplateCardCommentEdited
	}

	cardLink := AuditEntityLink{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     evt.Targets[0].BoardID,
		WorkspaceID: evt.Targets[0].WorkspaceID,
	}
	listLink := AuditEntityLink{
		EntityType:  "list",
		EntityID:    listMeta.ID,
		BoardID:     evt.Targets[0].BoardID,
		WorkspaceID: evt.Targets[0].WorkspaceID,
	}
	boardLink := AuditEntityLink{
		EntityType:  "board",
		EntityID:    boardMeta.ID,
		BoardID:     evt.Targets[0].BoardID,
		WorkspaceID: evt.Targets[0].WorkspaceID,
	}
	links := make(map[string]AuditEntityLink)
	for _, user := range usersMeta {
		userlink := AuditEntityLink{
			EntityType:  "user",
			EntityID:    user.ID,
			BoardID:     evt.Targets[0].BoardID,
			WorkspaceID: evt.Targets[0].WorkspaceID,
		}
		links[user.ID.String()] = userlink
	}

	links["card"] = cardLink
	links["list"] = listLink
	links["board"] = boardLink

	params := map[string]interface{}{
		"boardName":      boardMeta.Name,
		"listTitle":      listMeta.Title,
		"cardTitle":      cardMeta.Title,
		"commentContent": commentMeta.Content,
	}

	feed := AuditRenderPayload{
		TemplateKey: templateKey,
		Actor:       *actor,
		Params:      params,
		Links:       links,
	}
	mainEntity := MainEntityRef{
		EntityType: "card",
		EntityID:   cardID,
	}
	result := EventBuildResult{
		StatePayload: statePayload,
		FeedPayload:  feed,
		Targets:      evt.Targets,
		MainEntity:   mainEntity,
	}
	return result, nil
}
