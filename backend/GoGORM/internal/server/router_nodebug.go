//go:build !debug

package server

import (
	"GoGORM/internal/subscription"

	"github.com/gin-gonic/gin"
)

func registerDebugRoutes(_ *gin.Engine, _ *subscription.SubscriptionHandler) {}
