package middleware

import (
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type workspaceIDContextKey struct{}

func WorkspaceIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	if ctx == nil {
		return uuid.Nil, false
	}
	workspaceID, ok := ctx.Value(workspaceIDContextKey{}).(uuid.UUID)
	if !ok || workspaceID == uuid.Nil {
		return uuid.Nil, false
	}
	return workspaceID, true
}

func ResolveWorkspaceFromBoardID(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Param("workspaceID") != "" {
			c.Next()
			return
		}

		boardIDRaw := c.Param("boardID")
		if boardIDRaw == "" {
			c.Next()
			return
		}

		boardID, err := uuid.Parse(boardIDRaw)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid boardID"})
			return
		}

		var row struct {
			WorkspaceID *uuid.UUID `gorm:"column:workspace_id"`
		}

		err = db.WithContext(c.Request.Context()).
			Table("boards").
			Select("workspace_id").
			Where("id = ?", boardID).
			Where("deleted_at IS NULL").
			Take(&row).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "board not found"})
				return
			}
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "failed resolving workspace"})
			return
		}
		if row.WorkspaceID == nil || *row.WorkspaceID == uuid.Nil {
			c.AbortWithStatusJSON(http.StatusUnprocessableEntity, gin.H{"error": "board has no workspace"})
			return
		}

		workspaceID := *row.WorkspaceID
		c.Set("workspaceID", workspaceID)
		ctx := context.WithValue(c.Request.Context(), workspaceIDContextKey{}, workspaceID)
		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}

// RequireMemberNotSuspended blocks requests from workspace members whose
// membership has been suspended (is_suspended = true). It resolves the
// workspaceID from (in order of preference):
//  1. Gin context key "workspaceID" set by ResolveWorkspaceFromBoardID (board-scoped routes)
//  2. Path param ":workspaceID" (workspace-scoped routes like /workspaces/:workspaceID/...)
//
// Routes without any workspaceID are transparently skipped.
// Workspace owners are never blocked.
func RequireMemberNotSuspended(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var workspaceID uuid.UUID

		if val, exists := c.Get("workspaceID"); exists {
			if id, ok := val.(uuid.UUID); ok && id != uuid.Nil {
				workspaceID = id
			}
		}
		if workspaceID == uuid.Nil {
			if raw := c.Param("workspaceID"); raw != "" {
				if id, err := uuid.Parse(raw); err == nil && id != uuid.Nil {
					workspaceID = id
				}
			}
		}
		if workspaceID == uuid.Nil {
			c.Next()
			return
		}

		userIDVal, exists := c.Get("userID")
		if !exists {
			c.Next()
			return
		}
		userID, ok := userIDVal.(uuid.UUID)
		if !ok || userID == uuid.Nil {
			c.Next()
			return
		}

		var row struct {
			Role        string `gorm:"column:role"`
			IsSuspended bool   `gorm:"column:is_suspended"`
		}
		err := db.WithContext(c.Request.Context()).
			Table("user_workspaces").
			Select("role, is_suspended").
			Where("user_id = ? AND workspace_id = ? AND deleted_at IS NULL", userID, workspaceID).
			Limit(1).
			Take(&row).Error
		if err != nil {
			// Not a member or DB error — let the handler deal with auth.
			c.Next()
			return
		}

		if row.IsSuspended && row.Role != "owner" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"Code":    "member_suspended",
				"Message": "your workspace membership is suspended",
			})
			return
		}

		c.Next()
	}
}
