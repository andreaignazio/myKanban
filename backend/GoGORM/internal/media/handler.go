package media

import (
	"GoGORM/internal/server/httperr"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type MediaHandler struct {
	mediaService *UnsplashService
}

func NewMediaHandler(mediaService *UnsplashService) *MediaHandler {
	return &MediaHandler{mediaService: mediaService}
}

func (h *MediaHandler) SearchUnsplash(c *gin.Context) {
	q := strings.TrimSpace(c.Query("query"))
	page := 1
	perPage := 12
	orientation := c.DefaultQuery("orientation", "landscape")

	if raw := c.Query("page"); raw != "" {
		if p, err := strconv.Atoi(raw); err == nil && p > 0 {
			page = p
		}
	}

	if raw := c.Query("per_page"); raw != "" {
		if pp, err := strconv.Atoi(raw); err == nil && pp > 0 {
			perPage = pp
		}
	}

	resp, err := h.mediaService.SearchPhotos(c.Request.Context(), q, page, perPage, orientation)
	if err != nil {
		fmt.Printf("Error searching Unsplash: %v\n", err)
		httperr.WriteOp(c, err, "media.handler.SearchUnsplash")
		return
	}

	c.JSON(http.StatusOK, resp)
}
