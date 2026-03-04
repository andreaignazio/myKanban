package workspaces

import (
	"GoGORM/internal/dto"

	"github.com/google/uuid"
)

type CreateWorkspaceRequest struct {
	Name string `json:"Name" binding:"required"`
}

type WorkspaceCoverProps struct {
	Type     *string `json:"Type,omitempty"`
	ImageUrl *string `json:"ImageUrl,omitempty"`
	Color    *string `json:"Color,omitempty"`
}

type WorkspaceProps struct {
	IconID          *string              `json:"IconID,omitempty"`
	IconBg          *string              `json:"IconBg,omitempty"`
	IconBorderColor *string              `json:"IconBorderColor,omitempty"`
	FooterColor     *string              `json:"FooterColor,omitempty"`
	Cover           *WorkspaceCoverProps `json:"Cover,omitempty"`
	Description     *string              `json:"Description,omitempty"`
}

type PatchWorkspacePropsRequest struct {
	Name       *string        `json:"Name,omitempty"`
	Visibility *string        `json:"Visibility,omitempty"`
	Props      WorkspaceProps `json:"Props"`
}

type CreateBoardInWorkspaceRequest struct {
	Name       string                  `json:"Name" binding:"required"`
	Visibility string                  `json:"Visibility" binding:"required"`
	Props      *map[string]interface{} `json:"Props,omitempty"`
}

type AddWorkspaceMemberRequest struct {
	TargetUserID uuid.UUID `json:"TargetUserID" binding:"required"`
	Role         string    `json:"Role" binding:"required"`
}

type ChangeWorkspaceMemberRoleRequest struct {
	Role string `json:"Role" binding:"required"`
}

type SearchPublicWorkspacesRequest struct {
	Query string `form:"query"`
	Page  int    `form:"page"`
	Limit int    `form:"limit"`
	Sort  string `form:"sort"`
}

type SearchPublicWorkspacesResponse struct {
	Workspaces             []dto.WorkspaceResponse    `json:"Workspaces"`
	WorkspaceSubscriptions []dto.SubscriptionResponse `json:"WorkspaceSubscriptions"`
	Page                   int                        `json:"Page"`
	Limit                  int                        `json:"Limit"`
	Sort                   string                     `json:"Sort"`
	Total                  int64                      `json:"Total"`
}

type WorkspacesWithSubscriptionsResponse struct {
	Workspaces             []dto.WorkspaceResponse    `json:"Workspaces"`
	WorkspaceSubscriptions []dto.SubscriptionResponse `json:"WorkspaceSubscriptions"`
	ShareOffers            []dto.ShareOfferResponse   `json:"ShareOffers"`
}
