package authzpolicy

import (
	"GoGORM/internal/authzdto"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/rbac"
	"GoGORM/internal/subscriptionplan"
)

func NewRequireMinimumFactValueEvaluator(factKind authzdto.FactKind) *RequireMinimumFactValueEvaluator {
	return &RequireMinimumFactValueEvaluator{
		factKind: factKind,
	}
}

type RequireMinimumFactValueEvaluator struct {
	factKind authzdto.FactKind
}

func (e *RequireMinimumFactValueEvaluator) Evaluate(spec authzdto.PolicySpec, fact authzdto.Fact) error {
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
		fallthrough
	case authzdto.FactSourceWorkspaceRole:
		fallthrough
	case authzdto.FactTargetWorkspaceRole:
		return &MinimumWorkspaceRoleComparator{}, nil
	case authzdto.FactWorkspaceSubscriptionPlan:
		return &MinimumSubscriptionPlanComparator{}, nil
	case authzdto.FactBoardRole:
		fallthrough
	case authzdto.FactSourceBoardRole:
		fallthrough
	case authzdto.FactTargetBoardRole:
		return &MinimumBoardRoleComparator{}, nil
	default:
		return nil, domainerr.ErrUnsupportedFact
	}
}

type MinimumFactComparator interface {
	Compare(factValue authzdto.Fact, requiredValue authzdto.Fact) (bool, error)
}

type MinimumWorkspaceRoleComparator struct{}

type MinimumSubscriptionPlanComparator struct{}

type MinimumBoardRoleComparator struct{}

func (c *MinimumWorkspaceRoleComparator) Compare(factValue authzdto.Fact, requiredValue authzdto.Fact) (bool, error) {
	role, err := parseWorkspaceRoleValue(factValue)
	if err != nil {
		return false, err
	}
	requiredRole, err := parseWorkspaceRoleValue(requiredValue)
	if err != nil {
		return false, err
	}
	return role >= requiredRole, nil
}

func (c *MinimumSubscriptionPlanComparator) Compare(factValue authzdto.Fact, requiredValue authzdto.Fact) (bool, error) {
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

func (c *MinimumBoardRoleComparator) Compare(factValue authzdto.Fact, requiredValue authzdto.Fact) (bool, error) {
	role, err := parseBoardRoleValue(factValue)
	if err != nil {
		return false, err
	}
	requiredRole, err := parseBoardRoleValue(requiredValue)
	if err != nil {
		return false, err
	}
	return role >= requiredRole, nil
}

func parseWorkspaceRoleValue(value authzdto.Fact) (rbac.Role, error) {
	if value.WorkspaceRole == nil {
		return 0, domainerr.ErrInvalidFactValue
	}
	return *value.WorkspaceRole, nil
}

func parseBoardRoleValue(value authzdto.Fact) (rbac.Role, error) {
	if value.BoardRole == nil {
		return 0, domainerr.ErrInvalidFactValue
	}
	return *value.BoardRole, nil
}

func parsePlanValue(value authzdto.Fact) (subscriptionplan.Plan, error) {
	if value.SubscriptionPlan == nil {
		return "", domainerr.ErrInvalidFactValue
	}
	return *value.SubscriptionPlan, nil
}

func parseBoardListAccessModeValue(value authzdto.Fact) (rbac.BoardListAccessMode, error) {
	if value.BoardListAccessMode == nil {
		return "", domainerr.ErrInvalidFactValue
	}
	return *value.BoardListAccessMode, nil
}
