package links

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	"GoGORM/internal/server/httperr"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type LinksHandler struct {
	LinksService *LinksService
}

func NewLinksHandler(LinksService *LinksService) *LinksHandler {
	return &LinksHandler{LinksService: LinksService}
}

func getContext(c *gin.Context) (context.Context, *uuid.UUID, *uuid.UUID, error) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "memberships.handler.getContext")
		return nil, nil, nil, err
	}
	return ctx, &userID, &boardID, nil

}

func (h *LinksHandler) MoveListInBoard(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	correlationID := c.MustGet("correlationID").(uuid.UUID)

	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "links.handler.MoveListInBoard")
		return
	}
	listIDStr := c.Param("listID")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "links.handler.MoveListInBoard")
		return
	}

	var req MoveListInBoardDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "links.handler.MoveListInBoard")
		return
	}

	workspaceID, ok := c.Get("workspaceID")
	if !ok {
		httperr.WriteOp(c, domainerr.ErrValidation, "links.handler.MoveListInBoardWorkspaceMissing")
		return
	}
	workspaceUUID, ok := workspaceID.(uuid.UUID)
	if !ok || workspaceUUID == uuid.Nil {
		httperr.WriteOp(c, domainerr.ErrValidation, "links.handler.MoveListInBoardWorkspaceInvalid")
		return
	}

	boardList, err := h.LinksService.MoveListInBoard(ctx, userID, workspaceUUID, listID, boardID, req, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "links.handler.MoveListInBoard")
		return
	}
	res := dto.BoardListToResponse(boardList)

	c.JSON(http.StatusOK, res)
}

func (h *LinksHandler) MoveBoardList(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	correlationID := c.MustGet("correlationID").(uuid.UUID)

	sourceBoardIDStr := c.Param("boardID")
	sourceBoardID, err := uuid.Parse(sourceBoardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "links.handler.MoveBoardList")
		fmt.Println("Error parsing source board ID:", err)
		return
	}

	listIDStr := c.Param("listID")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "links.handler.MoveBoardList")
		fmt.Println("Error parsing list ID:", err)
		return
	}

	var req MoveBoardListDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		if !errors.Is(err, io.EOF) {
			httperr.WriteBindingError(c, err, "links.handler.MoveBoardList")
			fmt.Println("Error binding JSON:", err)
			return
		}
	}

	var workspaceUUID uuid.UUID
	if workspaceID, ok := c.Get("workspaceID"); ok {
		if parsed, ok := workspaceID.(uuid.UUID); ok && parsed != uuid.Nil {
			workspaceUUID = parsed
		}
	}
	if workspaceUUID == uuid.Nil {
		board, err := h.LinksService.BoardRepo.GetBoard(ctx, sourceBoardID, h.LinksService.IncludeDeleted)
		if err != nil {
			httperr.WriteOp(c, domainerr.MapRepoErr(err, false), "links.handler.MoveBoardListResolveWorkspace")
			fmt.Println("Error resolving workspace:", err)
			return
		}
		if board == nil || board.WorkspaceID == uuid.Nil {
			httperr.WriteOp(c, domainerr.ErrValidation, "links.handler.MoveBoardListWorkspaceInvalid")
			fmt.Println("Invalid workspace for board:", sourceBoardID)
			return
		}
		workspaceUUID = board.WorkspaceID
	}

	sourceBoardList, targetBoardList, err := h.LinksService.MoveBoardList(ctx, userID, workspaceUUID, sourceBoardID, listID, req, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "links.handler.MoveBoardList")
		fmt.Println("Error moving board list:", err)
		return
	}

	res := MoveBoardListResponse{}
	if sourceBoardList != nil {
		r := dto.BoardListToResponse(sourceBoardList)
		res.SourceBoardList = &r
	}
	if targetBoardList != nil {
		r := dto.BoardListToResponse(targetBoardList)
		res.TargetBoardList = &r
	}

	c.JSON(http.StatusOK, res)
}

