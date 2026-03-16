package authzcontext

import (
	"GoGORM/internal/authzdto"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/rbac"
	"context"
)

type WorkspaceDeleteHandler struct {
	authzRepo authzRepo
}

func NewWorkspaceDeleteHandler(authzRepo authzRepo) *WorkspaceDeleteHandler {
	return &WorkspaceDeleteHandler{authzRepo: authzRepo}
}

func (h *WorkspaceDeleteHandler) BuildAuthzContext(ctx context.Context, request authzdto.Request) (*authzdto.AuthzContext, error) {
	payload := request.Payload.WorkspaceDeletePayload
	if payload == nil {
		return nil, domainerr.ErrValidation
	}

	specs := []authzdto.PolicySpec{
		{
			PolicyKind: authzdto.PolicyRequireMinimumFactValue,
			FactKind:   authzdto.FactActorWorkspaceRole,
			Value:      authzdto.NewWorkspaceRoleFact(rbac.Owner),
		},
	}

	facts := make(map[authzdto.FactKind]authzdto.Fact)

	userWorkspace, err := h.authzRepo.GetWorkspaceUserRole(payload.WorkspaceID, request.UserID)
	if err != nil {
		return nil, err
	}
	if userWorkspace != nil {
		err := authzdto.SetFact(facts, authzdto.FactActorWorkspaceRole, authzdto.NewWorkspaceRoleFact(userWorkspace.Role))
		if err != nil {
			return nil, err
		}
	}

	return &authzdto.AuthzContext{
		PolicySpecs: specs,
		Facts:       facts,
	}, nil
}
