package boards

import (
	"GoGORM/internal/dto"

	"github.com/google/uuid"
)

type CreateBoardRequest struct {
	Name       string          `json:"Name" binding:"required"`
	Visibility string          `json:"Visibility" binding:"required"`
	AfterID    *uuid.UUID      `json:"AfterID"`
	InsertAt   *string         `json:"InsertAt"`
	Props      *dto.BoardProps `json:"Props,omitempty"`
}

type PatchBoardReqest struct {
	Name       *string        `json:"Name" binding:"omitempty"`
	Visibility *string        `json:"Visibility" binding:"omitempty"`
	Props      map[string]any `json:"Props" binding:"omitempty"`
}

type UserBoardProps struct {
	Starred *bool `json:"Starred,omitempty"`
}

type PatchMyUserBoardPropsRequest struct {
	Props UserBoardProps `json:"Props" binding:"required"`
}

type BoardForUserResponse struct {
	BoardResponse     dto.BoardResponse     `json:"Board"`
	UserBoardResponse dto.UserBoardResponse `json:"Relation"`
}

type ListDetailResponse struct {
	List  dto.ListResponse
	Cards []dto.CardResponse
}

type ListCardDetailResponse struct {
	Card     dto.CardResponse     `json:"Card"`
	Relation dto.ListCardResponse `json:"Relation"`
}

type BoardListDetailResponse struct {
	List     dto.ListResponse         `json:"List"`
	Relation dto.BoardListResponse    `json:"Relation"`
	Cards    []ListCardDetailResponse `json:"Cards"`
}

type UserBoardDetailResponse struct {
	Board    dto.BoardResponse         `json:"Board"`
	Relation dto.UserBoardResponse     `json:"Relation"`
	Lists    []BoardListDetailResponse `json:"Lists"`
}
