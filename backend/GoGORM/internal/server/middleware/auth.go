package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func AuthFromHeader() gin.HandlerFunc {
	return func(c *gin.Context) {
		stringID := c.GetHeader("x-userID")
		if stringID == "" {
			stringID = c.Query("userID")
		}
		//fmt.Println("x-userID header:", stringID)
		if stringID == "" {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "missing x-userID header"})
			return
		}
		ID, err := uuid.Parse(stringID)
		//fmt.Println(ID)
		if err != nil || ID == uuid.Nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid x-userID header"})
			return
		}

		c.Set("userID", ID)
		c.Next()

	}
}
