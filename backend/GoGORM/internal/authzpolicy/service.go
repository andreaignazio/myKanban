package authzpolicy

import (
	"GoGORM/internal/authzdto"
)

type PolicyEvaluator interface {
	Evaluate(spec authzdto.PolicySpec, fact authzdto.Fact) error
}
