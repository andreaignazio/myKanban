package lists

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	"GoGORM/internal/links"
	"GoGORM/internal/server/httperr"
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func deletedAtPtr(deletedAt gorm.DeletedAt) *time.Time {
	if deletedAt.Valid {
		return &deletedAt.Time
	}
	return nil
}

type ListsHandler struct {
	ListService  *ListsService
	LinksService *links.LinksService
}

func NewListsHandler(ListsService *ListsService, LinksService *links.LinksService) *ListsHandler {
	return &ListsHandler{ListService: ListsService, LinksService: LinksService}
}

func getUserBoardListContext(c *gin.Context) (context.Context, *uuid.UUID, *uuid.UUID, *uuid.UUID, error) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "lists.handler.PatchListProps")
		return nil, nil, nil, nil, err
	}
	listIDStr := c.Param("listID")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "lists.handler.PatchListProps")
		return nil, nil, nil, nil, err
	}
	return ctx, &userID, &boardID, &listID, nil
}

func getUserBoardListContextW(c *gin.Context) (context.Context, *uuid.UUID, *uuid.UUID, *uuid.UUID, *uuid.UUID, *uuid.UUID, error) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "lists.handler.GetParamsError")
		return nil, nil, nil, nil, nil, nil, err
	}
	listIDStr := c.Param("listID")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "lists.handler.GetParamsError")
		return nil, nil, nil, nil, nil, nil, err
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	workspaceID, ok := c.Get("workspaceID")
	if !ok {
		httperr.WriteOp(c, domainerr.ErrValidation, "lists.handler.GetParamsError")
		return nil, nil, nil, nil, nil, nil, err
	}
	workspaceUUID, ok := workspaceID.(uuid.UUID)
	if !ok || workspaceUUID == uuid.Nil {
		httperr.WriteOp(c, domainerr.ErrValidation, "lists.handler.GetParamsError")
		return nil, nil, nil, nil, nil, nil, err
	}
	return ctx, &userID, &workspaceUUID, &boardID, &listID, &correlationID, nil
}

func (h *ListsHandler) GetListMeta(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	listIDStr := c.Param("listID")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "lists.handler.GetListMeta")
		return
	}

	list, err := h.ListService.GetListMeta(ctx, userID, listID)
	if err != nil {
		httperr.WriteOp(c, err, "lists.handler.GetListMeta")
		return
	}
	res := dto.ListResponse{
		ID:               list.ID,
		Title:            list.Title,
		Props:            list.Props,
		CreatedByUserID:  list.CreatedByUserID,
		CreatedInBoardID: list.CreatedInBoardID,
		ExternalAccess:   list.ExternalAccess,
		CreatedAt:        list.CreatedAt,
		UpdatedAt:        list.UpdatedAt,
		DeletedAt:        deletedAtPtr(list.DeletedAt),
	}
	c.JSON(http.StatusOK, res)

}

func (h *ListsHandler) GetListDetail(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	listIDStr := c.Param("listID")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "lists.handler.GetListDetail")
		return
	}

	listDetail, err := h.ListService.GetListDetail(ctx, userID, listID)
	if err != nil {
		httperr.WriteOp(c, err, "lists.handler.GetListDetail")
		return
	}
	cards := make([]CardResponseDTO, 0, len(listDetail.Cards))
	for _, card := range listDetail.Cards {
		cards = append(cards, CardResponseDTO{
			ID:              card.ID,
			Title:           card.Title,
			Done:            card.Done,
			Description:     card.Description,
			StartDate:       card.StartDate,
			EndDate:         card.EndDate,
			Props:           card.Props,
			CreatedByUserID: card.CreatedByUserID,
			CreatedInListID: card.CreatedInListID,
			CreatedAt:       card.CreatedAt,
			UpdatedAt:       card.UpdatedAt,
			DeletedAt:       deletedAtPtr(card.DeletedAt),
		})
	}
	res := ListDetailResponseDTO{
		ID:        listDetail.ID,
		Title:     listDetail.Title,
		DeletedAt: deletedAtPtr(listDetail.DeletedAt),
		Cards:     cards,
	}

	c.JSON(http.StatusOK, res)

}

func (h *ListsHandler) DeleteList(c *gin.Context) {

}

func (h *ListsHandler) PatchListDetails(c *gin.Context) {

	ctx, userID, workspaceID, boardID, listID, correlationID, err := getUserBoardListContextW(c)
	if err != nil {
		fmt.Println("Error getting context:", err)
		return
	}
	var req PatchListDetailsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "lists.handler.PatchListDetails")
		fmt.Println("Error binding JSON:", err)
		return
	}
	updatedList, err := h.ListService.PatchListDetails(ctx, *userID, *workspaceID, *boardID, *listID, *correlationID, req)
	if err != nil {
		httperr.Write(c, err)
		fmt.Println("Error patching list details:", err)
		return
	}
	res := dto.ListToResponse(updatedList)
	c.JSON(http.StatusOK, res)

}

func (h *ListsHandler) PatchListProps(c *gin.Context) {
	ctx, userID, workspaceID, boardID, listID, correlationID, err := getUserBoardListContextW(c)
	if err != nil {
		return
	}
	var req PatchListPropsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "lists.handler.PatchListProps")
		return
	}
	updatedList, err := h.ListService.PatchListProps(ctx, *userID, *workspaceID, *boardID, *listID, *correlationID, req)
	if err != nil {
		httperr.Write(c, err)
		return
	}
	res := dto.ListToResponse(updatedList)
	c.JSON(http.StatusOK, res)
}

func (h *ListsHandler) GetUserLists(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	lists, err := h.ListService.GetUserLists(ctx, userID)
	if err != nil {
		httperr.WriteOp(c, err, "lists.handler.GetUserLists")
		return
	}
	responses := make([]dto.ListResponse, 0, len(lists))
	for _, list := range lists {
		responses = append(responses, mappingListToListResponse(&list))
	}
	c.JSON(http.StatusOK, responses)
}
