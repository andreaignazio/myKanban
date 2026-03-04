package userWatch

import (
	"GoGORM/internal/server/httperr"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UserWathcHandler struct {
	service *UserWatchService
}

type UserWatchHandler = UserWathcHandler

func NewUserWatchHandler(service *UserWatchService) *UserWathcHandler {
	return &UserWathcHandler{service: service}
}

func (h *UserWathcHandler) CreateListWatch(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "userwatch.handler.CreateListWatchParseBoardID")
		return
	}
	listIDStr := c.Param("listID")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "userwatch.handler.CreateListWatchParseListID")
		return
	}
	res, err := h.service.CreateUserWatchRelation(ctx, userID, boardID, listID, "list")
	if err != nil {
		httperr.WriteOp(c, err, "userwatch.handler.CreateListWatch")
		return
	}
	c.JSON(http.StatusCreated, res)

}

func (h *UserWathcHandler) CreateCardWatch(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "userwatch.handler.CreateCardWatchParseBoardID")
		return
	}
	cardIDStr := c.Param("cardID")
	cardID, err := uuid.Parse(cardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "userwatch.handler.CreateCardWatchParseCardID")
		return
	}

	response, err := h.service.CreateUserWatchRelation(ctx, userID, boardID, cardID, "card")
	if err != nil {
		httperr.WriteOp(c, err, "userwatch.handler.CreateCardWatch")
		return
	}

	c.JSON(http.StatusCreated, response)
}

func (h *UserWathcHandler) CreateBoardWatch(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "userwatch.handler.CreateBoardWatchParseBoardID")
		return
	}
	response, err := h.service.CreateUserWatchRelation(ctx, userID, boardID, boardID, "board")
	if err != nil {
		httperr.WriteOp(c, err, "userwatch.handler.CreateBoardWatch")
		return
	}
	c.JSON(http.StatusCreated, response)
}

func (h *UserWathcHandler) DeleteListWatch(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	watchIDStr := c.Param("watchID")
	watchID, err := uuid.Parse(watchIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "userwatch.handler.DeleteListWatchParseWatchID")
		return
	}
	err = h.service.DeleteUserWatchRelation(ctx, userID, watchID, "list")
	if err != nil {
		httperr.WriteOp(c, err, "userwatch.handler.DeleteListWatch")
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *UserWathcHandler) DeleteCardWatch(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	watchIDStr := c.Param("watchID")
	watchID, err := uuid.Parse(watchIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "userwatch.handler.DeleteCardWatchParseWatchID")
		return
	}
	err = h.service.DeleteUserWatchRelation(ctx, userID, watchID, "card")
	if err != nil {
		httperr.WriteOp(c, err, "userwatch.handler.DeleteCardWatch")
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *UserWathcHandler) DeleteBoardWatch(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	watchIDStr := c.Param("watchID")
	watchID, err := uuid.Parse(watchIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "userwatch.handler.DeleteBoardWatchParseWatchID")
		return
	}
	err = h.service.DeleteUserWatchRelation(ctx, userID, watchID, "board")
	if err != nil {
		httperr.WriteOp(c, err, "userwatch.handler.DeleteBoardWatch")
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *UserWathcHandler) GetListWatch(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	res, err := h.service.GetUserWatchesByType(ctx, userID, "list")
	if err != nil {
		httperr.WriteOp(c, err, "userwatch.handler.GetListWatch")
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *UserWathcHandler) GetCardWatch(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	res, err := h.service.GetUserWatchesByType(ctx, userID, "card")
	if err != nil {
		httperr.WriteOp(c, err, "userwatch.handler.GetCardWatch")
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *UserWathcHandler) GetBoardWatch(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	res, err := h.service.GetUserWatchesByType(ctx, userID, "board")
	if err != nil {
		httperr.WriteOp(c, err, "userwatch.handler.GetBoardWatch")
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *UserWathcHandler) GetAllWatches(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	res, err := h.service.GetAllUserWatches(ctx, userID)
	if err != nil {
		httperr.WriteOp(c, err, "userwatch.handler.GetAllWatches")
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *UserWathcHandler) PatchListWatch(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	watchIDStr := c.Param("watchID")
	watchID, err := uuid.Parse(watchIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "userwatch.handler.PatchListWatchParseWatchID")
		fmt.Println("Error parsing watchID:", err)
		return
	}
	var req PatchWatchActiveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "userwatch.handler.PatchListWatch")
		fmt.Println("Error binding JSON:", err)
		return
	}
	res, err := h.service.PatchUserWatchRelation(ctx, userID, watchID, "list", req)
	if err != nil {
		httperr.WriteOp(c, err, "userwatch.handler.PatchListWatch")
		fmt.Println("Error patching user watch relation:", err)
		return
	}
	c.JSON(http.StatusOK, res)
}
func (h *UserWathcHandler) PatchCardWatch(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	watchIDStr := c.Param("watchID")
	watchID, err := uuid.Parse(watchIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "userwatch.handler.PatchCardWatchParseWatchID")
		return
	}
	var req PatchWatchActiveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "userwatch.handler.PatchCardWatch")
		return
	}
	res, err := h.service.PatchUserWatchRelation(ctx, userID, watchID, "card", req)
	if err != nil {
		httperr.WriteOp(c, err, "userwatch.handler.PatchCardWatch")
		return
	}
	c.JSON(http.StatusOK, res)
}
func (h *UserWathcHandler) PatchBoardWatch(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	watchIDStr := c.Param("watchID")
	watchID, err := uuid.Parse(watchIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "userwatch.handler.PatchBoardWatchParseWatchID")
		return
	}
	var req PatchWatchActiveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "userwatch.handler.PatchBoardWatch")
		return
	}
	res, err := h.service.PatchUserWatchRelation(ctx, userID, watchID, "board", req)
	if err != nil {
		httperr.WriteOp(c, err, "userwatch.handler.PatchBoardWatch")
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *UserWathcHandler) MoveListWatch(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	watchIDStr := c.Param("watchID")
	watchID, err := uuid.Parse(watchIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "userwatch.handler.MoveListWatchParseWatchID")
		return
	}
	var req MoveWatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "userwatch.handler.MoveListWatch")
		return
	}
	res, err := h.service.MoveUserWatchRelation(ctx, userID, watchID, "list", req)
	if err != nil {
		httperr.WriteOp(c, err, "userwatch.handler.MoveListWatch")
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *UserWathcHandler) MoveCardWatch(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	watchIDStr := c.Param("watchID")
	watchID, err := uuid.Parse(watchIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "userwatch.handler.MoveCardWatchParseWatchID")
		return
	}
	var req MoveWatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "userwatch.handler.MoveCardWatch")
		return
	}
	res, err := h.service.MoveUserWatchRelation(ctx, userID, watchID, "card", req)
	if err != nil {
		httperr.WriteOp(c, err, "userwatch.handler.MoveCardWatch")
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *UserWathcHandler) MoveBoardWatch(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	watchIDStr := c.Param("watchID")
	watchID, err := uuid.Parse(watchIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "userwatch.handler.MoveBoardWatchParseWatchID")
		return
	}
	var req MoveWatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "userwatch.handler.MoveBoardWatch")
		return
	}
	res, err := h.service.MoveUserWatchRelation(ctx, userID, watchID, "board", req)
	if err != nil {
		httperr.WriteOp(c, err, "userwatch.handler.MoveBoardWatch")
		return
	}
	c.JSON(http.StatusOK, res)
}
