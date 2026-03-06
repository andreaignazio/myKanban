package listcards

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/internal/server/httperr"
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ListCardsHandler struct {
	ListCardsService *ListCardsService
	EventRegistry    *EventRegistry.EventRegistryService
}

func NewListCardsHandler(listCardsService *ListCardsService, eventRegistry *EventRegistry.EventRegistryService) *ListCardsHandler {
	return &ListCardsHandler{ListCardsService: listCardsService, EventRegistry: eventRegistry}

}

func getContext(c *gin.Context) (context.Context, *uuid.UUID, *uuid.UUID, *uuid.UUID, error) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	listIDStr := c.Param("listID")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "listcards.handler.CreateCardInList")
		return nil, nil, nil, nil, err
	}
	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "listcards.handler.CreateCardInList")
		return nil, nil, nil, nil, err
	}
	return ctx, &userID, &boardID, &listID, nil
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

func getUserBoardContext(c *gin.Context) (context.Context, *uuid.UUID, *uuid.UUID, error) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "listcards.handler.CreateCardInList")
		return nil, nil, nil, err
	}

	return ctx, &userID, &boardID, nil
}

func (h *ListCardsHandler) CreateCardInList(c *gin.Context) {

	ctx, userID, boardID, listID, err := getContext(c)
	if err != nil {
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

	var req CreateCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "listcards.handler.CreateCardInList")
		return
	}

	newCard, newListcard, err := h.ListCardsService.CreateCardInList(ctx, *userID, workspaceUUID, *boardID, *listID, req, correlationID)
	if err != nil {
		httperr.Write(c, err)
		return
	}
	createCardResponse := CreateCardResponse{
		Card:     dto.CardToResponse(newCard),
		ListCard: dto.ListCardToResponse(newListcard),
	}
	hydratedCreated, err := h.ListCardsService.HydrateListCardResponseMirrors(ctx, []dto.ListCardResponse{createCardResponse.ListCard})
	if err == nil && len(hydratedCreated) > 0 {
		createCardResponse.ListCard = hydratedCreated[0]
	}
	c.JSON(http.StatusCreated, createCardResponse)

}

func (h *ListCardsHandler) GetListDetail(c *gin.Context) {
	ctx, userID, boardID, listID, err := getContext(c)
	if err != nil {
		return
	}

	res, err := h.ListCardsService.GetListDetailPatch(ctx, *userID, *boardID, *listID)
	if err != nil {
		httperr.Write(c, err)
		return
	}
	c.JSON(http.StatusOK, res)

}

