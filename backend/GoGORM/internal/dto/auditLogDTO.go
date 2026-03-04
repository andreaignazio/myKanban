package dto

import (
	"GoGORM/models"
	"time"

	"github.com/google/uuid"
)

type AuditLogRequest struct {
	Cursor AuditCursor `json:"Cursor"`
	Limit  int         `json:"Limit"`
}

type AuditCursor struct {
	CreatedAt time.Time `json:"CreatedAt"`
	ID        uuid.UUID `json:"ID"`
}

type AuditPage struct {
	Events     []models.BoardAuditEvent
	NextCursor *AuditCursor
	HasMore    bool
}

type AuditLogPaginatedResponse struct {
	Events     AuditLogResponse
	NextCursor *AuditCursor `json:"NextCursor,omitempty"`
	HasMore    bool         `json:"HasMore"`
}
