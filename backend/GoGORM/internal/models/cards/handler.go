package cards

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	"GoGORM/internal/server/httperr"
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CardsHandler struct {
	CardsService *CardsService
}

func NewCardsHandler(cardsService *CardsService) *CardsHandler {
	return &CardsHandler{CardsService: cardsService}
}
func deletedAtPtr(deletedAt gorm.DeletedAt) *time.Time {
	if deletedAt.Valid {
		return &deletedAt.Time
	}
	return nil
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
func (h *CardsHandler) PatchCardDetails(c *gin.Context) {
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	ctx, userID, boardID, cardID, err := getUserBoardCardContext(c)
	if err != nil {
		return
	}
	var req PatchCardDetailsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "cards.handler.PatchCardDetails")
		return
	}
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
	updatedCard, err := h.CardsService.PatchCardDetails(ctx, *userID, workspaceUUID, *boardID, *cardID, req, correlationID)
	if err != nil {
		httperr.Write(c, err)
		return
	}
	res := mappingCardToResponse(updatedCard)
	c.JSON(http.StatusOK, res)
}

func (h *CardsHandler) PatchCardProps(c *gin.Context) {
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	ctx, userID, boardID, cardID, err := getUserBoardCardContext(c)
	if err != nil {
		return
	}
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

	var req PatchCardPropsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "cards.handler.PatchCardProps")
		return
	}
	updatedCard, err := h.CardsService.PatchCardProps(ctx, *userID, workspaceUUID, *boardID, *cardID, req, correlationID)
	if err != nil {
		httperr.Write(c, err)
		return
	}
	res := dto.CardToResponse(updatedCard)
	c.JSON(http.StatusOK, res)
}

func (h *CardsHandler) GetUserCards(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	cards, err := h.CardsService.GetUserCards(ctx, userID)
	if err != nil {
		httperr.WriteOp(c, err, "cards.handler.GetUserCards")
		return
	}
	responses := make([]dto.CardResponse, 0, len(cards))
	for _, card := range cards {
		responses = append(responses, *mappingCardToResponse(&card))
	}
	c.JSON(http.StatusOK, responses)
}

func (h *CardsHandler) GetCardsWhereUserIsMember(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	targetUserIDStr := c.Param("userID")
	targetUserID, err := uuid.Parse(targetUserIDStr)
	workspaceIDStr, ok := c.Get("workspaceID")
	if !ok {
		httperr.WriteOp(c, domainerr.ErrValidation, "cards.handler.GetCardsWhereUserIsMemberWorkspaceMissing")
		return
	}
	workspaceUUID, ok := workspaceIDStr.(uuid.UUID)
	if !ok || workspaceUUID == uuid.Nil {
		httperr.WriteOp(c, domainerr.ErrValidation, "cards.handler.GetCardsWhereUserIsMemberWorkspaceInvalid")
		return
	}

	if err != nil {
		httperr.WriteParamsError(c, err, "cards.handler.GetCardsWhereUserIsMember")
		return
	}
	response, err := h.CardsService.GetCardsWhereOtherUserIsMember(ctx, userID, targetUserID)
	if err != nil {
		httperr.Write(c, err)
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *CardsHandler) GetCardsWhereIAmMember(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	response, err := h.CardsService.GetCardsWhereUserIsMember(ctx, userID)
	if err != nil {
		httperr.Write(c, err)
		return
	}
	c.JSON(http.StatusOK, response)
}