func (h *ListCardsHandler) CrossMoveCard(c *gin.Context) {

	ctx, userID, boardID, cardID, err := getUserBoardCardContext(c)
	if err != nil {
		fmt.Println("Error getting context:", err)
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	var req CrossMoveCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "listcards.handler.CrossMoveCard")
		fmt.Println("Error binding JSON:", err)
		return
	}
	targetListCard, sourceListCard, movePayload, err := h.ListCardsService.CrossMoveCard(ctx, *userID, *boardID, *cardID, req, correlationID)
	if err != nil {
		httperr.Write(c, err)
		fmt.Println("Error in CrossMoveCard service:", err)
		return
	}

	if movePayload != nil {
		var workspaceIDPtr *uuid.UUID
		if workspaceID, ok := c.Get("workspaceID"); ok {
			if workspaceUUID, ok := workspaceID.(uuid.UUID); ok && workspaceUUID != uuid.Nil {
				workspaceIDPtr = &workspaceUUID
			}
		}

		targets := []EventRegistry.TargetRef{
			{EntityType: "card", EntityID: movePayload.ListCardPatch.CardID, BoardID: boardID, WorkspaceID: workspaceIDPtr},
		}
		if fromListID, parseErr := uuid.Parse(movePayload.FromListID); parseErr == nil {
			targets = append(targets, EventRegistry.TargetRef{EntityType: "list", EntityID: fromListID, BoardID: boardID, WorkspaceID: workspaceIDPtr})
		}
		if toListID, parseErr := uuid.Parse(movePayload.ToListID); parseErr == nil {
			targets = append(targets, EventRegistry.TargetRef{EntityType: "list", EntityID: toListID, BoardID: boardID, WorkspaceID: workspaceIDPtr})
		}

		err = h.EventRegistry.Emit(ctx, h.ListCardsService.db, EventRegistry.DomainEvent{
			Type:          EventRegistry.EventBoardListCardMoved,
			WorkspaceID:   workspaceIDPtr,
			BoardID:       boardID,
			ActorUserID:   userID,
			CorrelationID: &correlationID,
			Payload: EventRegistry.EventPayloadEnvelope{
				RealtimePayload: movePayload,
			},
			Targets:    targets,
			OccurredAt: time.Now(),
		})
		if err != nil {
			httperr.Write(c, err)
			fmt.Println("Error emitting board.listcard.moved event:", err)
			return
		}
	}
	targetResp := mappingListCardToResponse(targetListCard)
	if targetResp == nil {
		httperr.Write(c, domainerr.ErrInternal)
		return
	}
	res := CrossMoveCardResponse{
		TargetListCard: *targetResp,
	}
	if sourceListCard != nil {
		res.DetatchedListCard = mappingListCardToResponse(sourceListCard)
	}
	hydrateInput := []dto.ListCardResponse{res.TargetListCard}
	if res.DetatchedListCard != nil {
		hydrateInput = append(hydrateInput, *res.DetatchedListCard)
	}
	hydratedMoveResponse, hydrateErr := h.ListCardsService.HydrateListCardResponseMirrors(ctx, hydrateInput)
	if hydrateErr == nil {
		if len(hydratedMoveResponse) > 0 {
			res.TargetListCard = hydratedMoveResponse[0]
		}
		if res.DetatchedListCard != nil && len(hydratedMoveResponse) > 1 {
			res.DetatchedListCard = &hydratedMoveResponse[1]
		}
	}
	c.JSON(http.StatusOK, res)
}

func (h *ListCardsHandler) MoveCardToBoard(c *gin.Context) {
	ctx, userID, boardID, cardID, err := getUserBoardCardContext(c)
	if err != nil {
		fmt.Println("Error getting context:", err)
		return
	}

	var req MoveCardToBoardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "listcards.handler.MoveCardToBoard")
		fmt.Println("Error binding JSON:", err)
		return
	}

	boardLists, eventData, err := h.ListCardsService.MoveCardToBoard(ctx, *userID, *boardID, *cardID, req)
	if err != nil {
		httperr.Write(c, err)
		fmt.Println("Error in MoveCardToBoard service:", err, req)
		return
	}

	correlationID := c.MustGet("correlationID").(uuid.UUID)
	var workspaceIDPtr *uuid.UUID
	if workspaceID, ok := c.Get("workspaceID"); ok {
		if workspaceUUID, ok := workspaceID.(uuid.UUID); ok && workspaceUUID != uuid.Nil {
			workspaceIDPtr = &workspaceUUID
		}
	}

	if eventData != nil {
		err = h.EventRegistry.EmitCrossBoardMove(ctx, EventRegistry.CrossBoardMoveEmitRequest{
			WorkspaceID:   workspaceIDPtr,
			ActorUserID:   userID,
			CorrelationID: &correlationID,
			OccurredAt:    time.Now(),

			RootListCardID:  eventData.RootListCardID,
			MovedListCardID: eventData.MovedListCardID,

			CardID:        eventData.CardID,
			CardPatch:     eventData.CardPatch,
			SourceBoardID: eventData.SourceBoardID,
			TargetBoardID: eventData.TargetBoardID,
			SourceListID:  eventData.SourceListID,
			TargetListID:  eventData.TargetListID,
			ListCardPatch: eventData.ListCardPatch,
			FromListCards: eventData.FromListCards,
			ToListCards:   eventData.ToListCards,
		})
		if err != nil {
			httperr.Write(c, err)
			fmt.Println("Error emitting cross-board move event:", err)
			return
		}
	}

	c.JSON(http.StatusOK, MoveCardToBoardResponse{BoardLists: boardLists})
}

