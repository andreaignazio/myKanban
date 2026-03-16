package workspaces

import (
	"GoGORM/internal/dto"
	"GoGORM/internal/rbac"
	"GoGORM/internal/server/httperr"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type WorkspacesHandler struct {
	WorkspaceService *WorkspaceService
}

func NewWorkspacesHandler(workspaceService *WorkspaceService) *WorkspacesHandler {
	return &WorkspacesHandler{WorkspaceService: workspaceService}
}

func (h *WorkspacesHandler) CreateUserWorkspace(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	var req CreateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "workspaces.handler.CreateUserWorkspace")
		return
	}
	workspaceResponse, userWorkspaceResponse, err := h.WorkspaceService.CreateWorkspace(ctx, userID, req)
	if err != nil {
		log.Printf("create workspace failed user=%s name=%q err=%v", userID, req.Name, err)
		httperr.WriteOp(c, err, "workspaces.handler.CreateUserWorkspace")
		return
	}

	response := dto.UserWorkspaceRowsResponse{
		Workspaces:             []dto.WorkspaceResponse{*workspaceResponse},
		UserWorkspaces:         []dto.UserWorkspaceResponse{*userWorkspaceResponse},
		WorkspaceSubscriptions: []dto.SubscriptionResponse{},
	}

	c.JSON(http.StatusOK, response)

}

func (h *WorkspacesHandler) GetUserWorkspaces(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	workspaces, userworkspaces, subscriptions, err := h.WorkspaceService.GetUserWorkspaces(ctx, userID)
	if err != nil {
		httperr.WriteOp(c, err, "workspaces.handler.GetUserWorkspaces")
		return
	}

	response := dto.UserWorkspaceRowsResponse{
		Workspaces:             workspaces,
		UserWorkspaces:         userworkspaces,
		WorkspaceSubscriptions: subscriptions,
	}

	c.JSON(http.StatusOK, response)

}

func (h *WorkspacesHandler) PatchWorkspaceProps(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	workspaceIDParam := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDParam)
	if err != nil {
		httperr.WriteParamsError(c, err, "workspaces.handler.PatchWorkspaceProps")
		return
	}

	var req PatchWorkspacePropsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "workspaces.handler.PatchWorkspaceProps")
		return
	}

	response, err := h.WorkspaceService.PatchWorkspaceProps(ctx, userID, workspaceID, correlationID, req)
	if err != nil {
		httperr.WriteOp(c, err, "workspaces.handler.PatchWorkspaceProps")
		return
	}

	c.JSON(http.StatusOK, response)
}

func (h *WorkspacesHandler) SearchPublicWorkspaces(c *gin.Context) {
	ctx := c.Request.Context()

	query := strings.TrimSpace(c.Query("query"))
	page := 1
	limit := 20
	sort := "updated"

	if pageRaw := strings.TrimSpace(c.Query("page")); pageRaw != "" {
		parsedPage, err := strconv.Atoi(pageRaw)
		if err != nil || parsedPage < 1 {
			if err == nil {
				err = fmt.Errorf("invalid page")
			}
			httperr.WriteParamsError(c, err, "workspaces.handler.SearchPublicWorkspaces")
			return
		}
		page = parsedPage
	}
	if limitRaw := strings.TrimSpace(c.Query("limit")); limitRaw != "" {
		parsedLimit, err := strconv.Atoi(limitRaw)
		if err != nil || parsedLimit < 1 {
			if err == nil {
				err = fmt.Errorf("invalid limit")
			}
			httperr.WriteParamsError(c, err, "workspaces.handler.SearchPublicWorkspaces")
			return
		}
		if parsedLimit > 100 {
			parsedLimit = 100
		}
		limit = parsedLimit
	}
	if sortRaw := strings.TrimSpace(c.Query("sort")); sortRaw != "" {
		if sortRaw != "name" && sortRaw != "updated" {
			httperr.WriteParamsError(c, fmt.Errorf("invalid sort"), "workspaces.handler.SearchPublicWorkspaces")
			return
		}
		sort = sortRaw
	}

	workspaces, subscriptions, total, err := h.WorkspaceService.SearchPublicWorkspaces(ctx, query, page, limit, sort)
	if err != nil {
		httperr.WriteOp(c, err, "workspaces.handler.SearchPublicWorkspaces")
		return
	}

	response := SearchPublicWorkspacesResponse{
		Workspaces:             workspaces,
		WorkspaceSubscriptions: subscriptions,
		Page:                   page,
		Limit:                  limit,
		Sort:                   sort,
		Total:                  total,
	}

	c.JSON(http.StatusOK, response)
}

