package checklists

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/server/httperr"
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ChecklistHandler struct {
	Service *ChecklistsService
}

func NewChecklistHandler(service *ChecklistsService) *ChecklistHandler {
	return &ChecklistHandler{
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

func (h *ChecklistHandler) CreateChecklist(c *gin.Context) {
	ctx, userID, workspaceID, boardID, cardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	var req CreateChecklistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.CreateChecklist")
		return
	}
	checklist, err := h.Service.CreateChecklist(ctx, *userID, *workspaceID, *boardID, *cardID, *correlationID, &req)
	if err != nil {
		httperr.WriteOp(c, err, "checklist.handler.CreateChecklist")
		return
	}

	c.JSON(http.StatusOK, checklist)
}

func (h *ChecklistHandler) CloneChecklist(c *gin.Context) {
	ctx, userID, workspaceID, boardID, cardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	var req CloneChecklistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.CloneChecklist")
		return
	}
	res, err := h.Service.CloneChecklist(ctx, *userID, *workspaceID, *boardID, *cardID, *correlationID, &req)
	if err != nil {
		httperr.WriteOp(c, err, "checklist.handler.CloneChecklist")
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *ChecklistHandler) PatchChecklist(c *gin.Context) {
	ctx, userID, workspaceID, boardID, cardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	checklistIDStr := c.Param("checklistID")
	checklistID, err := uuid.Parse(checklistIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.PatchChecklist")
		return
	}
	var req PatchChecklistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.PatchChecklist")
		return
	}
	checklist, err := h.Service.PatchChecklist(ctx, *userID, *workspaceID, *boardID, *cardID, checklistID, *correlationID, &req)
	if err != nil {
		httperr.WriteOp(c, err, "checklist.handler.PatchChecklist")
		return
	}

	c.JSON(http.StatusOK, checklist)
}

func (h *ChecklistHandler) DeleteChecklist(c *gin.Context) {
	ctx, userID, workspaceID, boardID, cardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	checklistIDStr := c.Param("checklistID")
	checklistID, err := uuid.Parse(checklistIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.DeleteChecklist")
		return
	}
	cardChecklist, checklist, err := h.Service.DeleteChecklist(ctx, *userID, *workspaceID, *boardID, *cardID, checklistID, *correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "checklist.handler.DeleteChecklist")
		return
	}
	res := ChecklistRowResponse{
		Chacklist:     checklist,
		CardChecklist: cardChecklist,
	}
	c.JSON(http.StatusOK, res)
}

func (h *ChecklistHandler) MoveChecklist(c *gin.Context) {
	ctx, userID, workspaceID, boardID, cardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	checklistIDStr := c.Param("checklistID")
	checklistID, err := uuid.Parse(checklistIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.MoveChecklist")
		return
	}
	var req MoveChecklistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.MoveChecklist")
		return
	}
	cardChecklist, err := h.Service.MoveChecklist(ctx, *userID, *workspaceID, *boardID, *cardID, checklistID, *correlationID, &req)
	if err != nil {
		httperr.WriteOp(c, err, "checklist.handler.MoveChecklist")
		return
	}
	c.JSON(http.StatusOK, cardChecklist)
}

func (h *ChecklistHandler) CreateChecklistEntry(c *gin.Context) {
	ctx, userID, workspaceID, boardID, cardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	checklistIDStr := c.Param("checklistID")
	checklistID, err := uuid.Parse(checklistIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.CreateChecklistEntry")
		return
	}
	var req CreateChecklistEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.CreateChecklistEntry")
		return
	}
	checklistEntry, entry, err := h.Service.CreateChecklistEntry(ctx, *userID, *workspaceID, *boardID, *cardID, checklistID, *correlationID, &req)
	if err != nil {
		httperr.WriteOp(c, err, "checklist.handler.CreateChecklistEntry")
		return
	}
	res := ChecklistEntryRowResponse{
		Entry:          entry,
		ChecklistEntry: checklistEntry,
	}
	c.JSON(http.StatusOK, res)
}

func (h *ChecklistHandler) PatchChecklistEntry(c *gin.Context) {
	ctx, userID, workspaceID, boardID, cardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	checklistIDStr := c.Param("checklistID")
	checklistID, err := uuid.Parse(checklistIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.PatchChecklistEntry")
		return
	}
	entryIDStr := c.Param("entryID")
	entryID, err := uuid.Parse(entryIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.PatchChecklistEntry")
		return
	}
	var req PatchChecklistEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.PatchChecklistEntry")
		return
	}
	entry, err := h.Service.PatchChecklistEntry(ctx, *userID, *workspaceID, *boardID, *cardID, checklistID, entryID, *correlationID, &req)
	if err != nil {
		httperr.WriteOp(c, err, "checklist.handler.PatchChecklistEntry")
		return
	}
	c.JSON(http.StatusOK, entry)
}

