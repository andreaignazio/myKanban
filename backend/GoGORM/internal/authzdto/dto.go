package authzdto

import (
	"GoGORM/internal/actions"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/rbac"
	"GoGORM/internal/subscriptionplan"

	"github.com/google/uuid"
)

type Request struct {
	UserID        uuid.UUID
	WorkspaceID   uuid.UUID
	CorrelationID uuid.UUID
	Action        actions.Action
}

type Response struct {
	Authorized bool
}

type AuthzContext struct {
	Facts       map[FactKind]Fact
	PolicySpecs []PolicySpec
}

type FactKind string

const (
	FactActorWorkspaceRole        FactKind = "actor.workspace_role"
	FactWorkspaceSubscriptionPlan FactKind = "workspace.subscription_plan"
)

type PolicyKind string

const (
	PolicyRequireFactPresence     PolicyKind = "require_fact_presence"
	PolicyRequireMinimumFactValue PolicyKind = "require_minimum_fact_value"
	PolicyRequireExactFactValue   PolicyKind = "require_exact_fact_value"
)

type PolicySpec struct {
	PolicyKind PolicyKind
	FactKind   FactKind
	Value      Fact
}

type Fact struct {
	WorkspaceRole    *rbac.Role
	SubscriptionPlan *subscriptionplan.Plan
}

func NewWorkspaceRoleFact(role rbac.Role) Fact {
	return Fact{
		WorkspaceRole: &role,
	}
}

func NewSubscriptionPlanFact(plan subscriptionplan.Plan) Fact {
	return Fact{
		SubscriptionPlan: &plan,
	}
}

// SetFact canonicalizes the provided fact so only the field allowed by factKind is stored.
func SetFact(facts map[FactKind]Fact, factKind FactKind, value Fact) error {
	switch factKind {
	case FactActorWorkspaceRole:
		if value.WorkspaceRole == nil {
			return domainerr.ErrInvalidFactValue
		}
		facts[factKind] = Fact{
			WorkspaceRole: value.WorkspaceRole,
		}

		return nil
	case FactWorkspaceSubscriptionPlan:
		if value.SubscriptionPlan == nil {
			return domainerr.ErrInvalidFactValue
		}
		facts[factKind] = Fact{
			SubscriptionPlan: value.SubscriptionPlan,
		}
		return nil
	default:
		return domainerr.ErrUnsupportedFact
	}
}
