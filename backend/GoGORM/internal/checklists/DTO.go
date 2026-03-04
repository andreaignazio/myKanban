package checklists

import (
	"GoGORM/internal/dto"

	"github.com/google/uuid"
)

type CreateChecklistRequest struct {
	Title    string     `json:"Title" binding:"required"`
	InsertAt *string    `json:"InsertAt,omitempty"`
	BeforeID *uuid.UUID `json:"BeforeId,omitempty"`
}

type CloneChecklistRequest struct {
	NewTitle          string    `json:"NewTitle" binding:"required"`
	ChecklistIDSource uuid.UUID `json:"ChecklistIDSource" binding:"required,uuid"`
}

type PatchChecklistRequest struct {
	Title *string `json:"Title,omitempty"`
}

type MoveChecklistRequest struct {
	InsertAt *string    `json:"InsertAt,omitempty"`
	BeforeID *uuid.UUID `json:"BeforeId,omitempty"`
}

type CreateChecklistEntryRequest struct {
	Title    string     `json:"Title" binding:"required"`
	InsertAt *string    `json:"InsertAt,omitempty"`
	BeforeID *uuid.UUID `json:"BeforeId,omitempty"`
}

type PatchChecklistEntryRequest struct {
	Title   *string `json:"Title,omitempty"`
	Done    *bool   `json:"Done,omitempty"`
	DueDate *string `json:"DueDate,omitempty"`
}

type MoveChecklistEntryRequest struct {
	InsertAt *string    `json:"InsertAt,omitempty"`
	BeforeID *uuid.UUID `json:"BeforeId,omitempty"`
}

type AddMemberToChecklistEntryRequest struct {
	MemberID uuid.UUID `json:"MemberId" binding:"required,uuid"`
}

type ChecklistRowResponse struct {
	Chacklist     *dto.ChecklistResponse
	CardChecklist *dto.CardChecklistResponse
	Entries       []dto.ChecklistEntryResponse
}

type ChecklistEntryRowResponse struct {
	Entry          *dto.EntryResponse
	ChecklistEntry *dto.ChecklistEntryResponse
}

type CloneChecklistResponse struct {
	CardID           uuid.UUID                    `json:"CardID"`
	CardChecklist    *dto.CardChecklistResponse   `json:"CardChecklist"`
	Checklist        *dto.ChecklistResponse       `json:"Checklist"`
	Entries          []dto.EntryResponse          `json:"Entries"`
	ChecklistEntries []dto.ChecklistEntryResponse `json:"ChecklistEntries"`
}

type CloneChecklistRealtimePayload struct {
	CardID           uuid.UUID                    `json:"CardID"`
	CardChecklist    dto.CardChecklistResponse    `json:"CardChecklist"`
	Checklist        dto.ChecklistResponse        `json:"Checklist"`
	Entries          []dto.EntryResponse          `json:"Entries"`
	ChecklistEntries []dto.ChecklistEntryResponse `json:"ChecklistEntries"`
}

type CrossMoveChecklistEntryRequest struct {
	TargetChecklistID uuid.UUID  `json:"TargetChecklistId" binding:"required,uuid"`
	TargetBeforeID    *uuid.UUID `json:"TargetBeforeId" binding:"omitempty,uuid"`
	InsertAt          *string    `json:"InsertAt,omitempty"`
}

type ConvertChecklistEntryRequest struct {
	EntryID uuid.UUID `json:"EntryID" binding:"required,uuid"`
	CardID  uuid.UUID `json:"CardID" binding:"required,uuid"`
	ListID  uuid.UUID `json:"ListID" binding:"required,uuid"`
	BoardID uuid.UUID `json:"BoardID" binding:"required,uuid"`
}

type ConvertChecklistEntryResponse struct {
	Card           *dto.CardResponse     `json:"Card"`
	ListCard       *dto.ListCardResponse `json:"ListCard"`
	ListCardIDs    []uuid.UUID           `json:"ListCardIDs"`
	ListID         uuid.UUID             `json:"ListID"`
	ChecklistID    uuid.UUID             `json:"ChecklistID"`
	EntryIDs       []uuid.UUID           `json:"EntryIDs"`
	DeletedEntryID uuid.UUID             `json:"DeletedEntryID"`
}

type ConvertChecklistEntryRealtimePayload struct {
	CardID         uuid.UUID   `json:"CardID"`
	ListCardID     uuid.UUID   `json:"ListCardID"`
	ListID         uuid.UUID   `json:"ListID"`
	ListCardIDs    []uuid.UUID `json:"ListCardIDs"`
	ChecklistID    uuid.UUID   `json:"ChecklistID"`
	EntryIDs       []uuid.UUID `json:"EntryIDs"`
	DeletedEntryID uuid.UUID   `json:"DeletedEntryID"`
}