func (h *LinksHandler) MirrorBoardList(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	correlationID := c.MustGet("correlationID").(uuid.UUID)

	sourceBoardIDStr := c.Param("boardID")
	sourceBoardID, err := uuid.Parse(sourceBoardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "links.handler.MirrorBoardList")
		return
	}

	listIDStr := c.Param("listID")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "links.handler.MirrorBoardList")
		return
	}

	var req MirrorBoardListDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "links.handler.MirrorBoardList")
		return
	}

	workspaceID, ok := c.Get("workspaceID")
	if !ok {
		httperr.WriteOp(c, domainerr.ErrValidation, "links.handler.MirrorBoardListWorkspaceMissing")
		return
	}
	workspaceUUID, ok := workspaceID.(uuid.UUID)
	if !ok || workspaceUUID == uuid.Nil {
		httperr.WriteOp(c, domainerr.ErrValidation, "links.handler.MirrorBoardListWorkspaceInvalid")
		return
	}

	list, boardList, err := h.LinksService.MirrorBoardList(ctx, userID, workspaceUUID, sourceBoardID, listID, req, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "links.handler.MirrorBoardList")
		return
	}

	res := MirrorBoardListResponse{
		List:      dto.ListToResponse(list),
		BoardList: dto.BoardListToResponse(boardList),
	}

	c.JSON(http.StatusCreated, res)
}

func (h *LinksHandler) MoveBulkListInBoard(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "links.handler.MoveBulkListInBoard")
		return
	}

	var req MoveBulkListInBoardDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "links.handler.MoveBulkListInBoard")
		return
	}
	listIDs := req.ListIDs

	input := MoveListInBoardInput{
		AfterListID: req.AfterListID,
		InsertAt:    req.InsertAt,
	}

	rows, err := h.LinksService.MoveBulkListInBoard(ctx, userID, boardID, listIDs, input)
	if err != nil {
		httperr.WriteOp(c, err, "links.handler.MoveBulkListInBoard")
		return
	}
	bulkResponse := make([]dto.BoardListResponse, 0, len(rows))
	for _, row := range rows {
		res := dto.BoardListToResponse(&row)
		bulkResponse = append(bulkResponse, res)
	}
	c.JSON(http.StatusOK, bulkResponse)

}

func (h *LinksHandler) CopyBulkListsInBoard(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	correlationID := c.MustGet("correlationID").(uuid.UUID)

	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "links.handler.CopyBulkListsInBoard")
		return
	}

	workspaceID, ok := c.Get("workspaceID")
	if !ok {
		httperr.WriteOp(c, domainerr.ErrValidation, "links.handler.CopyBulkListsInBoardWorkspaceMissing")
		return
	}
	workspaceUUID, ok := workspaceID.(uuid.UUID)
	if !ok || workspaceUUID == uuid.Nil {
		httperr.WriteOp(c, domainerr.ErrValidation, "links.handler.CopyBulkListsInBoardWorkspaceInvalid")
		return
	}

	var req BulkCopyListsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "links.handler.CopyBulkListsInBoard")
		return
	}

	result, err := h.LinksService.CopyBulkListsInBoard(ctx, userID, workspaceUUID, boardID, req, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "links.handler.CopyBulkListsInBoard")
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *LinksHandler) PatchList(c *gin.Context) {

}

func (h *LinksHandler) DetatchList(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
	if err != nil {
		return
	}
	listIDStr := c.Param("listID")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "links.handler.DetatchList")
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

	boardList, err := h.LinksService.DetatchList(ctx, *userID, workspaceUUID, *boardID, listID, correlationID)
	if err != nil {
		fmt.Printf("Error in DetatchList: %v\n", err)
		httperr.WriteOp(c, err, "links.handler.DetatchList")
		return
	}
	res := dto.BoardListToResponse(boardList)
	c.JSON(http.StatusOK, res)
}

func (h *LinksHandler) RestoreListToBoard(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
	if err != nil {
		return
	}
	listIDStr := c.Param("listID")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "links.handler.RestoreListToBoard")
		return
	}
	boardList, err := h.LinksService.RestoreListToBoard(ctx, *userID, *boardID, listID)
	if err != nil {
		httperr.WriteOp(c, err, "links.service.RestoreListToBoard")
		return
	}
	res := dto.BoardListToResponse(boardList)
	c.JSON(http.StatusOK, res)

}

func (h *LinksHandler) CreateListInBoard(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
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

	var req CreateListInBoardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "links.handler.CreateListInBoard")
		return
	}
	list, boardList, err := h.LinksService.CreateListInBoard(ctx, *userID, workspaceUUID, *boardID, req, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "links.handler.CreateListInBoard")
		return
	}

	res := ListInBoardResponse{
		List:      dto.ListToResponse(list),
		BoardList: dto.BoardListToResponse(boardList),
	}
	c.JSON(http.StatusOK, res)
}