func (h *ChecklistHandler) DeleteChecklistEntry(c *gin.Context) {
	ctx, userID, workspaceID, boardID, cardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	checklistIDStr := c.Param("checklistID")
	checklistID, err := uuid.Parse(checklistIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.DeleteChecklistEntry")
		return
	}
	entryIDStr := c.Param("entryID")
	entryID, err := uuid.Parse(entryIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.DeleteChecklistEntry")
		return
	}
	entry, checklistEntry, err := h.Service.DeleteChecklistEntry(ctx, *userID, *workspaceID, *boardID, *cardID, checklistID, entryID, *correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "checklist.handler.DeleteChecklistEntry")
		return
	}
	res := ChecklistEntryRowResponse{
		Entry:          entry,
		ChecklistEntry: checklistEntry,
	}
	c.JSON(http.StatusOK, res)
}

func (h *ChecklistHandler) ConvertChecklistEntryToCard(c *gin.Context) {
	ctx, userID, workspaceID, boardID, cardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	checklistIDStr := c.Param("checklistID")
	checklistID, err := uuid.Parse(checklistIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.ConvertChecklistEntryToCard")
		return
	}
	entryIDStr := c.Param("entryID")
	entryID, err := uuid.Parse(entryIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.ConvertChecklistEntryToCard")
		return
	}
	var req ConvertChecklistEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "checklist.handler.ConvertChecklistEntryToCard")
		return
	}
	res, err := h.Service.ConvertChecklistEntryToCard(ctx, *userID, *workspaceID, *boardID, *cardID, checklistID, entryID, *correlationID, &req)
	if err != nil {
		httperr.WriteOp(c, err, "checklist.handler.ConvertChecklistEntryToCard")
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *ChecklistHandler) MoveChecklistEntry(c *gin.Context) {
	ctx, userID, workspaceID, boardID, cardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	checklistIDStr := c.Param("checklistID")
	checklistID, err := uuid.Parse(checklistIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.MoveChecklistEntry")
		return
	}
	entryIDStr := c.Param("entryID")
	entryID, err := uuid.Parse(entryIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.MoveChecklistEntry")
		return
	}
	var req MoveChecklistEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.MoveChecklistEntry")
		return
	}
	checklistEntry, err := h.Service.MoveChecklistEntry(ctx, *userID, *workspaceID, *boardID, *cardID, checklistID, entryID, *correlationID, &req)
	if err != nil {
		httperr.WriteOp(c, err, "checklist.handler.MoveChecklistEntry")
		return
	}
	c.JSON(http.StatusOK, checklistEntry)
}

func (h *ChecklistHandler) AddMemberToChecklistEntry(c *gin.Context) {
	ctx, userID, workspaceID, boardID, cardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	checklistIDStr := c.Param("checklistID")
	checklistID, err := uuid.Parse(checklistIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.AddMemberToChecklistEntry")
		return
	}
	entryIDStr := c.Param("entryID")
	entryID, err := uuid.Parse(entryIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.AddMemberToChecklistEntry")
		return
	}
	var req AddMemberToChecklistEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.AddMemberToChecklistEntry")
		return
	}

	emtryMember, err := h.Service.AddMemberToChecklistEntry(ctx, *userID, *workspaceID, *boardID, *cardID, checklistID, entryID, req.MemberID, *correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "checklist.handler.AddMemberToChecklistEntry")
		return
	}
	c.JSON(http.StatusOK, emtryMember)
}

func (h *ChecklistHandler) RemoveMemberFromChecklistEntry(c *gin.Context) {
	ctx, userID, workspaceID, boardID, cardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		return
	}
	checklistIDStr := c.Param("checklistID")
	checklistID, err := uuid.Parse(checklistIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.RemoveMemberFromChecklistEntry")
		return
	}
	entryIDStr := c.Param("entryID")
	entryID, err := uuid.Parse(entryIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.RemoveMemberFromChecklistEntry")
		return
	}
	memberIDStr := c.Param("memberID")
	memberID, err := uuid.Parse(memberIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.RemoveMemberFromChecklistEntry")
		return
	}
	entryMember, err := h.Service.RemoveMemberFromChecklistEntry(ctx, *userID, *workspaceID, *boardID, *cardID, checklistID, entryID, memberID, *correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "checklist.handler.RemoveMemberFromChecklistEntry")
		return
	}
	c.JSON(http.StatusOK, entryMember)
}

func (h *ChecklistHandler) CrossMoveChecklistEntry(c *gin.Context) {
	ctx, userID, workspaceID, boardID, cardID, correlationID, err := getUserBoardContext(c)
	if err != nil {
		fmt.Println("Error 3", err)
		return
	}
	checklistIDStr := c.Param("checklistID")
	checklistID, err := uuid.Parse(checklistIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.CrossMoveChecklistEntry")
		fmt.Println("Error 2", err)
		return
	}
	entryIDStr := c.Param("entryID")
	entryID, err := uuid.Parse(entryIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.CrossMoveChecklistEntry")
		fmt.Println("Error 3", err)
		return
	}
	var req CrossMoveChecklistEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "checklist.handler.CrossMoveChecklistEntry")
		fmt.Println("Error binding JSON:", err)
		return
	}
	checklistEntry, err := h.Service.CrossMoveChecklistEntry(ctx, *userID, *workspaceID, *boardID, *cardID, checklistID, entryID, *correlationID, &req)
	if err != nil {
		httperr.WriteOp(c, err, "checklist.handler.CrossMoveChecklistEntry")
		fmt.Println("Error 4", err)
		return
	}
	c.JSON(http.StatusOK, checklistEntry)
}
