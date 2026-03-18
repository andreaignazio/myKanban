package links

import (
	"GoGORM/internal/dto"
	"time"

	"github.com/google/uuid"
)

type MoveListInBoardDTO struct {
	BeforeID *uuid.UUID `json:"BeforeID" binding:"omitempty"`
	InsertAt *string    `json:"InsertAt" binding:"omitempty"`
}

type MoveBoardListDTO struct {
	TargetBoardID *uuid.UUID `json:"TargetBoardID" binding:"omitempty"`
	BeforeID      *uuid.UUID `json:"BeforeID" binding:"omitempty"`
	AfterID       *uuid.UUID `json:"AfterID" binding:"omitempty"`
	InsertAt      *string    `json:"InsertAt" binding:"omitempty"`
}

type MoveBoardListResponse struct {
	SourceBoardList *dto.BoardListResponse `json:"SourceBoardList,omitempty"`
	TargetBoardList *dto.BoardListResponse `json:"TargetBoardList,omitempty"`
}

type MirrorBoardListDTO struct {
	TargetBoardID uuid.UUID  `json:"TargetBoardID" binding:"required"`
	BeforeID      *uuid.UUID `json:"BeforeID" binding:"omitempty"`
	InsertAt      *string    `json:"InsertAt" binding:"omitempty"`
}

type MirrorBoardListResponse struct {
	List      dto.ListResponse      `json:"List"`
	BoardList dto.BoardListResponse `json:"BoardList"`
}

type BoardListMirrorItem struct {
	Board     dto.BoardResponse     `json:"Board"`
	BoardList dto.BoardListResponse `json:"BoardList"`
	IsRoot    bool                  `json:"IsRoot"`
	HasAccess bool                  `json:"HasAccess"`
}

type BoardListMirrorsResponse struct {
	RootBoardListID    uuid.UUID             `json:"RootBoardListID"`
	CurrentBoardListID uuid.UUID             `json:"CurrentBoardListID"`
	Items              []BoardListMirrorItem `json:"Items"`
}

type ListInBoardResponseOLD struct {
	ListID    uuid.UUID  `json:"ListID"`
	BoardID   uuid.UUID  `json:"BoardID"`
	Position  string     `json:"Position"`
	DeletedAt *time.Time `json:"DeletedAt,omitempty"`
}

type MoveBulkListInBoardDTO struct {
	ListIDs     []uuid.UUID `json:"ListIDs" binding:"required"`
	AfterListID *uuid.UUID  `json:"AfterID" binding:"omitempty"`
	InsertAt    *string     `json:"InsertAt" binding:"omitempty"`
}

type BulkListInBoardResponse struct {
	ListIDs   []uuid.UUID `json:"ListIDs"`
	BoardID   uuid.UUID   `json:"BoardID"`
	Positions []string    `json:"Positions"`
}

type CreateListInBoardRequest struct {
	Title    string     `json:"Title" binding:"required"`
	AfterID  *uuid.UUID `json:"AfterID" binding:"omitempty"`
	InsertAt *string    `json:"InsertAt" binding:"omitempty"`
}

type BulkCopyListsRequest struct {
	ListIDs     []uuid.UUID       `json:"ListIDs" binding:"omitempty"`
	Lists       []BulkCopyListRef `json:"Lists" binding:"omitempty"`
	AfterID     *uuid.UUID        `json:"AfterID" binding:"omitempty"`
	InsertAt    *string           `json:"InsertAt" binding:"omitempty"`
	KeepMembers *bool             `json:"KeepMembers" binding:"omitempty"`
}

type BulkCopyListRef struct {
	ListID uuid.UUID `json:"ListID" binding:"required"`
	Title  *string   `json:"Title" binding:"omitempty"`
}

type BulkCopiedListItem struct {
	SourceListID uuid.UUID `json:"SourceListID"`
	TargetListID uuid.UUID `json:"TargetListID"`
	CopiedCards  int       `json:"CopiedCards"`
}

type BulkCopyListsResponse struct {
	Items            []BulkCopiedListItem `json:"Items"`
	TotalCopiedLists int                  `json:"TotalCopiedLists"`
	TotalCopiedCards int                  `json:"TotalCopiedCards"`
}

type ListInBoardResponse struct {
	List      dto.ListResponse      `json:"List"`
	BoardList dto.BoardListResponse `json:"Relation"`
}

type PatchListAccessModeRequest struct {
	AccessMode string `json:"AccessMode" binding:"required,oneof=readonly editable"`
}

type BoardListDetailResponse struct {
	BoardList dto.BoardListResponse  `json:"BoardList"`
	ListCards []dto.ListCardResponse `json:"ListCards"`
}
type UserBoardDetailResponse struct {
	UserBoard  dto.UserBoardResponse     `json:"UserBoard"`
	BoardLists []BoardListDetailResponse `json:"BoardLists"`
}

type BoardDetailResponse struct {
	VisibilityRole     string                         `json:"VisibilityRole"`
	Board              dto.BoardResponse              `json:"Board"`
	Lists              map[uuid.UUID]dto.ListResponse `json:"Lists"`
	Cards              map[uuid.UUID]dto.CardResponse `json:"Cards"`
	BoardListRelations []dto.BoardListResponse        `json:"BoardListRelations"`
	ListCardRelations  []dto.ListCardResponse         `json:"ListCardRelations"`
}

type RestoreBoardListsRequest struct {
	BoardListIDs []uuid.UUID `json:"BoardListIDs" binding:"required,min=1"`
}

type RestoreListCardsRequest struct {
	ListCardIDs []uuid.UUID `json:"ListCardIDs" binding:"required,min=1"`
}

type PurgeBoardListsRequest struct {
	BoardListIDs []uuid.UUID `json:"BoardListIDs" binding:"required,min=1"`
}

type PurgeListCardsRequest struct {
	ListCardIDs []uuid.UUID `json:"ListCardIDs" binding:"required,min=1"`
}

type DeletedBoardRelationsResponse struct {
	Lists              map[uuid.UUID]dto.ListResponse `json:"Lists"`
	Cards              map[uuid.UUID]dto.CardResponse `json:"Cards"`
	BoardListRelations []dto.BoardListResponse        `json:"BoardListRelations"`
	ListCardRelations  []dto.ListCardResponse         `json:"ListCardRelations"`
}
