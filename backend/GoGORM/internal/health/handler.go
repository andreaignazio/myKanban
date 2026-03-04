package health

import "github.com/gin-gonic/gin"

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetStatus(c *gin.Context) {

	status:= h.svc.Status()

	c.JSON(200, gin.H{"status" : status})
}
