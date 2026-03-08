package authzdto

import (
	"GoGORM/internal/actions"

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
	Facts       map[FactKind]any
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
	Kind  PolicyKind
	Fact  FactKind
	Value any
}
