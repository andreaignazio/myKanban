//go:build debug

package server

import (
	"GoGORM/internal/subscription"

	"github.com/gin-gonic/gin"
)

func registerDebugRoutes(r *gin.Engine, subscriptionHandler *subscription.SubscriptionHandler) {
	r.POST("/debug/workspaces/:workspaceID/subscription/emit-suspension", subscriptionHandler.DebugEmitSuspensionEvent)
}
