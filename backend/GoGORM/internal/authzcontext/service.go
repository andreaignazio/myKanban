package authzcontext

import (
	"GoGORM/internal/actions"
	"GoGORM/internal/authzdto"
	"GoGORM/internal/domainerr"
	"context"
)

type Service struct {
	authzRepo authzRepo
}

func NewService(authzRepo authzRepo) *Service {
	return &Service{authzRepo: authzRepo}
}

type AuthzContextHandler interface {
	BuildAuthzContext(ctx context.Context, authzContext authzdto.Request) (*authzdto.AuthzContext, error)
}

func (s *Service) getHandlerForAction(action actions.Action) (AuthzContextHandler, error) {
	switch action {
	case actions.WorkspacePatch:
		return NewWorkspacePatchHandler(s.authzRepo), nil
	case actions.InboxCardMoveToListInBoard:
		return NewMoveInboxCardToListInBoardHandler(s.authzRepo), nil
	default:
		return nil, domainerr.ErrUnsupportedAction
	}
}

func (s *Service) BuildAuthzContext(ctx context.Context, authzContext authzdto.Request) (*authzdto.AuthzContext, error) {

	handler, err := s.getHandlerForAction(authzContext.Action)
	if err != nil {
		return nil, err
	}

	return handler.BuildAuthzContext(ctx, authzContext)

}
