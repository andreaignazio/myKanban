package memberships

import (
	"GoGORM/internal/dto"
	"GoGORM/internal/server/httperr"
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type MembershipHandler struct {
	service *MembershipService
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

func NewMembershipHandler(service *MembershipService) *MembershipHandler {
	return &MembershipHandler{service: service}
}

func (h *MembershipHandler) GetBoardMembers(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
	if err != nil {
		return
	}
	workspaceIDValue, ok := c.Get("workspaceID")
	if !ok {
		httperr.WriteParamsError(c, errors.New("workspaceID missing in request context"), "memberships.handler.GetBoardMembers")
		return
	}
	workspaceID, ok := workspaceIDValue.(uuid.UUID)
	if !ok || workspaceID == uuid.Nil {
		httperr.WriteParamsError(c, errors.New("invalid workspaceID in request context"), "memberships.handler.GetBoardMembers")
		return
	}

	members, err := h.service.GetBoardMembers(ctx, *userID, *boardID, workspaceID)
	if err != nil {
		httperr.Write(c, err)
		return
	}

	res := make([]BoardMembersResponse, 0, len(members))
	for _, member := range members {
		userResponse := dto.UserToResponse(&member.User)
		UserBoardResponse := dto.UserBoardToResponse(&member.UserBoard)
		userWorkspaceResponse := dto.UserWorkspaceToResponse(&member.UserWorkspace)

		res = append(res, BoardMembersResponse{
			User:          userResponse,
			UserBoard:     UserBoardResponse,
			UserWorkspace: userWorkspaceResponse,
		})
	}
	c.JSON(http.StatusOK, res)
}

func (h *MembershipHandler) AddBoardMember(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
	if err != nil {
		return
	}
	var req AddBoardMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "memberships.handler.AddBoardMember")
		return
	}

	userBoard, err := h.service.AddBoardMember(ctx, *userID, *boardID, req)
	if err != nil {
		httperr.WriteOp(c, err, "memberships.handler.AddBoardMember")
		return
	}

	userBoardResponse := dto.UserBoardToResponse(userBoard)
	c.JSON(http.StatusOK, userBoardResponse)
}

func (h *MembershipHandler) ChangeBoardMemberRole(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
	if err != nil {
		return
	}
	memberIDStr := c.Param("memberID")
	memberID, err := uuid.Parse(memberIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "memberships.handler.ChangeBoardMemberRole")
		return
	}
	var req ChangeBoardMemberRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "memberships.handler.ChangeBoardMemberRole")
		return
	}
	userBoard, err := h.service.ChangeBoardMemberRole(ctx, *userID, *boardID, memberID, req)
	if err != nil {
		httperr.WriteOp(c, err, "memberships.handler.ChangeBoardMemberRole")
		return
	}
	userBoardResponse := MappingUserBoardToResponse(*userBoard)
	c.JSON(http.StatusOK, userBoardResponse)
}

func (h *MembershipHandler) DeleteBoardMember(c *gin.Context) {
	ctx, userID, boardID, err := getContext(c)
	if err != nil {
		return
	}
	workspaceIDValue, ok := c.Get("workspaceID")
	if !ok {
		httperr.WriteParamsError(c, errors.New("workspaceID missing in request context"), "memberships.handler.DeleteBoardMember")
		return
	}
	workspaceID, ok := workspaceIDValue.(uuid.UUID)
	if !ok || workspaceID == uuid.Nil {
		httperr.WriteParamsError(c, errors.New("invalid workspaceID in request context"), "memberships.handler.DeleteBoardMember")
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	memberIDStr := c.Param("memberID")
	memberID, err := uuid.Parse(memberIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "memberships.handler.DeleteBoardMember")
		return
	}
	if err := h.service.DeleteBoardMember(ctx, *userID, *boardID, workspaceID, memberID, correlationID); err != nil {
		httperr.WriteOp(c, err, "memberships.handler.DeleteBoardMember")
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *MembershipHandler) SearchUsers(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	/*var req SearchUsersRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		httperr.WriteParamsError(c, err, "memberships.handler.SearchUsers")
		return
	}*/
	query := c.Query("query")
	users, err := h.service.SearchUsers(ctx, userID, query)
	if err != nil {
		httperr.WriteOp(c, err, "memberships.handler.SearchUsers")
		return
	}
	res := SearchUsersResponse{
		Users: users,
	}
	c.JSON(http.StatusOK, res)
}

func (h *MembershipHandler) GetUsersByIDs(c *gin.Context) {
	ctx := c.Request.Context()
	var req GetUsersByIDsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "memberships.handler.GetUsersByIDs")
		return
	}
	users, err := h.service.GetUsersByIDs(ctx, req)
	if err != nil {
		httperr.WriteOp(c, err, "memberships.handler.GetUsersByIDs")
		return
	}
	res := dto.UsersToResponses(users)
	c.JSON(http.StatusOK, res)
}

func (h *MembershipHandler) GetMe(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	response, err := h.service.GetMe(ctx, userID)
	if err != nil {
		httperr.WriteOp(c, err, "memberships.handler.GetMe")
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *MembershipHandler) PatchMeProps(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	correlationID := c.MustGet("correlationID").(uuid.UUID)

	var req PatchMePropsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "memberships.handler.PatchMeProps")
		return
	}

	response, err := h.service.PatchMeProps(ctx, userID, correlationID, req)
	if err != nil {
		httperr.WriteOp(c, err, "memberships.handler.PatchMeProps")
		return
	}

	c.JSON(http.StatusOK, response)
}

func (h *MembershipHandler) PatchMeDetail(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	correlationID := c.MustGet("correlationID").(uuid.UUID)

	var req PatchMeDetailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "memberships.handler.PatchMeDetail")
		return
	}

	response, err := h.service.PatchMeDetail(ctx, userID, correlationID, req)
	if err != nil {
		httperr.WriteOp(c, err, "memberships.handler.PatchMeDetail")
		return
	}

	c.JSON(http.StatusOK, response)
}

func (h *MembershipHandler) RegisterUser(c *gin.Context) {
	ctx := c.Request.Context()

	var req RegisterUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "memberships.handler.RegisterUser")
		return
	}

	response, err := h.service.RegisterUser(ctx, req)
	if err != nil {
		httperr.WriteOp(c, err, "memberships.handler.RegisterUser")
		return
	}

	c.JSON(http.StatusCreated, response)
}
