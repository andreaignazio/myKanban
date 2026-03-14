package userNotification

import (
	"GoGORM/internal/dto"
	"GoGORM/internal/server/httperr"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UserNotificationHandler struct {
	Service *UserNotificationService
}

func NewUserNotificationHandler(service *UserNotificationService) *UserNotificationHandler {
	return &UserNotificationHandler{Service: service}
}

func (h *UserNotificationHandler) GetUserNotifications(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	cursor, limit := parseNotificationCursorFromQuery(c)

	notifications, err := h.Service.GetUserNotificationsPaginated(ctx, userID, limit, cursor)
	if err != nil {
		httperr.WriteOp(c, err, "userNotification: error fetching user notifications")
		return
	}

	c.JSON(http.StatusOK, notifications)
}

func parseNotificationCursorFromQuery(c *gin.Context) (*dto.AuditCursor, int) {
	cursorIDStr := c.Query("cursorID")
	cursorCreatedAtStr := c.Query("cursorCreatedAt")
	var cursor *dto.AuditCursor
	if cursorIDStr != "" && cursorCreatedAtStr != "" {
		cursorID, err := uuid.Parse(cursorIDStr)
		if err == nil {
			cursorCreatedAt, err := time.Parse(time.RFC3339, cursorCreatedAtStr)
			if err == nil {
				cursor = &dto.AuditCursor{
					ID:        cursorID,
					CreatedAt: cursorCreatedAt,
				}
			}
		}
	}
	limit := 30
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	return cursor, limit
}

func (h *UserNotificationHandler) MarkNotificationsAsRead(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	var req dto.MarkNotificationsRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteOp(c, err, "userNotification: invalid request body")
		return
	}

	if err := h.Service.MarkNotificationsAsRead(ctx, userID, req.NotificationIDs); err != nil {
		httperr.WriteOp(c, err, "userNotification: error marking notifications as read")
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *UserNotificationHandler) MarkNotificationsAsUnread(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	var req dto.MarkNotificationsRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteOp(c, err, "userNotification: invalid request body")
		return
	}

	if err := h.Service.MarkNotificationsAsUnread(ctx, userID, req.NotificationIDs); err != nil {
		httperr.WriteOp(c, err, "userNotification: error marking notifications as unread")
		return
	}

	c.Status(http.StatusNoContent)
}
