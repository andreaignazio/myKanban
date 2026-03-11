package authzcontext

import (
	"GoGORM/internal/authzdto"
	"GoGORM/internal/domainerr"
	"context"
)

type InboxCardDetatchHandler struct {
	authzRepo authzRepo
}

func NewInboxCardDetatchHandler(authzRepo authzRepo) *InboxCardDetatchHandler {
	return &InboxCardDetatchHandler{
		authzRepo: authzRepo,
	}
}

func (h *InboxCardDetatchHandler) BuildAuthzContext(ctx context.Context, authzRequest authzdto.Request) (*authzdto.AuthzContext, error) {
	payload := authzRequest.Payload.InboxCardDetatchPayload
	if payload == nil {
		return nil, domainerr.ErrValidation
	}

	inboxcard, err := h.authzRepo.GetInboxCardByCardID(ctx, authzRequest.UserID, payload.CardID, false)
	if err != nil {
		return nil, err
	}
	if inboxcard == nil {
		return nil, domainerr.ErrForbidden
	}

	policies := []authzdto.PolicySpec{
		{
			PolicyKind: authzdto.PolicyRequireExactFactValue,
			FactKind:   authzdto.FactEffectiveInboxCardUserID,
			Value:      authzdto.NewEffectiveInboxCardUserIDFact(inboxcard.UserID),
		},
	}
	facts := make(map[authzdto.FactKind]authzdto.Fact)
	err = authzdto.SetFact(facts, authzdto.FactEffectiveInboxCardUserID, authzdto.NewEffectiveInboxCardUserIDFact(authzRequest.UserID))
	if err != nil {
		return nil, err
	}
	context := &authzdto.AuthzContext{
		PolicySpecs: policies,
		Facts:       facts,
	}
	return context, nil

}
