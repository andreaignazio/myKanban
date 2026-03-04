package cardcomments

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/server/httperr"
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CardCommentsHandler struct {
	Service *CardCommentsService
}

func NewCardCommentsHandler(service *CardCommentsService) *CardCommentsHandler {
	return &CardCommentsHandler{
		Service: service,
	}
}
func getUserBoardContext(c *gin.Context) (context.Context, *uuid.UUID, *uuid.UUID, *uuid.UUID, *uuid.UUID, *uuid.UUID, error) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "listcards.handler.CreateCardInList")
		return nil, nil, nil, nil, nil, nil, err
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	workspaceID, ok := c.Get("workspaceID")
	if !ok {
		httperr.WriteParamsError(c, errors.New("workspaceID not found"), "listcards.handler.CreateCardInList")
		return nil, nil, nil, nil, nil, nil, errors.New("workspaceID not found")
	}
	workspaceUUID, ok := workspaceID.(uuid.UUID)
	if !ok || workspaceUUID == uuid.Nil {
		httperr.WriteOp(c, domainerr.ErrValidation, "listcards.handler.CreateCardInListWorkspaceInvalid")
		return nil, nil, nil, nil, nil, nil, errors.New("workspaceID invalid")
	}
	cardIDStr := c.Param("cardID")
	cardID, err := uuid.Parse(cardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.getUserBoardContext")
		return nil, nil, nil, nil, nil, nil, err
	}

	return ctx, &userID, &workspaceUUID, &boardID, &cardID, &correlationID, nil
}

func (h *CardCommentsHandler) CreateCardComment(c *gin.Context) {
	ctx, userID, workspaceID, boardID, cardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	var req CreateCardCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "cardcomments.handler.CreateCardComment")
		return
	}
	comment, err := h.Service.CreateCardComment(ctx, *userID, *workspaceID, *boardID, *cardID, *correlationID, &req)
	if err != nil {
		httperr.WriteOp(c, err, "cardcomments.handler.CreateCardComment")
		return
	}
	c.JSON(http.StatusOK, comment)
}

func (h *CardCommentsHandler) DeleteCardComment(c *gin.Context) {
	ctx, userID, workspaceID, boardID, cardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	commentIDStr := c.Param("commentID")
	commentID, err := uuid.Parse(commentIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "cardcomments.handler.DeleteCardComment")
		return
	}
	comment, err := h.Service.DeleteCardComment(ctx, *userID, *workspaceID, *boardID, *cardID, commentID, *correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "cardcomments.handler.DeleteCardComment")
		return
	}
	c.JSON(http.StatusOK, comment)
}

func (h *CardCommentsHandler) EditCardComment(c *gin.Context) {
	ctx, userID, workspaceID, boardID, cardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	commentIDStr := c.Param("commentID")
	commentID, err := uuid.Parse(commentIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "cardcomments.handler.EditCardComment")
		return
	}
	var req EditCardCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "cardcomments.handler.EditCardComment")
		return
	}
	comment, err := h.Service.EditCardComment(ctx, *userID, *workspaceID, *boardID, *cardID, commentID, *correlationID, &req)
	if err != nil {
		httperr.WriteOp(c, err, "cardcomments.handler.EditCardComment")
		return
	}
	c.JSON(http.StatusOK, comment)
}

func (h *CardCommentsHandler) GetCardComments(c *gin.Context) {
	ctx, userID, workspaceID, boardID, cardID, _, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	comments, err := h.Service.GetCardComments(ctx, *userID, *workspaceID, *boardID, *cardID)
	if err != nil {
		httperr.WriteOp(c, err, "cardcomments.handler.GetCardComments")
		return
	}
	c.JSON(http.StatusOK, comments)
}
