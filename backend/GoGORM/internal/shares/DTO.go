package shares

import (
	"GoGORM/internal/dto"
	"GoGORM/internal/rbac"
	"GoGORM/models"
	"time"

	"github.com/google/uuid"
)

type CreateListShareOfferRequest struct {
	TargetBoardID      uuid.UUID `json:"TargetBoardID" binding:"required"`
	ProposedAccessMode string    `json:"ProposedAccessMode" binding:"required,oneof=editable readonly"`
}

type RespondToListShareOfferRequest struct {
	ID                 uuid.UUID                `json:"ID"`
	SourceBoardID      uuid.UUID                `json:"SourceBoardID"`
	TargetBoardID      uuid.UUID                `json:"TargetBoardID"`
	ListID             uuid.UUID                `json:"ListID"`
	Status             models.ShareOfferStatus  `json:"Status"`
	ProposedAccessMode rbac.BoardListAccessMode `json:"ProposedAccessMode"`
	CreatedByUserID    uuid.UUID                `json:"CreatedByUserID"`
	DecidedByUserID    *uuid.UUID               `json:"DecidedByUserID"`
	DecidedAt          *time.Time               `json:"DecidedAt"`
	DeletedAt          *time.Time               `json:"DeletedAt,omitempty"`
}

type ShareOfferRevokeRequest struct {
	Reason string `json:"Reason" binding:"omitempty,max=500"`
}

type ShareOfferResponse struct {
	Decision   string                   `json:"Decision" binding:"required,oneof=accepted rejected"`
	AccessMode rbac.BoardListAccessMode `json:"AccessMode" binding:"omitempty,oneof=editable readonly"`
}

type RespondToListShareOfferDTO struct {
	ShareOfferResponse *RespondToListShareOfferRequest
	BoardListResponse  *dto.BoardListResponse
}

type CreateShareOfferRequest struct {
	ToUserIDs   []uuid.UUID `json:"ToUserIDs" binding:"required"`
	OfferedRole string      `json:"OfferedRole" binding:"required"`
	Message     string      `json:"Message" binding:"omitempty,max=500"`
}

type CreateBoardAccessRequest struct {
	RequestedRole string `json:"RequestedRole" binding:"omitempty,oneof=viewer member"`
	Message       string `json:"Message" binding:"omitempty,max=500"`
}

type CreateWorkspaceAccessRequest struct {
	RequestedRole string `json:"RequestedRole" binding:"omitempty,oneof=viewer member"`
	Message       string `json:"Message" binding:"omitempty,max=500"`
}

type RespondToShareOfferRequest struct {
	Decision string `json:"Decision" binding:"required,oneof=accepted rejected"`
}

type ShareOfferDetailsRequest struct {
}

type ShareOfferDetailsByIDResponse struct {
	ShareOffer             dto.ShareOfferResponse        `json:"ShareOffer"`
	InvolvedUsers          []dto.UserResponse            `json:"InvolvedUsers"`
	TargetWorkspaceDetails *dto.WorkspaceDetailsResponse `json:"TargetWorkspaceDetails,omitempty"`
	TargetBoardDetails     *dto.BoardOfferDetailResponse `json:"TargetBoardDetails,omitempty"`
}

type UserIncomingShareOffersDetails struct {
	DetailedShareOffers []dto.ShareOfferDetailsResponse `json:"ShareOffers"`
}

type BoardShareOffersDetails struct {
	ShareOffer             dto.ShareOfferResponse       `json:"ShareOffer"`
	TargetBoardDetails     dto.BoardOfferDetailResponse `json:"TargetBoardDetails"`
	TargetWorkspaceDetails dto.WorkspaceDetailsResponse `json:"TargetWorkspaceDetails"`
}

type BoardOfferDetailResponse struct {
	Board        dto.BoardResponse         `json:"Board"`
	BoardMembers []dto.BoardMemberResponse `json:"BoardMembers"`
}

type BoardMemberResponse struct {
	User      dto.UserResponse      `json:"User"`
	UserBoard dto.UserBoardResponse `json:"UserBoardRelation"`
}

type WorkspaceOutgoingShareOfferResponse struct {
	ShareOffer dto.ShareOfferResponse `json:"ShareOffer"`
	Users      []dto.UserResponse     `json:"Users"`
}

type PendingWorkspaceBoardTargetsResponse struct {
	OfferedBoards   []dto.BoardResponse      `json:"OfferedBoards"`
	RequestedBoards []dto.BoardResponse      `json:"RequestedBoards"`
	ShareOffers     []dto.ShareOfferResponse `json:"ShareOffers"`
}

type BoardPendingAccessRequestCountResponse struct {
	Board                dto.BoardResponse `json:"Board"`
	PendingRequestsCount int               `json:"PendingRequestsCount"`
}

type PendingWorkspaceBoardAccessRequestsResponse struct {
	BoardRequests []BoardPendingAccessRequestCountResponse `json:"BoardRequests"`
}