func (h *ListCardsHandler) BulkCrossMoveCards(c *gin.Context) {
	ctx, userID, boardID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	var req BulkCrossMoveCardsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "listcards.handler.BulkCrossMoveCards")
		return
	}
	movedListCards, deletedListCards, err := h.ListCardsService.BulkCrossMoveCards(ctx, *userID, *boardID, req)
	if err != nil {
		httperr.Write(c, err)
		return
	}
	movedListCardsResponse := make([]dto.ListCardResponse, 0, len(movedListCards))
	for _, listCard := range movedListCards {
		movedListCardsResponse = append(movedListCardsResponse, *mappingListCardToResponse(&listCard))
	}
	deletedListCardsResponse := make([]dto.ListCardResponse, 0, len(deletedListCards))
	for _, listCard := range deletedListCards {
		deletedListCardsResponse = append(deletedListCardsResponse, *mappingListCardToResponse(&listCard))
	}
	res := BulkCrossMoveCardsResponse{
		MovedListCards:     movedListCardsResponse,
		DetatchedListCards: deletedListCardsResponse,
	}
	hydratedMoved, hydrateMovedErr := h.ListCardsService.HydrateListCardResponseMirrors(ctx, res.MovedListCards)
	if hydrateMovedErr == nil {
		res.MovedListCards = hydratedMoved
	}
	hydratedDetatched, hydrateDetatchedErr := h.ListCardsService.HydrateListCardResponseMirrors(ctx, res.DetatchedListCards)
	if hydrateDetatchedErr == nil {
		res.DetatchedListCards = hydratedDetatched
	}
	c.JSON(http.StatusOK, res)
}

func (h *ListCardsHandler) BulkMoveListCardsInBoard(c *gin.Context) {
	ctx, userID, boardID, err := getUserBoardContext(c)
	if err != nil {
		return
	}

	var req BulkMoveListCardsInBoardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "listcards.handler.BulkMoveListCardsInBoard")
		return
	}

	movedListCards, eventPayloads, err := h.ListCardsService.BulkMoveListCardsInBoard(ctx, *userID, *boardID, req)
	if err != nil {
		httperr.Write(c, err)
		return
	}

	correlationID := c.MustGet("correlationID").(uuid.UUID)
	var workspaceIDPtr *uuid.UUID
	if workspaceID, ok := c.Get("workspaceID"); ok {
		if workspaceUUID, ok := workspaceID.(uuid.UUID); ok && workspaceUUID != uuid.Nil {
			workspaceIDPtr = &workspaceUUID
		}
	}

	for i := range eventPayloads {
		payload := eventPayloads[i]
		fromListID, err := uuid.Parse(payload.FromListID)
		if err != nil {
			httperr.Write(c, domainerr.ErrValidation)
			return
		}
		toListID, err := uuid.Parse(payload.ToListID)
		if err != nil {
			httperr.Write(c, domainerr.ErrValidation)
			return
		}

		targets := []EventRegistry.TargetRef{
			{EntityType: "card", EntityID: payload.ListCardPatch.CardID, BoardID: boardID, WorkspaceID: workspaceIDPtr},
			{EntityType: "list", EntityID: fromListID, BoardID: boardID, WorkspaceID: workspaceIDPtr},
			{EntityType: "list", EntityID: toListID, BoardID: boardID, WorkspaceID: workspaceIDPtr},
		}

		err = h.EventRegistry.Emit(ctx, h.ListCardsService.db, EventRegistry.DomainEvent{
			Type:          EventRegistry.EventBoardListCardMoved,
			WorkspaceID:   workspaceIDPtr,
			BoardID:       boardID,
			ActorUserID:   userID,
			CorrelationID: &correlationID,
			Payload: EventRegistry.EventPayloadEnvelope{
				RealtimePayload: payload,
			},
			Targets:    targets,
			OccurredAt: time.Now(),
		})
		if err != nil {
			httperr.Write(c, err)
			return
		}
	}

	res := BulkMoveListCardsInBoardResponse{MovedListCards: make([]dto.ListCardResponse, 0, len(movedListCards))}
	for i := range movedListCards {
		res.MovedListCards = append(res.MovedListCards, dto.ListCardToResponse(&movedListCards[i]))
	}
	hydratedBulkMoved, hydrateErr := h.ListCardsService.HydrateListCardResponseMirrors(ctx, res.MovedListCards)
	if hydrateErr == nil {
		res.MovedListCards = hydratedBulkMoved
	}

	c.JSON(http.StatusOK, res)
}

