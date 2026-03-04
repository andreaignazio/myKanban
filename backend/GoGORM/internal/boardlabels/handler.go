package BoardLabels

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	"GoGORM/internal/server/httperr"
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type BoardLabelsHandler struct {
	service *BoardLabelsService
}

func NewBoardLabelsHandler(service *BoardLabelsService) *BoardLabelsHandler {
	return &BoardLabelsHandler{service: service}
}

func getUserBoardContext(c *gin.Context) (context.Context, *uuid.UUID, *uuid.UUID, *uuid.UUID, *uuid.UUID, error) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "listcards.handler.CreateCardInList")
		return nil, nil, nil, nil, nil, err
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	workspaceID, ok := c.Get("workspaceID")
	if !ok {
		httperr.WriteParamsError(c, errors.New("workspaceID not found"), "listcards.handler.CreateCardInList")
		return nil, nil, nil, nil, nil, errors.New("workspaceID not found")
	}
	workspaceUUID, ok := workspaceID.(uuid.UUID)
	if !ok || workspaceUUID == uuid.Nil {
		httperr.WriteOp(c, domainerr.ErrValidation, "listcards.handler.CreateCardInListWorkspaceInvalid")
		return nil, nil, nil, nil, nil, errors.New("workspaceID invalid")
	}

	return ctx, &userID, &workspaceUUID, &boardID, &correlationID, nil
}

func (h *BoardLabelsHandler) GetBoardLabels(c *gin.Context) {
	ctx, userID, workspaceID, boardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	labels, err := h.service.GetBoardLabels(ctx, *userID, *workspaceID, *boardID, *correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "boardlabels.handler.GetBoardLabels")
		return
	}
	response := dto.BoardLabelsToResponses(labels)

	c.JSON(http.StatusOK, response)
}

func (h *BoardLabelsHandler) CreateBoardLabel(c *gin.Context) {
	ctx, userID, workspaceID, boardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	var req CreateBoardLabelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "boardlabels.handler.CreateBoardLabel")
		return
	}
	label, err := h.service.CreateBoardLabel(ctx, *userID, *workspaceID, *boardID, *correlationID, req)
	if err != nil {
		fmt.Println("Error creating board label:", err)
		httperr.WriteOp(c, err, "boardlabels.handler.CreateBoardLabel")
		return
	}
	response := dto.BoardLabelToResponse(label)

	c.JSON(http.StatusOK, response)
}

func (h *BoardLabelsHandler) DeleteBoardLabel(c *gin.Context) {
	ctx, userID, workspaceID, boardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	labelIDStr := c.Param("labelID")
	labelID, err := uuid.Parse(labelIDStr)
	if err != nil {
		fmt.Println("Error parsing label ID:", err)
		httperr.WriteParamsError(c, err, "boardlabels.handler.DeleteBoardLabel")
		return
	}
	err = h.service.DeleteBoardLabel(ctx, *userID, *workspaceID, *boardID, labelID, *correlationID)
	if err != nil {
		fmt.Println("Error deleting board label:", err)
		httperr.WriteOp(c, err, "boardlabels.handler.DeleteBoardLabel")
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *BoardLabelsHandler) PatchBoardLabel(c *gin.Context) {
	ctx, userID, workspaceID, boardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	labelIDStr := c.Param("labelID")
	labelID, err := uuid.Parse(labelIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "boardlabels.handler.PatchBoardLabel")
		return
	}
	var req PatchBoardLabelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "boardlabels.handler.PatchBoardLabel")
		return
	}

	label, err := h.service.PatchBoardLabel(ctx, *userID, *workspaceID, *boardID, labelID, *correlationID, req)
	if err != nil {
		httperr.WriteOp(c, err, "boardlabels.handler.PatchBoardLabel")
		return
	}

	c.JSON(http.StatusOK, label)
}

func (h *BoardLabelsHandler) AddLabelToCard(c *gin.Context) {
	ctx, userID, workspaceID, boardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	cardIDStr := c.Param("cardID")
	cardID, err := uuid.Parse(cardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "boardlabels.handler.AddLabelToCard")
		return
	}
	labelIDStr := c.Param("labelID")
	labelID, err := uuid.Parse(labelIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "boardlabels.handler.AddLabelToCard")
		return
	}
	cardLabel, err := h.service.AddLabelToCard(ctx, *userID, *workspaceID, *boardID, cardID, labelID, *correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "boardlabels.handler.AddLabelToCard")
		return
	}
	c.JSON(http.StatusOK, cardLabel)
}

func (h *BoardLabelsHandler) RemoveLabelFromCard(c *gin.Context) {
	ctx, userID, workspaceID, boardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	cardIDStr := c.Param("cardID")
	cardID, err := uuid.Parse(cardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "boardlabels.handler.RemoveLabelFromCard")
		return
	}
	labelIDStr := c.Param("labelID")
	labelID, err := uuid.Parse(labelIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "boardlabels.handler.RemoveLabelFromCard")
		return
	}
	label, err := h.service.RemoveLabelFromCard(ctx, *userID, *workspaceID, *boardID, cardID, labelID, *correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "boardlabels.handler.RemoveLabelFromCard")
		return
	}
	c.JSON(http.StatusOK, label)
}
