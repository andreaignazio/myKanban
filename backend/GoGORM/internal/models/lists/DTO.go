package lists

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type CreateListRequest struct {
	Title       string     `json:"Title" binding:"required"`
	BoardID     uuid.UUID  `json:"BoardID" binding:"required"`
	AfterListID *uuid.UUID `json:"AfterID" binding:"omitempty"`
	InsertAt    *string    `json:"InsertAt" binding:"omitempty"`
}

type ListInBoardResponse struct {
	ID       uuid.UUID `json:"ID"`
	Title    string    `json:"Title"`
	BoardID  uuid.UUID `json:"BoardID"`
	Position string    `json:"Position"`
}

type ListDetailResponseDTO struct {
	ID        uuid.UUID         `json:"ID"`
	Title     string            `json:"Title"`
	DeletedAt *time.Time        `json:"DeletedAt,omitempty"`
	Cards     []CardResponseDTO `json:"Cards"`
}

type CardResponseDTO struct {
	ID              uuid.UUID      `json:"ID"`
	Title           string         `json:"Title"`
	Done            bool           `json:"Done"`
	Description     string         `json:"Description,omitempty"`
	StartDate       *time.Time     `json:"StartDate,omitempty"`
	EndDate         *time.Time     `json:"EndDate,omitempty"`
	Props           datatypes.JSON `json:"Props,omitempty"`
	CreatedByUserID uuid.UUID      `json:"CreatedByUserID"`
	CreatedInListID uuid.UUID      `json:"CreatedInListID"`
	CreatedAt       time.Time      `json:"CreatedAt"`
	UpdatedAt       time.Time      `json:"UpdatedAt"`
	DeletedAt       *time.Time     `json:"DeletedAt,omitempty"`
}

type PatchListPropsRequest struct {
	Props ListProps `json:"Props" binding:"required"`
}

type ListProps map[string]any

type PatchListDetailsRequest struct {
	Title *string `json:"Title,omitempty"`
}
