package authzcontext

import (
	"GoGORM/internal/authzdto"
	"context"
)

type MoveInboxCardToListInBoardHandler struct {
	authzRepo authzRepo
}

func NewMoveInboxCardToListInBoardHandler(authzRepo authzRepo) *MoveInboxCardToListInBoardHandler {
	return &MoveInboxCardToListInBoardHandler{authzRepo: authzRepo}
}

func (h *MoveInboxCardToListInBoardHandler) BuildAuthzContext(ctx context.Context, authzContext authzdto.Request) (*authzdto.AuthzContext, error) {

	return nil, nil
}
