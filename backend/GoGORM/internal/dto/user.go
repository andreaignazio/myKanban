package dto

import (
	"time"

	"github.com/google/uuid"
)

type UserResponse struct {
	ID        uuid.UUID  `json:"ID"`
	Name      string     `json:"Name"`
	Email     string     `json:"Email"`
	Username  string     `json:"Username"`
	AvatarUrl string     `json:"AvatarUrl,omitempty"`
	Props     UserProps  `json:"Props,omitempty"`
	CreatedAt time.Time  `json:"CreatedAt"`
	UpdatedAt time.Time  `json:"UpdatedAt"`
	DeletedAt *time.Time `json:"DeletedAt,omitempty"`
}

type UserLiteRespone struct {
	ID            uuid.UUID `json:"ID"`
	Name          string    `json:"Name"`
	Username      string    `json:"Username"`
	AvatarUrl     string    `json:"AvatarUrl,omitempty"`
	Props         UserProps `json:"Props,omitempty"`
	Role          string    `json:"Role"`
	WorkspaceRole *string   `json:"WorkspaceRole,omitempty"`
}

type UserProps struct {
	Avatar   ImageProps `gorm:"type:jsonb;default:'{}'"`
	Initials string     `gorm:"type:text;"`
	Cover    ImageProps `gorm:"type:jsonb;default:'{}'"`
	Bio      string     `gorm:"type:text;"`
}

type ImageProps struct {
	Type  string `json:"Type,omitempty"`
	Color string `json:"Color"`
	Url   string `json:"Url"`
}
