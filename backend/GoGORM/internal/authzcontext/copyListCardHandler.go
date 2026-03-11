package authzcontext

import (
	"GoGORM/internal/authzdto"
	"GoGORM/internal/domainerr"
	"context"
)

type CopyListCardHandler struct {
	authzRepo authzRepo
}

func NewCopyListCardHandler(authzRepo authzRepo) *CopyListCardHandler {
	return &CopyListCardHandler{
		authzRepo: authzRepo,
	}
}

func (h *CopyListCardHandler) BuildAuthzContext(ctx context.Context, authzRequest authzdto.Request) (*authzdto.AuthzContext, error) {

	payload := authzRequest.Payload.CopyListCardPayload
	userID := authzRequest.UserID
	if payload == nil {
		return nil, domainerr.ErrValidation
	}

	readPolicies, readFacts, err := NewReadListCardHandler(h.authzRepo).CreatePoliciesAndFacts(&authzdto.ReadListCardPayload{
		CardID:            payload.CardID,
		SourceBoardListID: payload.SourceBoardListID,
		WorkspaceID:       payload.WorkspaceID,
		RootListCardID:    payload.RootListCardID,
	}, userID)
	if err != nil {
		return nil, err
	}

	createPolicies, createFacts, err := NewCreateListCardHandler(h.authzRepo).CreatePoliciesAndFacts(&authzdto.CreateListCardPayload{
		TargetBoardListID: payload.TargetBoardListID,
		TargetWorkspaceID: payload.TargetWorkspaceID,
	}, userID)
	if err != nil {
		return nil, err
	}

	policies := append(readPolicies, createPolicies...)
	facts := make(map[authzdto.FactKind]authzdto.Fact)

	for k, v := range readFacts {
		facts[k] = v
	}
	for k, v := range createFacts {
		facts[k] = v
	}

	return &authzdto.AuthzContext{
		PolicySpecs: policies,
		Facts:       facts,
	}, nil
}