func (h *LinksHandler) PatchListAccessMode(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
	if err != nil {
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	workspaceID, ok := c.Get("workspaceID")
	if !ok {
		httperr.WriteOp(c, domainerr.ErrValidation, "links.handler.PatchListAccessModeWorkspaceMissing")
		return
	}
	workspaceUUID, ok := workspaceID.(uuid.UUID)
	if !ok || workspaceUUID == uuid.Nil {
		httperr.WriteOp(c, domainerr.ErrValidation, "links.handler.PatchListAccessModeWorkspaceInvalid")
		return
	}
	listIDStr := c.Param("listID")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "links.handler.PatchListAccessMode")
		return
	}
	var req PatchListAccessModeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "links.handler.PatchListAccessMode")
		return
	}

	boardList, err := h.LinksService.PatchListAccessMode(ctx, *userID, workspaceUUID, *boardID, listID, req.AccessMode, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "links.handler.PatchListAccessMode")
		return
	}
	res := dto.BoardListToResponse(boardList)
	c.JSON(http.StatusOK, res)
}

func (h *LinksHandler) GetUserBoardRelations(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
	if err != nil {
		return
	}
	response, err := h.LinksService.GetUserBoardRelations(ctx, *userID, *boardID)
	if err != nil {
		httperr.WriteOp(c, err, "links.handler.GetUserBoardRelations")
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *LinksHandler) GetUserBoardDetail(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
	if err != nil {
		return
	}
	response, err := h.LinksService.GetUserBoardDetail(ctx, *userID, *boardID)
	if err != nil {
		httperr.WriteOp(c, err, "links.handler.GetUserBoardDetail")
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *LinksHandler) GetListsByBoardId(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
	if err != nil {
		return
	}
	workspaceID, ok := c.Get("workspaceID")
	if !ok {
		httperr.WriteOp(c, domainerr.ErrValidation, "lists.handler.GetParamsError")
		return
	}
	workspaceUUID, ok := workspaceID.(uuid.UUID)
	if !ok || workspaceUUID == uuid.Nil {
		httperr.WriteOp(c, domainerr.ErrValidation, "lists.handler.GetParamsError")
		return
	}
	response, err := h.LinksService.GetListsByBoardID(ctx, *userID, *boardID, workspaceUUID)
	if err != nil {
		httperr.WriteOp(c, err, "links.handler.GetListsByBoardId")
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *LinksHandler) GetBoardListMirrors(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
	if err != nil {
		return
	}

	boardListIDStr := c.Param("boardListID")
	boardListID, err := uuid.Parse(boardListIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "links.handler.GetBoardListMirrors")
		return
	}

	response, err := h.LinksService.GetBoardListMirrors(ctx, *userID, *boardID, boardListID)
	if err != nil {
		httperr.WriteOp(c, err, "links.handler.GetBoardListMirrors")
		return
	}

	c.JSON(http.StatusOK, response)
}

func (h *LinksHandler) GetDeletedBoardRelations(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
	if err != nil {
		return
	}

	response, err := h.LinksService.GetDeletedBoardRelations(ctx, *userID, *boardID)
	if err != nil {
		httperr.WriteOp(c, err, "links.handler.GetDeletedBoardRelations")
		return
	}

	c.JSON(http.StatusOK, response)
}

func (h *LinksHandler) GetDeletedBoardLists(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
	if err != nil {
		return
	}

	response, err := h.LinksService.GetDeletedBoardRelations(ctx, *userID, *boardID)
	if err != nil {
		httperr.WriteOp(c, err, "links.handler.GetDeletedBoardLists")
		return
	}

	c.JSON(http.StatusOK, DeletedBoardRelationsResponse{
		Lists:              response.Lists,
		BoardListRelations: response.BoardListRelations,
	})
}

func (h *LinksHandler) GetDeletedListCards(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
	if err != nil {
		return
	}

	response, err := h.LinksService.GetDeletedBoardRelations(ctx, *userID, *boardID)
	if err != nil {
		httperr.WriteOp(c, err, "links.handler.GetDeletedListCards")
		return
	}

	c.JSON(http.StatusOK, DeletedBoardRelationsResponse{
		Cards:             response.Cards,
		ListCardRelations: response.ListCardRelations,
	})
}

func (h *LinksHandler) RestoreBoardLists(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
	if err != nil {
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	workspaceID, ok := c.Get("workspaceID")
	if !ok {
		httperr.WriteOp(c, domainerr.ErrValidation, "links.handler.RestoreBoardListsWorkspaceMissing")
		return
	}
	workspaceUUID, ok := workspaceID.(uuid.UUID)
	if !ok || workspaceUUID == uuid.Nil {
		httperr.WriteOp(c, domainerr.ErrValidation, "links.handler.RestoreBoardListsWorkspaceInvalid")
		return
	}

	var req RestoreBoardListsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "links.handler.RestoreBoardLists")
		return
	}

	rows, err := h.LinksService.RestoreBoardListsByIDs(ctx, *userID, workspaceUUID, *boardID, req.BoardListIDs, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "links.handler.RestoreBoardLists")
		return
	}

	res := make([]dto.BoardListResponse, 0, len(rows))
	for i := range rows {
		res = append(res, dto.BoardListToResponse(&rows[i]))
	}
	c.JSON(http.StatusOK, res)
}

