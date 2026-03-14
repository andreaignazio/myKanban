package authzcontext

import (
	"GoGORM/internal/authzdto"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/rbac"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
)

type AuthzCardsHandler struct {
	authzRepo authzRepo
	mode      AuthzCardsHandlerMode
}

type AuthzCardsHandlerMode string

const (
	AuthzCardsHandlerModePatchBoardCard       AuthzCardsHandlerMode = "patchBoardCard"
	AuthzCardsHandlerModePatchInboxMirrorCard AuthzCardsHandlerMode = "patchInboxMirrorCard"
)

func NewAuthzCardsHandlerPatchBoardCard(authzRepo authzRepo) *AuthzCardsHandler {
	return &AuthzCardsHandler{
		authzRepo: authzRepo,
		mode:      AuthzCardsHandlerModePatchBoardCard,
	}
}

func NewAuthzCardsHandlerPatchInboxMirrorCard(authzRepo authzRepo) *AuthzCardsHandler {
	return &AuthzCardsHandler{
		authzRepo: authzRepo,
		mode:      AuthzCardsHandlerModePatchInboxMirrorCard,
	}
}

func (h *AuthzCardsHandler) BuildAuthzContext(ctx context.Context, authzRequest authzdto.Request) (*authzdto.AuthzContext, error) {
	_, boardListID, effectiveBoardListID, boardList, err := h.resolveBoardListContext(ctx, authzRequest)
	if err != nil {
		return nil, err
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
		Value:      authzdto.NewCardEffectiveBoardListIDFact(effectiveBoardListID),
	}

	policies := []authzdto.PolicySpec{boardMinRoleSpec, workspaceMinRoleSpec, boardListEditableSpec, cardEffectiveListSpec}

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
	err = authzdto.SetFact(facts, authzdto.FactCardEffectiveBoardListID, authzdto.NewCardEffectiveBoardListIDFact(boardListID))
	if err != nil {
		return nil, err
	}

	context := &authzdto.AuthzContext{
		Facts:       facts,
		PolicySpecs: policies,
	}
	//fmt.Println("Built authz context for card patch:", context)
	return context, nil
}

func (h *AuthzCardsHandler) resolveBoardListContext(ctx context.Context, authzRequest authzdto.Request) (uuid.UUID, uuid.UUID, uuid.UUID, *models.BoardList, error) {
	switch h.mode {
	case AuthzCardsHandlerModePatchBoardCard:
		payload := authzRequest.Payload.BoardCardPatchPayload
		if payload == nil {
			return uuid.Nil, uuid.Nil, uuid.Nil, nil, domainerr.ErrValidation
		}

		/*boardList, err := h.authzRepo.GetBoardListByListCardIDAndBoardID(ctx, payload.ListCardID, payload.BoardID)
		if err != nil {
			return uuid.Nil, uuid.Nil, uuid.Nil, nil, err
		}
		if boardList == nil {
			return uuid.Nil, uuid.Nil, uuid.Nil, nil, domainerr.ErrNotFound
		}

		return payload.CardID, boardList.ID, boardList.ID, boardList, nil*/
		rootBoardList, err := h.ResolveRootBoardListFromCardID(ctx, payload.CardID)
		if err != nil {
			return uuid.Nil, uuid.Nil, uuid.Nil, nil, err
		}
		return payload.CardID, rootBoardList.ID, rootBoardList.ID, rootBoardList, nil

	case AuthzCardsHandlerModePatchInboxMirrorCard:
		payload := authzRequest.Payload.InboxMirrorCardPatchPayload
		if payload == nil {
			return uuid.Nil, uuid.Nil, uuid.Nil, nil, domainerr.ErrValidation
		}

		boardList, err := h.authzRepo.GetBoardListByID(payload.BoardListID)
		if err != nil {
			return uuid.Nil, uuid.Nil, uuid.Nil, nil, err
		}
		if boardList == nil {
			return uuid.Nil, uuid.Nil, uuid.Nil, nil, domainerr.ErrNotFound
		}

		effectiveBoardList, err := h.authzRepo.GetBoardListByCardIDAndBoardID(payload.CardID, boardList.BoardID)
		if err != nil {
			return uuid.Nil, uuid.Nil, uuid.Nil, nil, domainerr.ErrForbidden
		}
		if effectiveBoardList == nil {
			return uuid.Nil, uuid.Nil, uuid.Nil, nil, domainerr.ErrForbidden
		}

		return payload.CardID, payload.BoardListID, effectiveBoardList.ID, boardList, nil
	default:
		return uuid.Nil, uuid.Nil, uuid.Nil, nil, domainerr.ErrUnsupportedAction
	}
}

func (h *AuthzCardsHandler) ResolveRootBoardListFromCardID(ctx context.Context, cardID uuid.UUID) (*models.BoardList, error) {

	rootListCard, err := h.authzRepo.GetRootListCardByCardID(ctx, cardID)
	if err != nil {
		return nil, err
	}
	if rootListCard == nil {
		return nil, domainerr.ErrNotFound
	}
	rootBoardList, err := h.authzRepo.GetRootBoardListByListID(ctx, rootListCard.ListID)
	if err != nil {
		return nil, err
	}
	if rootBoardList == nil {
		return nil, domainerr.ErrNotFound
	}
	return rootBoardList, nil
}
