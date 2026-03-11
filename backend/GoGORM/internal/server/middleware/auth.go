package middleware

import (
	"GoGORM/internal/authn"
	"net/http"

	"github.com/gin-gonic/gin"
)

func AuthFromHeader(authenticator *authn.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		identity, err := authenticator.AuthenticateRequest(c.Request.Context(), c.Request)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}

		c.Set("userID", identity.UserID)
		if identity.ClerkUserID != "" {
			c.Set("clerkUserID", identity.ClerkUserID)
		}
		c.Next()

	}
}
