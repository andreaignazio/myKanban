package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"context"
	"fmt"
)

type CardMemberEventHandler struct {
	auditRepo auditcontext.Reader
	mode      CardMemberEventMode
}

type CardMemberEventMode string

const (
	CardMemberEventModeAdded   CardMemberEventMode = "added"
	CardMemberEventModeRemoved CardMemberEventMode = "removed"
)

func NewCardMemberAddedHandler(auditRepo auditcontext.Reader) *CardMemberEventHandler {
	return &CardMemberEventHandler{auditRepo: auditRepo, mode: CardMemberEventModeAdded}
}

func NewCardMemberRemovedHandler(auditRepo auditcontext.Reader) *CardMemberEventHandler {
	return &CardMemberEventHandler{auditRepo: auditRepo, mode: CardMemberEventModeRemoved}
}

func (h *CardMemberEventHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	statePayload := evt.Payload.StatePayload
	if statePayload == nil || statePayload.CardMembers == nil {
		return EventBuildResult{}, fmt.Errorf("card.member.%s: invalid state payload type", h.mode)
	}
	actor, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	cardLink := AuditEntityLink{
		EntityType:  "card",
		EntityID:    statePayload.CardMembers[0].CardID,
		BoardID:     evt.BoardID,
		WorkspaceID: evt.WorkspaceID,
	}
	card, err := h.auditRepo.GetCardMeta(ctx, statePayload.CardMembers[0].CardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	list, err := h.auditRepo.GetListMetaByCardID(ctx, *evt.BoardID, statePayload.CardMembers[0].CardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	board, err := h.auditRepo.GetBoardMeta(ctx, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	/*isSelfAction := true
	relatedUserIDs := []uuid.UUID{statePayload.CardMembers[0].UserID}
	if statePayload.CardMembers[0].UserID != *evt.ActorUserID {
		relatedUserIDs = append(relatedUserIDs, *evt.ActorUserID)
		isSelfAction = false
	}

	users, err := h.auditRepo.GetUsersLiteWithBoardRoleByIDs(ctx, relatedUserIDs, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}*/

	targetUserID := statePayload.CardMembers[0].UserID
	isSelfAction := targetUserID == *evt.ActorUserID
	targetUser, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, targetUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	listLink := AuditEntityLink{
		EntityType:  "list",
		EntityID:    list.ID,
		BoardID:     evt.BoardID,
		WorkspaceID: evt.WorkspaceID,
	}
	boardLink := AuditEntityLink{
		EntityType:  "board",
		EntityID:    *evt.BoardID,
		BoardID:     evt.BoardID,
		WorkspaceID: evt.WorkspaceID,
	}
	targetUserLink := AuditEntityLink{
		EntityType:  "user",
		EntityID:    targetUser.ID,
		BoardID:     evt.BoardID,
		WorkspaceID: evt.WorkspaceID,
	}

	links := map[string]AuditEntityLink{
		"card":  cardLink,
		"list":  listLink,
		"board": boardLink,
		"user":  targetUserLink,
	}

	params := map[string]interface{}{
		"cardTitle":          card.Title,
		"listTitle":          list.Title,
		"boardName":          board.Name,
		"cardMemberUserName": targetUser.Name,
	}

	targets := []TargetRef{
		{
			EntityType: "card",
			EntityID:   card.ID,
			BoardID:    evt.BoardID,
		},
		{
			EntityType: "list",
			EntityID:   list.ID,
			BoardID:    evt.BoardID,
		},
	}

	var templateKey AuditTemplateKey
	switch h.mode {
	case CardMemberEventModeAdded:
		templateKey = AuditTemplateCardMemberAdded
	case CardMemberEventModeRemoved:
		templateKey = AuditTemplateCardMemberRemoved
	}
	if isSelfAction {
		if h.mode == CardMemberEventModeAdded {
			templateKey = AuditTemplateCardMemberAddedSelf
		} else if h.mode == CardMemberEventModeRemoved {
			templateKey = AuditTemplateCardMemberRemovedSelf
		}
	}

	feedPayload := AuditRenderPayload{
		Actor:       *actor,
		TemplateKey: templateKey,
		Params:      params,
		Links:       links,
	}

	result := EventBuildResult{
		StatePayload: statePayload,
		FeedPayload:  feedPayload,
		Targets:      targets,
		MainEntity: MainEntityRef{
			EntityType: "card",
			EntityID:   card.ID,
		},
	}
	return result, nil
}
