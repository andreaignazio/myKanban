package authzcontext

import (
	"GoGORM/internal/authzdto"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/rbac"
	"GoGORM/internal/subscriptionplan"
	"context"
)

type WorkspacePatchHandler struct {
	authzRepo authzRepo
}

func NewWorkspacePatchHandler(authzRepo authzRepo) *WorkspacePatchHandler {
	return &WorkspacePatchHandler{authzRepo: authzRepo}
}

func (h *WorkspacePatchHandler) BuildAuthzContext(ctx context.Context, request authzdto.Request) (*authzdto.AuthzContext, error) {

	specs := []authzdto.PolicySpec{
		{
			PolicyKind: authzdto.PolicyRequireMinimumFactValue,
			FactKind:   authzdto.FactActorWorkspaceRole,
			Value:      authzdto.NewWorkspaceRoleFact(rbac.Admin),
		},
		{
			PolicyKind: authzdto.PolicyRequireMinimumFactValue,
			FactKind:   authzdto.FactWorkspaceSubscriptionPlan,
			Value:      authzdto.NewSubscriptionPlanFact(subscriptionplan.Pro),
		},
	}

	facts := make(map[authzdto.FactKind]authzdto.Fact)

	if request.WorkspaceID == nil {
		return nil, domainerr.ErrForbidden
	}

	userWorkspace, err := h.authzRepo.GetWorkspaceUserRole(*request.WorkspaceID, request.UserID)
	if err != nil {
		return nil, err
	}
	subscription, err := h.authzRepo.GetWorkspaceSubscriptionPlan(*request.WorkspaceID)
	if err != nil {
		return nil, err
	}
	if userWorkspace != nil {
		err := authzdto.SetFact(facts, authzdto.FactActorWorkspaceRole, authzdto.NewWorkspaceRoleFact(userWorkspace.Role))
		if err != nil {
			return nil, err
		}
	}
	if subscription != nil {
		err := authzdto.SetFact(facts, authzdto.FactWorkspaceSubscriptionPlan, authzdto.NewSubscriptionPlanFact(subscription.Plan))
		if err != nil {
			return nil, err
		}
	}

	context := &authzdto.AuthzContext{
		PolicySpecs: specs,
		Facts:       facts,
	}

	return context, nil

}
