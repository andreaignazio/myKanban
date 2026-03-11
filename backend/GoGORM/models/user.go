package models

import (
	"GoGORM/internal/rbac"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey"`
	Name         string
	ClerkUserID  string         `gorm:"type:text;uniqueIndex"`
	Email        string         `gorm:"type:text;uniqueIndex"`
	Username     string         `gorm:"type:text;uniqueIndex"`
	PasswordHash string         `gorm:"type:text;not null;default:''"`
	AvatarUrl    string         `gorm:"type:text;"`
	Props        datatypes.JSON `gorm:"type:jsonb;default:'{}'"`
	CardComments []CardComment  `gorm:"foreignKey:CreatedByUserID;references:ID;constraint:OnDelete:RESTRICT;"`
	TimeStamps
}

type UserLite struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey"`
	Name          string
	Username      string
	AvatarUrl     string
	Props         datatypes.JSON `gorm:"type:jsonb;default:'{}'"`
	Role          *rbac.Role     `gorm:"column:user_board_role"`
	WorkspaceRole *rbac.Role     `gorm:"column:workspace_user_role"`
}
