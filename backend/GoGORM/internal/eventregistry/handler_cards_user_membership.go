package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"context"
	"fmt"
)

type CardsUserMembershipHandlerMode string

const (
	CardsUserMembershipHandlerModeAdded   CardsUserMembershipHandlerMode = "added"
	CardsUserMembershipHandlerModeRemoved CardsUserMembershipHandlerMode = "removed"
)

type CardsUserMembershipHandler struct {
	auditRepo auditcontext.Reader
	mode      CardsUserMembershipHandlerMode
}

func NewCardsUserMemberAddedHandler(auditRepo auditcontext.Reader) *CardsUserMembershipHandler {
	return &CardsUserMembershipHandler{auditRepo: auditRepo, mode: CardsUserMembershipHandlerModeAdded}
}

func NewCardsUserMemberRemovedHandler(auditRepo auditcontext.Reader) *CardsUserMembershipHandler {
	return &CardsUserMembershipHandler{auditRepo: auditRepo, mode: CardsUserMembershipHandlerModeRemoved}
}

func (h *CardsUserMembershipHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	statePayload := evt.Payload.StatePayload
	if statePayload == nil || len(statePayload.CardMembers) == 0 {
		return EventBuildResult{}, fmt.Errorf("cards.user.member.%s: missing card member state payload", h.mode)
	}
	if evt.ActorUserID == nil || evt.WorkspaceID == nil || evt.BoardID == nil {
		return EventBuildResult{}, fmt.Errorf("cards.user.member.%s: missing actor/workspace/board ids", h.mode)
	}

	actor, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	cardID := statePayload.CardMembers[0].CardID
	targetUserID := statePayload.CardMembers[0].UserID

	card, err := h.auditRepo.GetCardMeta(ctx, cardID)
	if err != nil {
		return EventBuildResult{}, err
	}
	list, err := h.auditRepo.GetListMetaByCardID(ctx, *evt.BoardID, cardID)
	if err != nil {
		return EventBuildResult{}, err
	}
	board, err := h.auditRepo.GetBoardMeta(ctx, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}
	targetUser, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, targetUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	isSelfAction := targetUserID == *evt.ActorUserID

	cardLink := AuditEntityLink{EntityType: "card", EntityID: cardID, BoardID: evt.BoardID, WorkspaceID: evt.WorkspaceID}
	listLink := AuditEntityLink{EntityType: "list", EntityID: list.ID, BoardID: evt.BoardID, WorkspaceID: evt.WorkspaceID}
	boardLink := AuditEntityLink{EntityType: "board", EntityID: *evt.BoardID, BoardID: evt.BoardID, WorkspaceID: evt.WorkspaceID}
	targetUserLink := AuditEntityLink{EntityType: "user", EntityID: targetUserID, BoardID: evt.BoardID, WorkspaceID: evt.WorkspaceID}

	params := map[string]interface{}{
		"cardTitle":          card.Title,
		"listTitle":          list.Title,
		"boardName":          board.Name,
		"cardMemberUserName": targetUser.Name,
	}

	var templateKey AuditTemplateKey
	switch h.mode {
	case CardsUserMembershipHandlerModeAdded:
		templateKey = AuditTemplateCardMemberAdded
		if isSelfAction {
			templateKey = AuditTemplateCardMemberAddedSelf
		}
	case CardsUserMembershipHandlerModeRemoved:
		templateKey = AuditTemplateCardMemberRemoved
		if isSelfAction {
			templateKey = AuditTemplateCardMemberRemovedSelf
		}
	default:
		return EventBuildResult{}, fmt.Errorf("cards.user.membership: unsupported mode %s", h.mode)
	}

	feedPayload := AuditRenderPayload{
		Actor:       *actor,
		TemplateKey: templateKey,
		Params:      params,
		Links: map[string]AuditEntityLink{
			"card":  cardLink,
			"list":  listLink,
			"board": boardLink,
			"user":  targetUserLink,
		},
	}

	return EventBuildResult{
		StatePayload: statePayload,
		FeedPayload:  feedPayload,
		Targets:      []TargetRef{},
		MainEntity: MainEntityRef{
			EntityType: "card",
			EntityID:   cardID,
		},
		UserPayload: evt.Payload.UserPayload,
	}, nil
}