func (h *ListCardsHandler) DetatchCardFromList(c *gin.Context) {
	ctx, userID, boardID, cardID, err := getUserBoardCardContext(c)
	if err != nil {
		return
	}
	listIDStr := c.Param("listID")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "listcards.handler.DetatchCardFromList")
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	workspaceID, ok := c.Get("workspaceID")
	if !ok {
		httperr.WriteOp(c, domainerr.ErrValidation, "listcards.handler.DetatchCardFromList.workspaceMissing")
		return
	}
	workspaceUUID, ok := workspaceID.(uuid.UUID)
	if !ok || workspaceUUID == uuid.Nil {
		httperr.WriteOp(c, domainerr.ErrValidation, "listcards.handler.DetatchCardFromList.workspaceInvalid")
		return
	}

	deletedIDs, err := h.ListCardsService.DetatchCardFromList(ctx, *userID, workspaceUUID, *boardID, listID, *cardID, correlationID)
	if err != nil {
		httperr.Write(c, err)
		return
	}

	c.JSON(http.StatusOK, deletedIDs)
}

func (h *ListCardsHandler) BulkDetatchCardsFromList(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "listcards.handler.BulkDetatchCardsFromList")
		return
	}
	listIDStr := c.Param("listID")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "listcards.handler.BulkDetatchCardsFromList")
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

	deletedListCards, err := h.ListCardsService.BulkDetatchCardsFromList(ctx, userID, workspaceUUID, boardID, listID, correlationID)
	if err != nil {
		httperr.Write(c, err)
		return
	}

	c.JSON(http.StatusOK, deletedListCards)
}

func (h *ListCardsHandler) GetListCardsByListId(c *gin.Context) {
	ctx, userID, boardID, listID, err := getContext(c)
	if err != nil {
		return
	}
	listCards, err := h.ListCardsService.GetListCardsByListId(ctx, *userID, *boardID, *listID)
	if err != nil {
		httperr.Write(c, err)
		return
	}
	res := make([]dto.ListCardResponse, 0, len(listCards))
	for _, listCard := range listCards {
		res = append(res, *mappingListCardToResponse(&listCard))
	}
	c.JSON(http.StatusOK, res)
}

func (h *ListCardsHandler) MirrorCardToList(c *gin.Context) {
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
	var req MirrorCardToListRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "listcards.handler.MirrorCardToList")
		return
	}
	response, err := h.ListCardsService.MirrorCardToList(ctx, *userID, workspaceUUID, *boardID, *cardID, req, correlationID)
	if err != nil {
		httperr.Write(c, err)
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *ListCardsHandler) CopyCardToList(c *gin.Context) {
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
	var req CopyCardToListRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "listcards.handler.CopyCardToList")
		return
	}
	_, _, err = h.ListCardsService.CopyCardToList(ctx, *userID, workspaceUUID, *boardID, *cardID, req, correlationID)
	if err != nil {
		httperr.Write(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Card copied successfully"})
}

func (h *ListCardsHandler) GetRootBoardForListCard(c *gin.Context) {
	ctx := c.Request.Context()
	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "listcards.handler.GetRootBoardForListCard")
		return
	}
	listCardIDStr := c.Param("listCardID")
	if listCardIDStr == "" {
		listCardIDStr = c.Param("listcardID")
	}
	listCardID, err := uuid.Parse(listCardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "listcards.handler.GetRootBoardForListCard")
		return
	}

	rootBoard, err := h.ListCardsService.GetRootBoardForListCard(ctx, boardID, listCardID)
	if err != nil {
		httperr.Write(c, err)
		return
	}
	c.JSON(http.StatusOK, rootBoard)
}
