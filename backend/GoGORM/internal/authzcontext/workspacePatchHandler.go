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
	payload := request.Payload.WorkspacePatchPayload
	if payload == nil {
		return nil, domainerr.ErrValidation
	}

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

	userWorkspace, err := h.authzRepo.GetWorkspaceUserRole(payload.WorkspaceID, request.UserID)
	if err != nil {
		return nil, err
	}
	subscription, err := h.authzRepo.GetWorkspaceSubscriptionPlan(payload.WorkspaceID)
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
