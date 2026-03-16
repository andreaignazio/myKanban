package sharelinks

import (
	"GoGORM/internal/dto"
	"time"

	"github.com/google/uuid"
)

type CreateShareLinkRequest struct {
	TargetType string    `json:"TargetType" binding:"required,oneof=board workspace"`
	TargetID   uuid.UUID `json:"TargetID" binding:"required"`
	Role       string    `json:"Role" binding:"required,oneof=admin member viewer"`
	Mode       string    `json:"Mode,omitempty" binding:"omitempty,oneof=autojoin sendrequest"`
	ExpiresAt  time.Time `json:"ExpiresAt,omitempty"`
}

type ClaimShareLinkResponse struct {
	PublicShareLink dto.PublicShareLinkResponse `json:"PublicShareLink"`
	UserBoard       *dto.UserBoardResponse      `json:"UserBoard"`
	UserWorkspace   *dto.UserWorkspaceResponse  `json:"UserWorkspace"`
}

type PublicShareLinkResponse struct {
	ShareLinks []dto.PublicShareLinkResponse `json:"ShareLinks"`
	Users      []dto.UserResponse            `json:"Users"`
}

type ShareLinkTargetLiteResponse struct {
	EntityType  string    `json:"EntityType"`
	Name        string    `json:"Name"`
	Description string    `json:"Description,omitempty"`
	CreatedAt   time.Time `json:"CreatedAt"`
	OwnerName   string    `json:"OwnerName,omitempty"`
}

type PublicShareLinkPreviewResponse struct {
	PublicShareLink dto.PublicShareLinkResponse `json:"PublicShareLink"`
	Target          ShareLinkTargetLiteResponse `json:"Target"`
}

type AuthenticatedShareLinkResponse struct {
	PublicShareLink dto.PublicShareLinkResponse `json:"PublicShareLink"`
	EntityType      string                      `json:"EntityType"`
	Board           *dto.BoardResponse          `json:"Board,omitempty"`
	Workspace       *dto.WorkspaceResponse      `json:"Workspace,omitempty"`
	Users           []dto.UserResponse          `json:"Users"`
	UserBoards      []dto.UserBoardResponse     `json:"UserBoards,omitempty"`
	UserWorkspaces  []dto.UserWorkspaceResponse `json:"UserWorkspaces,omitempty"`
}
