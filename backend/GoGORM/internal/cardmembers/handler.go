package cardmembers

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/server/httperr"
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CardMembersHandler struct {
	service *CardMembersService
}

func NewCardMembersHandler(service *CardMembersService) *CardMembersHandler {
	return &CardMembersHandler{service: service}
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

func (h *CardMembersHandler) GetCardMembersForBoard(c *gin.Context) {
	ctx, userID, _, boardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	members, err := h.service.GetCardMembersForBoard(ctx, *userID, *boardID, *correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "cardmembers.handler.GetCardMembersForBoard")
		return
	}

	c.JSON(http.StatusOK, members)
}

func (h *CardMembersHandler) AddCardMember(c *gin.Context) {
	ctx, userID, workspaceID, boardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	cardIDStr := c.Param("cardID")
	cardID, err := uuid.Parse(cardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "cardmembers.handler.AddCardMember")
		return
	}
	var req AddCardMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "cardmembers.handler.AddCardMember")
		return
	}
	memberID, err := uuid.Parse(req.MemberID)
	if err != nil {
		httperr.WriteParamsError(c, err, "cardmembers.handler.AddCardMember")
		return
	}
	response, err := h.service.AddCardMember(ctx, *userID, *workspaceID, *boardID, cardID, memberID, *correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "cardmembers.handler.AddCardMember")
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *CardMembersHandler) RemoveCardMember(c *gin.Context) {
	ctx, userID, workspaceID, boardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	cardIDStr := c.Param("cardID")
	cardID, err := uuid.Parse(cardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "cardmembers.handler.RemoveCardMember")
		return
	}
	memberIDStr := c.Param("memberID")
	memberID, err := uuid.Parse(memberIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "cardmembers.handler.RemoveCardMember")
		return
	}
	response, err := h.service.RemoveCardMember(ctx, *userID, *workspaceID, *boardID, cardID, memberID, *correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "cardmembers.handler.RemoveCardMember")
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *CardMembersHandler) GetCardMembersForCard(c *gin.Context) {
	ctx, userID, _, boardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	cardIDStr := c.Param("cardID")
	cardID, err := uuid.Parse(cardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "cardmembers.handler.GetCardMembersForCard")
		return
	}
	members, err := h.service.GetCardMembersForCard(ctx, *userID, *boardID, cardID, *correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "cardmembers.handler.GetCardMembersForCard")
		return
	}
	c.JSON(http.StatusOK, members)
}
