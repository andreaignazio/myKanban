package userWatch

import (
	"GoGORM/internal/dto"

	"github.com/google/uuid"
)

type UserWatchResponses struct {
	BoardWatches []dto.BoardWatchResponse `json:"BoardWatches,omitempty"`
	Boards       []dto.BoardResponse      `json:"Boards,omitempty"`
	ListWatches  []dto.ListWatchResponse  `json:"ListWatches,omitempty"`
	Lists        []dto.ListResponse       `json:"Lists,omitempty"`
	CardWatches  []dto.CardWatchResponse  `json:"CardWatches,omitempty"`
	Cards        []dto.CardResponse       `json:"Cards,omitempty"`
	Workspaces   []dto.WorkspaceResponse  `json:"Workspaces,omitempty"`
}

type MoveWatchRequest struct {
	InsertAt *string    `json:"InsertAt" binding:"omitempty,oneof=start end"`
	BeforeID *uuid.UUID `json:"BeforeID" binding:"omitempty"`
}

type PatchWatchActiveRequest struct {
	Active bool `json:"Active"`
}
