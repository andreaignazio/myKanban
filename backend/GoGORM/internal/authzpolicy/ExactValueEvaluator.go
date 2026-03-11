package authzpolicy

import (
	"GoGORM/internal/authzdto"
	"GoGORM/internal/domainerr"
)

func NewRequireExactFactValueEvaluator(factKind authzdto.FactKind) *ExactValueEvaluator {
	return &ExactValueEvaluator{
		factKind: factKind,
	}
}

type ExactValueEvaluator struct {
	factKind authzdto.FactKind
}

func (e *ExactValueEvaluator) Evaluate(spec authzdto.PolicySpec, fact authzdto.Fact) error {
	if spec.FactKind != e.factKind {
		return domainerr.ErrUnsupportedFact
	}
	comparator, err := getExactFactValueComparator(e.factKind)
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

func getExactFactValueComparator(factKind authzdto.FactKind) (ExactFactComparator, error) {
	switch factKind {
	case authzdto.FactBoardListAccessMode:
		fallthrough
	case authzdto.FactTargetBoardListAccessMode:
		return &ExactBoardListAccessModeComparator{}, nil
	case authzdto.FactBoardWorkspaceID:
		return &ExactBoardWorkspaceIDComparator{}, nil
	case authzdto.FactCardEffectiveBoardListID:
		fallthrough
	case authzdto.FactSourceCardEffectiveBoardListID:
		return &ExactCardEffectiveBoardListIDComparator{}, nil
	case authzdto.FactEffectiveInboxCardUserID:
		return &ExactEffectiveInboxCardUserIDComparator{}, nil
	default:
		return nil, domainerr.ErrUnsupportedFact
	}
}

type ExactFactComparator interface {
	Compare(factValue authzdto.Fact, requiredValue authzdto.Fact) (bool, error)
}

type ExactBoardListAccessModeComparator struct{}

func (c *ExactBoardListAccessModeComparator) Compare(factValue authzdto.Fact, requiredValue authzdto.Fact) (bool, error) {
	if factValue.BoardListAccessMode == nil || requiredValue.BoardListAccessMode == nil {
		return false, domainerr.ErrInvalidFactValue
	}
	value, err := parseBoardListAccessModeValue(factValue)
	if err != nil {
		return false, err
	}
	required, err := parseBoardListAccessModeValue(requiredValue)
	if err != nil {
		return false, err
	}

	return value == required, nil
}

type ExactBoardWorkspaceIDComparator struct{}

func (c *ExactBoardWorkspaceIDComparator) Compare(factValue authzdto.Fact, requiredValue authzdto.Fact) (bool, error) {
	if factValue.BoardWorkspaceID == nil || requiredValue.BoardWorkspaceID == nil {
		return false, domainerr.ErrInvalidFactValue
	}

	return *factValue.BoardWorkspaceID == *requiredValue.BoardWorkspaceID, nil
}

type ExactCardEffectiveBoardListIDComparator struct{}

func (c *ExactCardEffectiveBoardListIDComparator) Compare(factValue authzdto.Fact, requiredValue authzdto.Fact) (bool, error) {
	if factValue.BoardListID == nil || requiredValue.BoardListID == nil {
		return false, domainerr.ErrInvalidFactValue
	}

	return *factValue.BoardListID == *requiredValue.BoardListID, nil
}

type ExactEffectiveInboxCardUserIDComparator struct{}

func (c *ExactEffectiveInboxCardUserIDComparator) Compare(factValue authzdto.Fact, requiredValue authzdto.Fact) (bool, error) {
	if factValue.InboxCardUserID == nil || requiredValue.InboxCardUserID == nil {
		return false, domainerr.ErrInvalidFactValue
	}
	return *factValue.InboxCardUserID == *requiredValue.InboxCardUserID, nil
}
