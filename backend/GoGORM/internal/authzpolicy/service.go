package authzpolicy

import (
	"GoGORM/internal/authzdto"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/rbac"
	"GoGORM/internal/subscriptionplan"
)

type PolicyEvaluator interface {
	Evaluate(spec authzdto.PolicySpec, fact any) error
}

func NewRequireMinimumFactValueEvaluator(factKind authzdto.FactKind) *RequireMinimumFactValueEvaluator {
	return &RequireMinimumFactValueEvaluator{
		factKind: factKind,
	}
}

type RequireMinimumFactValueEvaluator struct {
	factKind authzdto.FactKind
}

func (e *RequireMinimumFactValueEvaluator) Evaluate(spec authzdto.PolicySpec, fact any) error {
	comparator, err := getMinimumFactValueComparator(e.factKind)
	if err != nil {
		return err
	}

	requiredValue := spec.Value
	effectiveValue := fact

	ok, err := comparator.Compare(effectiveValue, requiredValue)
	if err != nil {
		return err
	}
	if !ok {
		return domainerr.ErrForbidden
	}
	return nil
}

func getMinimumFactValueComparator(factKind authzdto.FactKind) (MinimumFactComparator, error) {
	switch factKind {
	case authzdto.FactActorWorkspaceRole:
		return &MinimumWorkspaceRoleComparator{}, nil
	case authzdto.FactWorkspaceSubscriptionPlan:
		return &MinimumSubscriptionPlanComparator{}, nil
	default:
		return nil, domainerr.ErrUnsupportedFact
	}
}

type MinimumFactComparator interface {
	Compare(factValue any, requiredValue any) (bool, error)
}

type MinimumWorkspaceRoleComparator struct{}

type MinimumSubscriptionPlanComparator struct{}

func (c *MinimumWorkspaceRoleComparator) Compare(factValue any, requiredValue any) (bool, error) {
	role, err := parseRoleValue(factValue)
	if err != nil {
		return false, err
	}
	requiredRole, err := parseRoleValue(requiredValue)
	if err != nil {
		return false, err
	}
	return role >= requiredRole, nil
}

func (c *MinimumSubscriptionPlanComparator) Compare(factValue any, requiredValue any) (bool, error) {
	plan, err := parsePlanValue(factValue)
	if err != nil {
		return false, err
	}
	requiredPlan, err := parsePlanValue(requiredValue)
	if err != nil {
		return false, err
	}
	ok, valid := plan.AtLeast(requiredPlan)
	if !valid {
		return false, domainerr.ErrInvalidFactValue
	}
	return ok, nil
}

func parseRoleValue(value any) (rbac.Role, error) {
	switch typed := value.(type) {
	case rbac.Role:
		return typed, nil
	case string:
		role, ok := rbac.ParseRole(typed)
		if !ok {
			return 0, domainerr.ErrInvalidFactValue
		}
		return role, nil
	default:
		return 0, domainerr.ErrInvalidFactValue
	}
}

func parsePlanValue(value any) (subscriptionplan.Plan, error) {
	switch typed := value.(type) {
	case subscriptionplan.Plan:
		if !typed.IsValid() {
			return "", domainerr.ErrInvalidFactValue
		}
		return typed, nil
	case string:
		plan, ok := subscriptionplan.Parse(typed)
		if !ok {
			return "", domainerr.ErrInvalidFactValue
		}
		return plan, nil
	default:
		return "", domainerr.ErrInvalidFactValue
	}
}
