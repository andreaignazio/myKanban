package listcards

import (
	"GoGORM/internal/dto"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type CreateCardRequest struct {
	Title    string     `json:"Title" binding:"required"`
	AfterID  *uuid.UUID `json:"AfterID" binding:"omitempty"`
	InsertAt *string    `json:"InsertAt" binding:"omitempty"`
}

type CreateCardResponse struct {
	Card     dto.CardResponse
	ListCard dto.ListCardResponse
}

type ListMetaResponse struct {
	ID        uuid.UUID  `json:"ID"`
	Title     string     `json:"Title"`
	DeletedAt *time.Time `json:"DeletedAt,omitempty"`
}

type ListCardDetailResponse struct {
	ListCardID      uuid.UUID      `json:"ListCardID"`
	CardID          uuid.UUID      `json:"CardID"`
	Title           string         `json:"Title"`
	Done            bool           `json:"Done"`
	Description     string         `json:"Description,omitempty"`
	StartDate       *time.Time     `json:"StartDate,omitempty"`
	EndDate         *time.Time     `json:"EndDate,omitempty"`
	Props           datatypes.JSON `json:"Props,omitempty"`
	CreatedByUserID uuid.UUID      `json:"CreatedByUserID"`
	CreatedInListID uuid.UUID      `json:"CreatedInListID"`
	CreatedAt       time.Time      `json:"CreatedAt"`
	UpdatedAt       time.Time      `json:"UpdatedAt"`
	DeletedAt       *time.Time     `json:"DeletedAt,omitempty"`
	ListID          uuid.UUID      `json:"ListID"`
	Position        string         `json:"Position"`
	ListCreatedAt   time.Time      `json:"ListCreatedAt"`
	ListUpdatedAt   time.Time      `json:"ListUpdatedAt"`
	ListDeletedAt   *time.Time     `json:"ListDeletedAt,omitempty"`
}

type ListDetailResponse struct {
	List  ListMetaResponse         `json:"List"`
	Cards []ListCardDetailResponse `json:"Cards"`
}

type ListDetailPatchResponse struct {
	Cards             map[uuid.UUID]dto.CardResponse `json:"Cards"`
	ListCardRelations []dto.ListCardResponse         `json:"ListCardRelations"`
}

type CrossMoveCardRequest struct {
	ListCardID      uuid.UUID  `json:"ListCardID" binding:"required"`
	TargetListID    uuid.UUID  `json:"TargetListID" binding:"required"`
	FromListID      *uuid.UUID `json:"FromListID" binding:"omitempty"`
	DetatchFromList *bool      `json:"DetatchFromList" `
	AfterID         *uuid.UUID `json:"AfterID" binding:"omitempty"`
	BeforeID        *uuid.UUID `json:"BeforeID" binding:"omitempty"`
	InsertAt        *string    `json:"InsertAt" binding:"omitempty"`
}

type CrossMoveCardResponse struct {
	TargetListCard    dto.ListCardResponse  `json:"TargetListCard"`
	DetatchedListCard *dto.ListCardResponse `json:"DetatchedListCard,omitempty"`
}

type BulkCrossMoveCardsRequest struct {
	CardIDs           []uuid.UUID `json:"CardIDs" binding:"required"`
	TargetListID      uuid.UUID   `json:"TargetListID" binding:"required"`
	FromListID        uuid.UUID   `json:"FromListID" binding:"required"`
	DetatchFromSource bool        `json:"DetatchFromSource" binding:"required"`
	AfterID           *uuid.UUID  `json:"AfterID" binding:"omitempty"`
	InsertAt          *string     `json:"InsertAt" binding:"omitempty"`
}

type BulkCrossMoveCardsResponse struct {
	MovedListCards     []dto.ListCardResponse `json:"TargetListCards"`
	DetatchedListCards []dto.ListCardResponse `json:"DetatchedListCards,omitempty"`
}

type BulkMoveListCardsInBoardRequest struct {
	ListCardIDs  []uuid.UUID `json:"ListCardIDs" binding:"required"`
	TargetListID uuid.UUID   `json:"TargetListID" binding:"required"`
	AfterID      *uuid.UUID  `json:"AfterID" binding:"omitempty"`
	BeforeID     *uuid.UUID  `json:"BeforeID" binding:"omitempty"`
	InsertAt     *string     `json:"InsertAt" binding:"omitempty"`
}

type BulkMoveListCardsInBoardResponse struct {
	MovedListCards []dto.ListCardResponse `json:"MovedListCards"`
}

type MoveCardToBoardRequest struct {
	SourceListID  uuid.UUID  `json:"SourceListID" binding:"required"`
	TargetBoardID uuid.UUID  `json:"TargetBoardID" binding:"required"`
	TargetListID  uuid.UUID  `json:"TargetListID" binding:"required"`
	BeforeID      *uuid.UUID `json:"BeforeID" binding:"omitempty"`
	InsertAt      *string    `json:"InsertAt" binding:"omitempty"`
}

type MoveCardToBoardResponse struct {
	BoardLists []dto.BoardListResponse `json:"BoardLists"`
}

type MoveCardToBoardEventData struct {
	RootListCardID  uuid.UUID
	MovedListCardID uuid.UUID
	CardID          uuid.UUID
	CardPatch       dto.CardResponse
	SourceBoardID   uuid.UUID
	TargetBoardID   uuid.UUID
	SourceListID    uuid.UUID
	TargetListID    uuid.UUID
	ListCardPatch   dto.ListCardResponse
	FromListCards   []dto.ListCardResponse
	ToListCards     []dto.ListCardResponse
}

type MoveCardBoardScopedPayload struct {
	ListCardPatch       dto.ListCardResponse   `json:"ListCardPatch"`
	FromListCards       []dto.ListCardResponse `json:"FromListCards"`
	ToListCards         []dto.ListCardResponse `json:"ToListCards"`
	FromListID          string                 `json:"FromListID"`
	ToListID            string                 `json:"ToListID"`
	SourceBoardID       string                 `json:"SourceBoardID"`
	TargetBoardID       string                 `json:"TargetBoardID"`
	ListCardIdsByListID map[string][]string    `json:"ListCardIdsByListID"`
}

type MirrorCardToListRequest struct {
	TargetListID  uuid.UUID  `json:"TargetListID" binding:"required"`
	TargetBoardID uuid.UUID  `json:"TargetBoardID" binding:"required"`
	BeforeID      *uuid.UUID `json:"BeforeID" binding:"omitempty"`
	InsertAt      *string    `json:"InsertAt" binding:"omitempty"`
}

type CopyCardToListRequest struct {
	MirrorCardToListRequest
	Title *string `json:"Title,omitempty"`
	CopyCardRequest
}

type CopyCardRequest struct {
	KeepComments   bool `json:"KeepComments"`
	KeepMembers    bool `json:"KeepMembers"`
	KeepLabels     bool `json:"KeepLabels"`
	KeepChecklists bool `json:"KeepChecklists"`
}
