package authzcontext

import (
	"GoGORM/internal/authzdto"
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
			Kind:  authzdto.PolicyRequireMinimumFactValue,
			Fact:  authzdto.FactActorWorkspaceRole,
			Value: rbac.Admin,
		},
		{
			Kind:  authzdto.PolicyRequireMinimumFactValue,
			Fact:  authzdto.FactWorkspaceSubscriptionPlan,
			Value: subscriptionplan.Pro,
		},
	}

	facts := make(map[authzdto.FactKind]any)

	userWorkspace, err := h.authzRepo.GetWorkspaceUserRole(request.WorkspaceID, request.UserID)
	if err != nil {
		return nil, err
	}
	subscription, err := h.authzRepo.GetWorkspaceSubscriptionPlan(request.WorkspaceID)
	if err != nil {
		return nil, err
	}
	if userWorkspace != nil {
		facts[authzdto.FactActorWorkspaceRole] = userWorkspace.Role
	}
	if subscription != nil {
		facts[authzdto.FactWorkspaceSubscriptionPlan] = subscription.Plan
	}

	context := &authzdto.AuthzContext{
		PolicySpecs: specs,
		Facts:       facts,
	}

	return context, nil

}
