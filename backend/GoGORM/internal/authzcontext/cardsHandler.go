package authzcontext

import (
	"GoGORM/internal/authzdto"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/rbac"
	"context"
)

type AuthzCardsHandler struct {
	authzRepo authzRepo
	mode      AuthzCardsHandlerMode
}

type AuthzCardsHandlerMode string

const (
	AuthzCardsHandlerModePatchCardInList AuthzCardsHandlerMode = "patchCardInList"
)

func NewAuthzCardsHandlerPatchCardInList(authzRepo authzRepo) *AuthzCardsHandler {
	return &AuthzCardsHandler{
		authzRepo: authzRepo,
		mode:      AuthzCardsHandlerModePatchCardInList,
	}
}

func (h *AuthzCardsHandler) BuildAuthzContext(ctx context.Context, authzRequest authzdto.Request) (*authzdto.AuthzContext, error) {

	cardID := authzRequest.Resource.ResourceID

	boardListID := authzRequest.AncillaryData[authzdto.ResourceTypeBoardList].ResourceID

	effectiveBoardList, err := h.authzRepo.GetBoardListByCardIDAndBoardID(cardID, boardListID)
	if err != nil {
		return nil, domainerr.ErrForbidden
	}

	boardMinRoleSpec := authzdto.PolicySpec{
		PolicyKind: authzdto.PolicyRequireMinimumFactValue,
		FactKind:   authzdto.FactBoardRole,
		Value:      authzdto.NewBoardRoleFact(rbac.Member),
	}

	workspaceMinRoleSpec := authzdto.PolicySpec{
		PolicyKind: authzdto.PolicyRequireMinimumFactValue,
		FactKind:   authzdto.FactActorWorkspaceRole,
		Value:      authzdto.NewWorkspaceRoleFact(rbac.Member),
	}

	boardListEditableSpec := authzdto.PolicySpec{
		PolicyKind: authzdto.PolicyRequireExactFactValue,
		FactKind:   authzdto.FactBoardListAccessMode,
		Value:      authzdto.NewBoardListAccessModeFact(rbac.BoardListEditable),
	}

	cardEffectiveListSpec := authzdto.PolicySpec{
		PolicyKind: authzdto.PolicyRequireExactFactValue,
		FactKind:   authzdto.FactCardEffectiveBoardListID,
		Value:      authzdto.NewCardEffectiveBoardListIDFact(effectiveBoardList.ID),
	}

	policies := []authzdto.PolicySpec{boardMinRoleSpec, workspaceMinRoleSpec, boardListEditableSpec, cardEffectiveListSpec}

	boardList, err := h.authzRepo.GetBoardListByID(boardListID)
	if err != nil {
		return nil, err
	}
	if boardList == nil {
		return nil, domainerr.ErrNotFound
	}
	userBoard, err := h.authzRepo.GetUserBoard(authzRequest.UserID, boardList.BoardID)
	if err != nil {
		return nil, err
	}
	if userBoard == nil {
		return nil, domainerr.ErrForbidden
	}

	board, err := h.authzRepo.GetBoardByID(boardList.BoardID)
	if err != nil {
		return nil, err
	}

	userWorkspace, err := h.authzRepo.GetWorkspaceUserRole(board.WorkspaceID, authzRequest.UserID)
	if err != nil {
		return nil, err
	}
	if userWorkspace == nil {
		return nil, domainerr.ErrForbidden
	}

	userBoardRole, ok := rbac.ParseRole(userBoard.Role)
	if !ok {
		return nil, domainerr.ErrValidation
	}

	facts := map[authzdto.FactKind]authzdto.Fact{}
	err = authzdto.SetFact(facts, authzdto.FactBoardRole, authzdto.NewBoardRoleFact(userBoardRole))
	if err != nil {
		return nil, err
	}
	err = authzdto.SetFact(facts, authzdto.FactActorWorkspaceRole, authzdto.NewWorkspaceRoleFact(userWorkspace.Role))
	if err != nil {
		return nil, err
	}
	err = authzdto.SetFact(facts, authzdto.FactBoardListAccessMode, authzdto.NewBoardListAccessModeFact(boardList.AccessMode))
	if err != nil {
		return nil, err
	}
	err = authzdto.SetFact(facts, authzdto.FactCardEffectiveBoardListID, authzdto.NewCardEffectiveBoardListIDFact(effectiveBoardList.ID))
	if err != nil {
		return nil, err
	}

	context := &authzdto.AuthzContext{
		Facts:       facts,
		PolicySpecs: policies,
	}
	return context, nil
}
