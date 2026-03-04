package ws

import (
	"GoGORM/internal/authz"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/rbac"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
)

type WsService struct {
	MembershipsRepo MembershipsRepo
	WorkspaceRepo   WorkspaceRepo
	IncludeDeleted  bool
}

func NewWsService(membershipsRepo MembershipsRepo, workspaceRepo WorkspaceRepo) *WsService {
	return &WsService{
		MembershipsRepo: membershipsRepo,
		WorkspaceRepo:   workspaceRepo,
		IncludeDeleted:  false,
	}
}

type MembershipsRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
	GetUserLiteWithBoardRoleByID(ctx context.Context, userID uuid.UUID, workspaceID, boardID uuid.UUID) (*models.UserLite, error)
	GetUserLiteWithWorkspaceRoleByID(ctx context.Context, userID uuid.UUID, workspaceID uuid.UUID) (*models.UserLite, error)
}

type WorkspaceRepo interface {
	CheckUserWorkspaceMembership(ctx context.Context, userID, workspaceID uuid.UUID, includeDeleted bool) (bool, error)
}

func (s *WsService) CanViewBoard(ctx context.Context, userID, boardID uuid.UUID) error {
	if err := authz.CheckUserMinRole(ctx, s.MembershipsRepo, userID, boardID, rbac.Viewer, s.IncludeDeleted); err != nil {
		return domainerr.ErrForbidden
	}
	return nil
}

func (s *WsService) CanViewWorkspace(ctx context.Context, userID, workspaceID uuid.UUID) error {
	if ok, err := s.WorkspaceRepo.CheckUserWorkspaceMembership(ctx, userID, workspaceID, s.IncludeDeleted); err != nil || !ok {
		return domainerr.ErrForbidden
	}
	return nil
}

func (s *WsService) GetUserLiteWithBoardRoleByID(ctx context.Context, userID uuid.UUID, workspaceID, boardID uuid.UUID) (*models.UserLite, error) {
	return s.MembershipsRepo.GetUserLiteWithBoardRoleByID(ctx, userID, workspaceID, boardID)
}

func (s *WsService) GetUserLiteWithWorkspaceRoleByID(ctx context.Context, userID uuid.UUID, workspaceID uuid.UUID) (*models.UserLite, error) {
	return s.MembershipsRepo.GetUserLiteWithWorkspaceRoleByID(ctx, userID, workspaceID)
}
