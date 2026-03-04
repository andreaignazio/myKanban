package memberships

import (
	"GoGORM/internal/dto"

	"github.com/google/uuid"
)

type BoardMembersResponse struct {
	User          dto.UserResponse          `json:"User"`
	UserBoard     dto.UserBoardResponse     `json:"Relation"`
	UserWorkspace dto.UserWorkspaceResponse `json:"UserWorkspace"`
}

type AddBoardMemberRequest struct {
	TargetUserID uuid.UUID `json:"TargetUserID" binding:"required"`
	Role         string    `json:"Role" binding:"required,oneof=admin member viewer"`
}

type ChangeBoardMemberRoleRequest struct {
	Role string `json:"Role" binding:"required,oneof=admin member viewer"`
}

type SearchUsersRequest struct {
	Query string `form:"query" binding:"required"`
}

type SearchUsersResponse struct {
	Users []dto.UserResponse `json:"Users"`
}

type GetUsersByIDsRequest struct {
	UserIDs []uuid.UUID `json:"UserIDs" binding:"required"`
}

type PatchMePropsRequest struct {
	Props map[string]any `json:"Props" binding:"required"`
}

type PatchMeDetailRequest struct {
	Name     *string `json:"Name,omitempty"`
	Username *string `json:"Username,omitempty"`
	Email    *string `json:"Email,omitempty"`
}

type RegisterUserRequest struct {
	Name     string `json:"Name" binding:"required"`
	Username string `json:"Username" binding:"required"`
	Email    string `json:"Email" binding:"required,email"`
	Password string `json:"Password" binding:"required,min=8"`
}

type WorkspaceUserUpdatedPayload struct {
	User dto.UserResponse `json:"User"`
}
