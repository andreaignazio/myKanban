package sharelinks

import (
	"GoGORM/internal/dto"
	"GoGORM/internal/server/httperr"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ShareLinksHandler struct {
	service *ShareLinkService
}

func NewShareLinksHandler(service *ShareLinkService) *ShareLinksHandler {
	return &ShareLinksHandler{service: service}
}

func (h *ShareLinksHandler) CreateShareLink(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	var req CreateShareLinkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "sharelinks.handler.CreateShareLink")
		return
	}
	shareLink, err := h.service.CreateShareLink(ctx, userID, req)
	if err != nil {
		httperr.Write(c, err)
		return
	}
	res := dto.PublicShareLinkToResponse(shareLink)
	c.JSON(http.StatusCreated, res)

}

func (h *ShareLinksHandler) ClaimShareLink(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	token := c.Param("token")

	sharelink, err := h.service.ClaimShareLink(ctx, userID, correlationID, token)
	if err != nil {
		httperr.Write(c, err)
		return
	}
	c.JSON(http.StatusOK, sharelink)

}

func (h *ShareLinksHandler) RevokeShareLink(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	token := c.Param("token")

	shareLink, err := h.service.RevokeShareLink(ctx, userID, token)
	if err != nil {
		httperr.Write(c, err)
		return
	}
	response := dto.PublicShareLinkToResponse(shareLink)

	c.JSON(http.StatusOK, response)

}

func (h *ShareLinksHandler) JoinViaShareLink(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	token := c.Param("token")

	sharelink, err := h.service.ClaimShareLink(ctx, userID, correlationID, token)
	if err != nil {
		httperr.Write(c, err)
		return
	}
	c.JSON(http.StatusOK, sharelink)
}

func (h *ShareLinksHandler) GetPublicShareLinkByToken(c *gin.Context) {
	ctx := c.Request.Context()
	token := c.Param("token")

	shareLink, err := h.service.GetPublicShareLinkByToken(ctx, token)
	if err != nil {
		httperr.Write(c, err)
		return
	}

	c.JSON(http.StatusOK, shareLink)
}

func (h *ShareLinksHandler) GetAuthenticatedShareLinkByToken(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	token := c.Param("token")

	shareLink, err := h.service.GetAuthenticatedShareLinkByToken(ctx, userID, token)
	if err != nil {
		httperr.Write(c, err)
		return
	}

	c.JSON(http.StatusOK, shareLink)
}

func (s *ShareLinksHandler) GetShareLinksByTargetID(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	targetIDStr := c.Param("targetID")
	targetID, err := uuid.Parse(targetIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "sharelinks.handler.GetShareLinksByTargetID")
		return
	}
	shareLinks, err := s.service.GetShareLinksByTargetID(ctx, userID, targetID)
	if err != nil {
		httperr.Write(c, err)
		return
	}

	c.JSON(http.StatusOK, shareLinks)
}
