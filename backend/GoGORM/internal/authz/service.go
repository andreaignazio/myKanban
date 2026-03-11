package authz

import (
	"GoGORM/internal/authzcontext"
	"GoGORM/internal/authzdto"
	"GoGORM/internal/authzpolicy"
	"GoGORM/internal/domainerr"
	"context"
	"fmt"
)

type Service struct {
	authzContextService *authzcontext.Service
}

func NewService(authzContextService *authzcontext.Service) *Service {
	return &Service{authzContextService: authzContextService}
}

type AuthzHandler interface {
	Authorize(ctx context.Context, request authzdto.Request, authzcontext *authzdto.AuthzContext) (*authzdto.Response, error)
}

func getPolicyEvaluator(policySpec authzdto.PolicySpec) (authzpolicy.PolicyEvaluator, error) {

	policyKind := policySpec.PolicyKind
	factKind := policySpec.FactKind

	switch policyKind {

	case authzdto.PolicyRequireMinimumFactValue:
		return authzpolicy.NewRequireMinimumFactValueEvaluator(factKind), nil
	case authzdto.PolicyRequireExactFactValue:
		return authzpolicy.NewRequireExactFactValueEvaluator(factKind), nil
	default:
		return nil, domainerr.ErrUnsupportedPolicy
	}
}

func (s *Service) AuthorizeRequest(ctx context.Context, request authzdto.Request) (*authzdto.Response, error) {
	authzcontext, err := s.authzContextService.BuildAuthzContext(ctx, request)
	if err != nil {
		return nil, err
	}

	for _, policySpec := range authzcontext.PolicySpecs {
		evaluator, err := getPolicyEvaluator(policySpec)
		if err != nil {
			return nil, err
		}
		fact, ok := authzcontext.Facts[policySpec.FactKind]
		if !ok {
			return nil, domainerr.ErrNotFound
		}
		if err := evaluator.Evaluate(policySpec, fact); err != nil {
			fmt.Println("Authorization failed for policy:", policySpec, "with fact:", fact, "error:", err)
			return &authzdto.Response{Authorized: false}, nil
		}
	}

	return &authzdto.Response{Authorized: true}, nil
}
