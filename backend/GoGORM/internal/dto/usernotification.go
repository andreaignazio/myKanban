package dto

import (
	"GoGORM/models"
	"time"

	"github.com/google/uuid"
)

type UserNotificationRow struct {
	models.BoardAuditEvent
	NotificationID        uuid.UUID  `gorm:"column:notification_id"`
	Read                  bool       `gorm:"column:read"`
	NotificationCreatedAt time.Time  `gorm:"column:notification_created_at"`
	NotificationUpdatedAt time.Time  `gorm:"column:notification_updated_at"`
	NotificationDeletedAt *time.Time `gorm:"column:notification_deleted_at"`
}

type UserNotificationResponse struct {
	UnreadCount       int
	UserNotifications []UserAuditNotificationResponse
	Workspaces        []WorkspaceResponse
	Boards            []BoardResponse
	Lists             []ListResponse
	Cards             []CardResponse
	NextCursor        *AuditCursor `json:"NextCursor,omitempty"`
	HasMore           bool         `json:"HasMore"`
}

type NotificationPage struct {
	Rows       []UserNotificationRow
	NextCursor *AuditCursor
	HasMore    bool
}

func UserAuditNotificationRowToResponse(row UserNotificationRow) UserAuditNotificationResponse {
	return UserAuditNotificationResponse{
		BoardAuditLogEventResponse: BoardAuditLogEventResponse{
			ID:             row.ID,
			BoardID:        row.BoardID,
			WorkspaceID:    row.WorkspaceID,
			ActorUserID:    row.ActorUserID,
			ActionType:     row.ActionType,
			MainEntityID:   row.MainEntityID,
			MainEntityType: row.MainEntityType,
			Payload:        row.Payload,
			CreatedAt:      row.CreatedAt,
		},
		NotificationID:        row.NotificationID,
		Read:                  row.Read,
		NotificationCreatedAt: row.NotificationCreatedAt,
		NotificationUpdatedAt: row.NotificationUpdatedAt,
		NotificationDeletedAt: row.NotificationDeletedAt,
	}
}

type MarkNotificationsRequest struct {
	NotificationIDs []uuid.UUID `json:"notificationIDs"`
}