func (h *LinksHandler) RestoreListCards(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
	if err != nil {
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	workspaceID, ok := c.Get("workspaceID")
	if !ok {
		httperr.WriteOp(c, domainerr.ErrValidation, "links.handler.RestoreListCardsWorkspaceMissing")
		return
	}
	workspaceUUID, ok := workspaceID.(uuid.UUID)
	if !ok || workspaceUUID == uuid.Nil {
		httperr.WriteOp(c, domainerr.ErrValidation, "links.handler.RestoreListCardsWorkspaceInvalid")
		return
	}

	var req RestoreListCardsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "links.handler.RestoreListCards")
		return
	}

	rows, err := h.LinksService.RestoreListCardsByIDs(ctx, *userID, workspaceUUID, *boardID, req.ListCardIDs, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "links.handler.RestoreListCards")
		return
	}

	res := make([]dto.ListCardResponse, 0, len(rows))
	for i := range rows {
		res = append(res, dto.ListCardToResponse(&rows[i]))
	}
	c.JSON(http.StatusOK, res)
}

func (h *LinksHandler) PurgeBoardLists(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
	if err != nil {
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	workspaceID, ok := c.Get("workspaceID")
	if !ok {
		httperr.WriteOp(c, domainerr.ErrValidation, "links.handler.PurgeBoardListsWorkspaceMissing")
		return
	}
	workspaceUUID, ok := workspaceID.(uuid.UUID)
	if !ok || workspaceUUID == uuid.Nil {
		httperr.WriteOp(c, domainerr.ErrValidation, "links.handler.PurgeBoardListsWorkspaceInvalid")
		return
	}

	var req PurgeBoardListsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "links.handler.PurgeBoardLists")
		return
	}

	rows, err := h.LinksService.PurgeBoardListsByIDs(ctx, *userID, workspaceUUID, *boardID, req.BoardListIDs, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "links.handler.PurgeBoardLists")
		return
	}

	res := make([]dto.BoardListResponse, 0, len(rows))
	for i := range rows {
		res = append(res, dto.BoardListToResponse(&rows[i]))
	}
	c.JSON(http.StatusOK, res)
}

func (h *LinksHandler) PurgeListCards(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
	if err != nil {
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	workspaceID, ok := c.Get("workspaceID")
	if !ok {
		httperr.WriteOp(c, domainerr.ErrValidation, "links.handler.PurgeListCardsWorkspaceMissing")
		return
	}
	workspaceUUID, ok := workspaceID.(uuid.UUID)
	if !ok || workspaceUUID == uuid.Nil {
		httperr.WriteOp(c, domainerr.ErrValidation, "links.handler.PurgeListCardsWorkspaceInvalid")
		return
	}

	var req PurgeListCardsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "links.handler.PurgeListCards")
		return
	}

	rows, err := h.LinksService.PurgeListCardsByIDs(ctx, *userID, workspaceUUID, *boardID, req.ListCardIDs, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "links.handler.PurgeListCards")
		return
	}

	res := make([]dto.ListCardResponse, 0, len(rows))
	for i := range rows {
		res = append(res, dto.ListCardToResponse(&rows[i]))
	}
	c.JSON(http.StatusOK, res)
}
