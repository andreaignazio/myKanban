package userNotification

import (
	"GoGORM/internal/dto"
	"GoGORM/internal/server/httperr"
	"net/http"

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

	notifications, err := h.Service.GetUserNotifications(ctx, userID)
	if err != nil {
		httperr.WriteOp(c, err, "userNotification: error fetching user notifications")
		return
	}

	c.JSON(http.StatusOK, notifications)
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
