//go:build debug

package subscription

import (
	"GoGORM/internal/server/httperr"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type debugEmitSuspensionRequest struct {
	TargetUserID string `json:"targetUserID" binding:"required"`
	IsSuspended  bool   `json:"isSuspended"`
}

func (h *SubscriptionHandler) DebugEmitSuspensionEvent(c *gin.Context) {
	ctx := c.Request.Context()
	workspaceID, ok := parseWorkspaceID(c)
	if !ok {
		return
	}

	var req debugEmitSuspensionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "subscription.handler.DebugEmitSuspensionEvent")
		return
	}
	targetUserID, err := uuid.Parse(req.TargetUserID)
	if err != nil {
		httperr.WriteParamsError(c, err, "subscription.handler.DebugEmitSuspensionEvent")
		return
	}

	if h.Service == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "subscription service not configured"})
		return
	}
	if emitErr := h.Service.DebugEmitSuspensionEvent(ctx, workspaceID, targetUserID, uuid.Nil, req.IsSuspended); emitErr != nil {
		httperr.WriteOp(c, emitErr, "subscription.handler.DebugEmitSuspensionEvent")
		return
	}
	c.Status(http.StatusNoContent)
}
