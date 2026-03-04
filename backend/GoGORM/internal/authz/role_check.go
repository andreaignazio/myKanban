package authz

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/rbac"
	"context"

	"github.com/google/uuid"
)

type RoleGetter interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
}

type WorkspaceRoleGetter interface {
	GetUserWorkspaceRole(ctx context.Context, userID, workspaceID uuid.UUID, includeDeleted bool) (string, error)
}

func CheckUserMinRole(ctx context.Context, repo RoleGetter, userID, boardID uuid.UUID, minRole rbac.Role, includeDeleted bool) error {
	userRoleString, err := repo.GetUserRole(ctx, userID, boardID, includeDeleted)
	if err != nil {
		return domainerr.MapRepoErr(err, true)
	}
	_, err = domainerr.ParseAndCheckRole(userRoleString, minRole)
	if err != nil {
		return err
	}
	return nil
}

func CheckUserMinWorkspaceRole(ctx context.Context, repo WorkspaceRoleGetter, userID, workspaceID uuid.UUID, minRole rbac.Role, includeDeleted bool) error {
	userRoleString, err := repo.GetUserWorkspaceRole(ctx, userID, workspaceID, includeDeleted)
	if err != nil {
		return domainerr.MapRepoErr(err, true)
	}
	_, err = domainerr.ParseAndCheckRole(userRoleString, minRole)
	if err != nil {
		return err
	}
	return nil
}
