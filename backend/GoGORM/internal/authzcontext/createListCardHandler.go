package authzcontext

import (
	"GoGORM/internal/authzdto"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/rbac"
	"context"

	"github.com/google/uuid"
)

type CreateListCardHandler struct {
	authzRepo authzRepo
}

func NewCreateListCardHandler(authzRepo authzRepo) *CreateListCardHandler {
	return &CreateListCardHandler{
		authzRepo: authzRepo,
	}
}

func (h *CreateListCardHandler) BuildAuthzContext(ctx context.Context, authzRequest authzdto.Request) (*authzdto.AuthzContext, error) {
	payload := authzRequest.Payload.CreateListCardPayload
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

func (h *CreateListCardHandler) CreatePoliciesAndFacts(payload *authzdto.CreateListCardPayload, userID uuid.UUID) ([]authzdto.PolicySpec, map[authzdto.FactKind]authzdto.Fact, error) {

	if payload == nil {
		return nil, nil, domainerr.ErrValidation
	}

	boardList, err := h.authzRepo.GetBoardListByID(payload.TargetBoardListID)
	if err != nil {
		return nil, nil, domainerr.ErrNotFound
	}

	board, err := h.authzRepo.GetBoardByID(boardList.BoardID)
	if err != nil {
		return nil, nil, domainerr.ErrNotFound
	}

	userworkspace, err := h.authzRepo.GetWorkspaceUserRole(payload.TargetWorkspaceID, userID)
	if err != nil {
		return nil, nil, domainerr.ErrNotFound
	}
	userboard, err := h.authzRepo.GetUserBoard(userID, board.ID)
	if err != nil {
		return nil, nil, domainerr.ErrNotFound
	}
	userboardrole, ok := rbac.ParseRole(userboard.Role)
	if !ok {
		return nil, nil, domainerr.ErrNotFound
	}

	boardListEditableSpec := authzdto.PolicySpec{
		PolicyKind: authzdto.PolicyRequireExactFactValue,
		FactKind:   authzdto.FactTargetBoardListAccessMode,
		Value:      authzdto.NewTargetBoardListAccessModeFact(rbac.BoardListEditable),
	}
	boardMinRoleSpec := authzdto.PolicySpec{
		PolicyKind: authzdto.PolicyRequireMinimumFactValue,
		FactKind:   authzdto.FactTargetBoardRole,
		Value:      authzdto.NewTargetBoardRoleFact(rbac.Member),
	}
	workspaceMinRoleSpec := authzdto.PolicySpec{
		PolicyKind: authzdto.PolicyRequireMinimumFactValue,
		FactKind:   authzdto.FactTargetWorkspaceRole,
		Value:      authzdto.NewTargetWorkspaceRoleFact(rbac.Member),
	}

	policies := []authzdto.PolicySpec{boardListEditableSpec, boardMinRoleSpec, workspaceMinRoleSpec}

	facts := map[authzdto.FactKind]authzdto.Fact{}
	err = authzdto.SetFact(facts, authzdto.FactTargetBoardListAccessMode, authzdto.NewTargetBoardListAccessModeFact(boardList.AccessMode))
	if err != nil {
		return nil, nil, err
	}
	err = authzdto.SetFact(facts, authzdto.FactTargetBoardRole, authzdto.NewTargetBoardRoleFact(userboardrole))
	if err != nil {
		return nil, nil, err
	}
	err = authzdto.SetFact(facts, authzdto.FactTargetWorkspaceRole, authzdto.NewTargetWorkspaceRoleFact(userworkspace.Role))
	if err != nil {
		return nil, nil, err
	}
	return policies, facts, nil
}
