package inbox

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/models/cards"
	"GoGORM/internal/server/httperr"
	"context"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type InboxHandler struct {
	inboxService *InboxService
}

func NewInboxHandler(inboxService *InboxService) *InboxHandler {
	return &InboxHandler{
		inboxService: inboxService,
	}
}

func getUserBoardCardContext(c *gin.Context) (context.Context, *uuid.UUID, *uuid.UUID, *uuid.UUID, error) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "listcards.handler.CreateCardInList")
		return nil, nil, nil, nil, err
	}
	cardIDStr := c.Param("cardID")
	cardID, err := uuid.Parse(cardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "listcards.handler.CreateCardInList")
		return nil, nil, nil, nil, err
	}
	return ctx, &userID, &boardID, &cardID, nil
}

func (h *InboxHandler) GetInboxCards(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	inboxCards, err := h.inboxService.GetUserInboxCards(ctx, userID)
	if err != nil {
		httperr.WriteOp(c, err, "inbox.handler.GetInboxCards")
		return
	}
	c.JSON(http.StatusOK, inboxCards)

}

func (h *InboxHandler) CreateInboxCard(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	correlationID := c.MustGet("correlationID").(uuid.UUID)
	var req CreateInboxCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteOp(c, err, "inbox.handler.CreateInboxCard")
		return
	}
	response, err := h.inboxService.CreateInboxCard(ctx, userID, req, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "inbox.handler.CreateInboxCard")
		return
	}
	c.JSON(http.StatusOK, response)

}

func (h *InboxHandler) UpdateInboxCard(c *gin.Context) {

}

func (h *InboxHandler) DetatchInboxCard(c *gin.Context) {

}

func (h *InboxHandler) MoveInboxCard(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	cardIDStr := c.Param("cardID")
	cardID, err := uuid.Parse(cardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "inbox.handler.MoveInboxCard")
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	var req MoveInboxCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteOp(c, err, "inbox.handler.MoveInboxCard")
		return
	}
	response, err := h.inboxService.MoveInboxCard(ctx, userID, cardID, correlationID, req)
	if err != nil {
		httperr.WriteOp(c, err, "inbox.handler.MoveInboxCard")
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *InboxHandler) MirrorCardToInbox(c *gin.Context) {
	ctx, userID, boardID, cardID, err := getUserBoardCardContext(c)
	if err != nil {
		fmt.Println("Error getting context:", err)
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	workspaceID, ok := c.Get("workspaceID")
	if !ok {
		httperr.WriteOp(c, domainerr.ErrValidation, "listcards.handler.CreateCardInListWorkspaceMissing")
		return
	}
	workspaceUUID, ok := workspaceID.(uuid.UUID)
	if !ok || workspaceUUID == uuid.Nil {
		httperr.WriteOp(c, domainerr.ErrValidation, "listcards.handler.CreateCardInListWorkspaceInvalid")
		return
	}
	var req MirrorCardToInboxRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteOp(c, err, "inbox.handler.MirrorCardToInbox")
		return
	}

	inboxCard, err := h.inboxService.MirrorCardToInbox(ctx, *userID, workspaceUUID, *boardID, *cardID, req, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "inbox.handler.MirrorCardToInbox")
		return
	}
	c.JSON(http.StatusOK, inboxCard)
}

func (h *InboxHandler) MoveInboxCardToBoard(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	cardIDStr := c.Param("cardID")
	cardID, err := uuid.Parse(cardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "inbox.handler.MoveInboxCardToBoard")
		return
	}
	targetBoardIDStr := c.Param("targetBoardID")
	targetBoardID, err := uuid.Parse(targetBoardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "inbox.handler.MoveInboxCardToBoard")
		return
	}
	targetListIDStr := c.Param("targetListID")
	targetListID, err := uuid.Parse(targetListIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "inbox.handler.MoveInboxCardToBoard")
		return
	}
	targetWorkspaceIDStr := c.Param("targetWorkspaceID")
	targetWorkspaceID, err := uuid.Parse(targetWorkspaceIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "inbox.handler.MoveInboxCardToBoard")
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)

	var req MoveInboxCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteOp(c, err, "inbox.handler.MoveInboxCardToBoard")
		return
	}

	response, err := h.inboxService.MoveInboxCardToListInBoard(ctx, userID, cardID, targetWorkspaceID, targetBoardID, targetListID, correlationID, req)
	if err != nil {
		httperr.WriteOp(c, err, "inbox.handler.MoveInboxCardToBoard")
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *InboxHandler) PatchInboxCardProps(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	cardIDStr := c.Param("cardID")
	cardID, err := uuid.Parse(cardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "inbox.handler.PatchInboxCardProps")
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	var req cards.PatchCardPropsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteOp(c, err, "inbox.handler.PatchInboxCardProps")
		return
	}
	response, err := h.inboxService.PatchInboxCardProps(ctx, userID, cardID, correlationID, req)
	if err != nil {
		httperr.WriteOp(c, err, "inbox.handler.PatchInboxCardProps")
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *InboxHandler) PatchInboxCardDetails(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	cardIDStr := c.Param("cardID")
	cardID, err := uuid.Parse(cardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "inbox.handler.PatchInboxCardDetails")
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	var req cards.PatchCardDetailsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "inbox.handler.PatchInboxCardDetails")
		return
	}
	response, err := h.inboxService.PatchInboxCardDetails(ctx, userID, cardID, correlationID, req)
	if err != nil {
		httperr.WriteOp(c, err, "inbox.handler.PatchInboxCardDetails")
		return
	}
	c.JSON(http.StatusOK, response)
}