func (h *WorkspacesHandler) GetPendingOfferTargetWorkspacesForUser(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	workspaces, subscriptions, shareOffers, err := h.WorkspaceService.GetPendingOfferTargetWorkspacesForUser(ctx, userID)
	if err != nil {
		httperr.WriteOp(c, err, "workspaces.handler.GetPendingOfferTargetWorkspacesForUser")
		return
	}

	response := WorkspacesWithSubscriptionsResponse{
		Workspaces:             workspaces,
		WorkspaceSubscriptions: subscriptions,
		ShareOffers:            shareOffers,
	}

	c.JSON(http.StatusOK, response)
}

func (h *WorkspacesHandler) GetWorkspaceBoardsForUserID(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	workspaceIDParam := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDParam)
	if err != nil {
		httperr.WriteParamsError(c, err, "workspaces.handler.GetWorkspaceBoardsForUserID")
		return
	}

	boards, userboards, err := h.WorkspaceService.GetWorkspaceBoardsForUserID(ctx, userID, workspaceID)
	if err != nil {
		httperr.WriteOp(c, err, "workspaces.handler.GetWorkspaceBoardsForUserID")
		return
	}

	response := dto.UserBoardRowsResponse{
		Boards:     boards,
		UserBoards: userboards,
	}

	canModifyByBoardID := make(map[uuid.UUID]bool, len(userboards))
	for i := range userboards {
		boardID := userboards[i].BoardID
		parsedRole, ok := rbac.ParseRole(userboards[i].Role)
		canModifyByBoardID[boardID] = ok && rbac.AtLeast(parsedRole, rbac.Member)
	}
	response.CanModifyByBoardID = canModifyByBoardID

	c.JSON(http.StatusOK, response)
}

func (h *WorkspacesHandler) GetWorkspacesBoardsForUserID(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	response, err := h.WorkspaceService.GetWorkspacesBoardsForUserID(ctx, userID)
	if err != nil {
		httperr.WriteOp(c, err, "workspaces.handler.GetWorkspacesBoardsForUserID")
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *WorkspacesHandler) CreateBoardInWorkspace(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	workspaceIDParam := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDParam)
	if err != nil {
		httperr.WriteParamsError(c, err, "workspaces.handler.CreateBoardInWorkspace")
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)

	var req CreateBoardInWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "workspaces.handler.CreateBoardInWorkspace")
		fmt.Println("Error binding JSON:", err)
		return
	}
	boardResponse, userBoardResponse, err := h.WorkspaceService.CreateBoardInWorkspace(ctx, userID, workspaceID, correlationID, req)
	if err != nil {
		httperr.WriteOp(c, err, "workspaces.handler.CreateBoardInWorkspace")
		fmt.Println("Error creating board in workspace:", err)
		return
	}
	response := dto.UserBoardRowsResponse{
		Boards:     []dto.BoardResponse{*boardResponse},
		UserBoards: []dto.UserBoardResponse{*userBoardResponse},
	}

	c.JSON(http.StatusOK, response)
}

func (h *WorkspacesHandler) GetWorkspaceMembers(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	workspaceIDParam := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDParam)
	if err != nil {
		httperr.WriteParamsError(c, err, "workspaces.handler.GetWorkspaceMembers")
		return
	}
	members, userworkspace, err := h.WorkspaceService.GetWorkspaceMembers(ctx, userID, workspaceID)
	if err != nil {
		httperr.WriteOp(c, err, "workspaces.handler.GetWorkspaceMembers")
		return
	}
	response := dto.WorkspaceMembersResponse{
		User:           members,
		UsersWorkspace: userworkspace,
	}

	c.JSON(http.StatusOK, response)

}

func (h *WorkspacesHandler) AddWorkspaceMember(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	workspaceIDParam := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDParam)
	if err != nil {
		httperr.WriteParamsError(c, err, "workspaces.handler.AddWorkspaceMember")
		return
	}
	var req AddWorkspaceMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "workspaces.handler.AddWorkspaceMember")
		return
	}
	user, userworkspace, err := h.WorkspaceService.AddWorkspaceMember(ctx, userID, workspaceID, req)
	if err != nil {
		httperr.WriteOp(c, err, "workspaces.handler.AddWorkspaceMember")
		return
	}
	res := dto.WorkspaceMembersResponse{
		User:           []dto.UserResponse{*user},
		UsersWorkspace: []dto.UserWorkspaceResponse{*userworkspace},
	}

	c.JSON(http.StatusOK, res)
}

