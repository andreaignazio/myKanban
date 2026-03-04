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
