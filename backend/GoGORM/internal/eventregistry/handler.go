package EventRegistry

import (
	"GoGORM/internal/dto"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type EventRegistryHandler struct {
	service *EventRegistryService
}

func NewEventRegistryHandler(service *EventRegistryService) *EventRegistryHandler {
	return &EventRegistryHandler{service: service}
}

func (h *EventRegistryHandler) GetBoardAuditLog(c *gin.Context) {
	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid board ID"})
		return
	}
	userID := c.MustGet("userID").(uuid.UUID)
	ctx := c.Request.Context()
	cursor, limit, ok := parseAuditPaginationFromQuery(c)
	if !ok {
		return
	}

	auditLog, err := h.service.GetBoardAuditLogPaginated(ctx, boardID, userID, cursor, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get audit log"})
		return
	}
	c.JSON(http.StatusOK, auditLog)
}

func (h *EventRegistryHandler) GetWorkspaceAuditLog(c *gin.Context) {
	workspaceIDStr := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace ID"})
		return
	}

	userID := c.MustGet("userID").(uuid.UUID)
	ctx := c.Request.Context()

	auditLog, err := h.service.GetWorkspaceAuditLog(ctx, workspaceID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get workspace audit log"})
		return
	}
	c.JSON(http.StatusOK, auditLog)
}

func (h *EventRegistryHandler) GetWorkspaceUserActivity(c *gin.Context) {
	workspaceIDStr := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace ID"})
		return
	}

	actorUserID, err := resolveUserPathParam(c, "userID")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	requesterUserID := c.MustGet("userID").(uuid.UUID)
	ctx := c.Request.Context()
	cursor, limit, ok := parseAuditPaginationFromQuery(c)
	if !ok {
		return
	}

	auditLog, err := h.service.GetWorkspaceUserActivityPaginated(ctx, workspaceID, requesterUserID, actorUserID, cursor, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get workspace user activity"})
		return
	}
	c.JSON(http.StatusOK, auditLog)
}

func (h *EventRegistryHandler) GetWorkspaceMyActivity(c *gin.Context) {
	workspaceIDStr := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace ID"})
		return
	}

	requesterUserID := c.MustGet("userID").(uuid.UUID)
	ctx := c.Request.Context()
	cursor, limit, ok := parseAuditPaginationFromQuery(c)
	if !ok {
		return
	}

	auditLog, err := h.service.GetWorkspaceUserActivityPaginated(ctx, workspaceID, requesterUserID, requesterUserID, cursor, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get workspace user activity"})
		return
	}
	c.JSON(http.StatusOK, auditLog)
}

func (h *EventRegistryHandler) GetWorkspaceCardActivity(c *gin.Context) {
	workspaceIDStr := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace ID"})
		return
	}

	cardIDStr := c.Param("cardID")
	cardID, err := uuid.Parse(cardIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid card ID"})
		return
	}

	userID := c.MustGet("userID").(uuid.UUID)
	ctx := c.Request.Context()

	cursor, limit, ok := parseAuditPaginationFromQuery(c)
	if !ok {
		return
	}

	auditLog, err := h.service.GetWorkspaceCardActivityPaginated(ctx, workspaceID, cardID, userID, cursor, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get workspace card activity"})
		return
	}
	c.JSON(http.StatusOK, auditLog)
}

func (h *EventRegistryHandler) GetInboxCardActivity(c *gin.Context) {
	cardIDStr := c.Param("cardID")
	cardID, err := uuid.Parse(cardIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid card ID"})
		return
	}

	userID := c.MustGet("userID").(uuid.UUID)
	ctx := c.Request.Context()

	auditLog, err := h.service.GetInboxCardActivity(ctx, cardID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get inbox card activity"})
		return
	}
	c.JSON(http.StatusOK, auditLog)
}

func (h *EventRegistryHandler) GetUserActivity(c *gin.Context) {
	actorUserID, err := resolveUserPathParam(c, "userID")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	requesterUserID := c.MustGet("userID").(uuid.UUID)
	ctx := c.Request.Context()
	cursor, limit, ok := parseAuditPaginationFromQuery(c)
	if !ok {
		return
	}

	auditLog, err := h.service.GetUserActivityPaginated(ctx, requesterUserID, actorUserID, cursor, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user activity"})
		return
	}
	c.JSON(http.StatusOK, auditLog)
}

func (h *EventRegistryHandler) GetMyActivity(c *gin.Context) {
	requesterUserID := c.MustGet("userID").(uuid.UUID)
	ctx := c.Request.Context()
	cursor, limit, ok := parseAuditPaginationFromQuery(c)
	if !ok {
		return
	}

	auditLog, err := h.service.GetUserActivityPaginated(ctx, requesterUserID, requesterUserID, cursor, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user activity"})
		return
	}
	c.JSON(http.StatusOK, auditLog)
}

func parseAuditPaginationFromQuery(c *gin.Context) (*dto.AuditCursor, int, bool) {
	cursorIdStr := c.Query("cursorID")
	cursorCreatedAtStr := c.Query("cursorCreatedAt")
	var cursor *dto.AuditCursor
	if cursorIdStr != "" && cursorCreatedAtStr != "" {
		cursorID, err := uuid.Parse(cursorIdStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid cursor ID"})
			return nil, 0, false
		}
		cursorCreatedAt, err := time.Parse(time.RFC3339, cursorCreatedAtStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid cursor createdAt"})
			return nil, 0, false
		}
		cursor = &dto.AuditCursor{
			ID:        cursorID,
			CreatedAt: cursorCreatedAt,
		}
	}

	limitStr := c.Query("limit")
	limit := 20
	if limitStr != "" {
		parsedLimit, err := strconv.Atoi(limitStr)
		if err != nil || parsedLimit <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid limit"})
			return nil, 0, false
		}
		limit = parsedLimit
	}

	return cursor, limit, true
}

func resolveUserPathParam(c *gin.Context, param string) (uuid.UUID, error) {
	userIDStr := c.Param(param)
	if userIDStr == "me" {
		return c.MustGet("userID").(uuid.UUID), nil
	}
	return uuid.Parse(userIDStr)
}