func (h *WorkspacesHandler) CloseBoardInWorkspace(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	workspaceIDParam := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDParam)
	if err != nil {
		httperr.WriteParamsError(c, err, "workspaces.handler.CloseBoardInWorkspace")
		fmt.Println("Error parsing workspaceID:", err)
		return
	}
	boardIDParam := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDParam)
	if err != nil {
		httperr.WriteParamsError(c, err, "workspaces.handler.CloseBoardInWorkspace")
		fmt.Println("Error parsing boardID:", err)
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	response, err := h.WorkspaceService.CloseBoardInWorkspace(ctx, userID, workspaceID, boardID, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "workspaces.handler.CloseBoardInWorkspace")
		fmt.Println("Service error closing board in workspace:", err)
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *WorkspacesHandler) RestoreBoardInWorkspace(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	workspaceIDParam := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDParam)
	if err != nil {
		httperr.WriteParamsError(c, err, "workspaces.handler.RestoreBoardInWorkspace")
		return
	}
	boardIDParam := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDParam)
	if err != nil {
		httperr.WriteParamsError(c, err, "workspaces.handler.RestoreBoardInWorkspace")
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	response, err := h.WorkspaceService.RestoreBoardInWorkspace(ctx, userID, workspaceID, boardID, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "workspaces.handler.RestoreBoardInWorkspace")
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *WorkspacesHandler) PurgeBoardInWorkspace(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	workspaceIDParam := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDParam)
	if err != nil {
		httperr.WriteParamsError(c, err, "workspaces.handler.PurgeBoardInWorkspace")
		return
	}
	boardIDParam := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDParam)
	if err != nil {
		httperr.WriteParamsError(c, err, "workspaces.handler.PurgeBoardInWorkspace")
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	response, err := h.WorkspaceService.PurgeBoardInWorkspace(ctx, userID, workspaceID, boardID, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "workspaces.handler.PurgeBoardInWorkspace")
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *WorkspacesHandler) GetClosedBoardsInWorkspace(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	workspaceIDParam := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDParam)
	if err != nil {
		httperr.WriteParamsError(c, err, "workspaces.handler.GetClosedBoardsInWorkspace")
		return
	}
	closedBoards, userBoards, err := h.WorkspaceService.GetClosedBoardsInWorkspace(ctx, userID, workspaceID)
	if err != nil {
		httperr.WriteOp(c, err, "workspaces.handler.GetClosedBoardsInWorkspace")
		return
	}

	response := dto.UserBoardRowsResponse{
		Boards:     closedBoards,
		UserBoards: userBoards,
	}
	c.JSON(http.StatusOK, response)
}

func (h *WorkspacesHandler) ChangeWorkspaceMemberRole(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	workspaceIDParam := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDParam)
	if err != nil {
		httperr.WriteParamsError(c, err, "workspaces.handler.ChangeWorkspaceMemberRole")
		return
	}
	memberIDParam := c.Param("memberID")
	memberID, err := uuid.Parse(memberIDParam)
	if err != nil {
		httperr.WriteParamsError(c, err, "workspaces.handler.ChangeWorkspaceMemberRole")
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	var req ChangeWorkspaceMemberRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "workspaces.handler.ChangeWorkspaceMemberRole")
		return
	}
	response, err := h.WorkspaceService.ChangeWorkspaceMemberRole(ctx, userID, workspaceID, memberID, correlationID, req)
	if err != nil {
		httperr.WriteOp(c, err, "workspaces.handler.ChangeWorkspaceMemberRole")
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *WorkspacesHandler) DeleteWorkspaceMember(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	workspaceIDParam := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDParam)
	if err != nil {
		httperr.WriteParamsError(c, err, "workspaces.handler.DeleteWorkspaceMember")
		return
	}
	memberIDParam := c.Param("memberID")
	memberID, err := uuid.Parse(memberIDParam)
	if err != nil {
		httperr.WriteParamsError(c, err, "workspaces.handler.DeleteWorkspaceMember")
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	response, err := h.WorkspaceService.DeleteWorkspaceMember(ctx, userID, workspaceID, memberID, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "workspaces.handler.DeleteWorkspaceMember")
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *WorkspacesHandler) DeleteWorkspace(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	workspaceID, err := uuid.Parse(c.Param("workspaceID"))
	if err != nil {
		httperr.WriteParamsError(c, err, "workspaces.handler.DeleteWorkspace")
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	response, err := h.WorkspaceService.DeleteWorkspace(ctx, userID, workspaceID, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "workspaces.handler.DeleteWorkspace")
		return
	}
	c.JSON(http.StatusOK, response)
}
