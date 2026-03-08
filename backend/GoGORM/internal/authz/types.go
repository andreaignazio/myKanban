package authz

import (
	"GoGORM/internal/rbac"
	"GoGORM/models"

	"github.com/google/uuid"
)

type WorkspaceMember struct {
	UserID      uuid.UUID
	WorkspaceID uuid.UUID
	Role        rbac.Role
}

type WorkspaceSubscription struct {
	WorkspaceID  uuid.UUID
	Subscription models.WorkspaceSubscription
}
