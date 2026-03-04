package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func CorrelationID() gin.HandlerFunc {
	return func(c *gin.Context) {
		correlationIDStr := c.GetHeader("x-correlation-id")
		if correlationIDStr == "" {
			correlationIDStr = c.Query("correlationID")
		}
		if correlationIDStr == "" {
			correlationIDStr = uuid.New().String()
		}
		correlationID, err := uuid.Parse(correlationIDStr)
		if err != nil {
			correlationID = uuid.New()
		}
		c.Set("correlationID", correlationID)
		c.Next()
	}
}
