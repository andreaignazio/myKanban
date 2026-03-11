package authzcontext

import (
	"GoGORM/internal/authzdto"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/rbac"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
)

type ReadListCardHandler struct {
	authzRepo authzRepo
}

func NewReadListCardHandler(authzRepo authzRepo) *ReadListCardHandler {
	return &ReadListCardHandler{
		authzRepo: authzRepo,
	}
}

func (h *ReadListCardHandler) BuildAuthzContext(ctx context.Context, authzRequest authzdto.Request) (*authzdto.AuthzContext, error) {

	payload := authzRequest.Payload.ReadListCardPayload
	userID := authzRequest.UserID

	policies, facts, err := h.CreatePoliciesAndFacts(payload, userID)
	if err != nil {
		return nil, err
	}

	return &authzdto.AuthzContext{
		PolicySpecs: policies,
		Facts:       facts,
	}, nil

}

func (h *ReadListCardHandler) CreatePoliciesAndFacts(payload *authzdto.ReadListCardPayload, userID uuid.UUID) ([]authzdto.PolicySpec, map[authzdto.FactKind]authzdto.Fact, error) {
	if payload == nil {
		return nil, nil, domainerr.ErrValidation
	}

	sourceboardlist, err := h.authzRepo.GetBoardListByID(payload.SourceBoardListID)
	if err != nil {
		return nil, nil, domainerr.ErrNotFound
	}

	sourceBoardID := sourceboardlist.BoardID

	var effectiveBoardListID *models.BoardList
	if payload.RootListCardID != nil && *payload.RootListCardID != uuid.Nil {
		effectiveBoardListID, err = h.authzRepo.GetBoardListByRootListCardIDAndBoardID(*payload.RootListCardID, sourceBoardID)
	} else {
		effectiveBoardListID, err = h.authzRepo.GetBoardListByCardIDAndBoardID(payload.CardID, sourceBoardID)
	}
	if err != nil {
		return nil, nil, domainerr.ErrNotFound
	}

	userworkspace, err := h.authzRepo.GetWorkspaceUserRole(payload.WorkspaceID, userID)
	if err != nil {
		return nil, nil, domainerr.ErrNotFound
	}

	userboard, err := h.authzRepo.GetUserBoard(userID, sourceBoardID)
	if err != nil {
		return nil, nil, domainerr.ErrNotFound
	}
	userboardrole, ok := rbac.ParseRole(userboard.Role)
	if !ok {
		return nil, nil, domainerr.ErrNotFound
	}

	WorkspaceMinRoleSpec := authzdto.PolicySpec{
		PolicyKind: authzdto.PolicyRequireMinimumFactValue,
		FactKind:   authzdto.FactSourceWorkspaceRole,
		Value:      authzdto.NewSourceWorkspaceRoleFact(rbac.Viewer),
	}

	boardMinRoleSpec := authzdto.PolicySpec{
		PolicyKind: authzdto.PolicyRequireMinimumFactValue,
		FactKind:   authzdto.FactSourceBoardRole,
		Value:      authzdto.NewSourceBoardRoleFact(rbac.Viewer),
	}

	effectiveBoardListSpec := authzdto.PolicySpec{
		PolicyKind: authzdto.PolicyRequireExactFactValue,
		FactKind:   authzdto.FactSourceCardEffectiveBoardListID,
		Value:      authzdto.NewSourceCardEffectiveBoardListIDFact(payload.SourceBoardListID),
	}

	policies := []authzdto.PolicySpec{WorkspaceMinRoleSpec, boardMinRoleSpec, effectiveBoardListSpec}

	facts := map[authzdto.FactKind]authzdto.Fact{}

	err = authzdto.SetFact(facts, authzdto.FactSourceWorkspaceRole, authzdto.NewSourceWorkspaceRoleFact(userworkspace.Role))
	if err != nil {
		return nil, nil, err
	}
	err = authzdto.SetFact(facts, authzdto.FactSourceBoardRole, authzdto.NewSourceBoardRoleFact(userboardrole))
	if err != nil {
		return nil, nil, err
	}
	err = authzdto.SetFact(facts, authzdto.FactSourceCardEffectiveBoardListID, authzdto.NewSourceCardEffectiveBoardListIDFact(effectiveBoardListID.ID))
	if err != nil {
		return nil, nil, err
	}

	return policies, facts, nil
}
