package inbox

import (
	"GoGORM/internal/domainerr"
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
