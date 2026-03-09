package inbox

import (
	"github.com/google/uuid"
)

const (
	PositionStart = "start"
	PositionEnd   = "end"
)

type MirrorCardToInboxRequest struct {
	BeforeID *uuid.UUID `json:"BeforeID" binding:"omitempty"`
	InsertAt *string    `json:"InsertAt" binding:"omitempty"`
}

func (r MirrorCardToInboxRequest) InsertAtOrDefault() string {
	if r.InsertAt == nil {
		return PositionEnd
	}
	if *r.InsertAt == PositionStart {
		return PositionStart
	}
	return PositionEnd
}

type CopyCardToInboxRequest struct {
	MirrorCardToInboxRequest
	Title          *string `json:"Title,omitempty"`
	KeepChecklists bool    `json:"KeepChecklists"`
}

type CreateInboxCardRequest struct {
	MirrorCardToInboxRequest
	Title string `json:"Title" binding:"required"`
}

type MoveInboxCardToListInBoardRequest struct {
	BeforeID *uuid.UUID `json:"BeforeID" binding:"omitempty"`
	InsertAt *string    `json:"InsertAt" binding:"omitempty"`
}
