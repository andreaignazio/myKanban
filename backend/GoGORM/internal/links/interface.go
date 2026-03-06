package links

import (
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
	GetUsersByIDs(ctx context.Context, userIDs []uuid.UUID) ([]models.User, error)
}

type PositionHelper interface {
	ListPosAtBoardEnd(ctx context.Context, boardID uuid.UUID) (string, error)
	ListPosAtBoardStart(ctx context.Context, boardID uuid.UUID) (string, error)
	ListPosAfterID(ctx context.Context, boardID, afterID uuid.UUID) (string, error)
	ListPosBeforeID(ctx context.Context, boardID, beforeID uuid.UUID) (string, error)
}

type BoardsRepo interface {
	GetBoard(ctx context.Context, boardID uuid.UUID, includeDeleted bool) (*models.Board, error)
	GetBoardsByIDs(ctx context.Context, boardIDs []uuid.UUID, includeDeleted bool) ([]models.Board, error)
}

type CardsRepo interface {
	GetUserCards(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.Card, error)
	GetCardsByIDs(ctx context.Context, cardIDs []uuid.UUID, includeDeleted bool) ([]models.Card, error)
}

type LinksRepo interface {
	CreateBoardListTX(ctx context.Context, db *gorm.DB, boardList *models.BoardList) error
	DetatchListFromBoard(ctx context.Context, db *gorm.DB, boardID, listID uuid.UUID) (*models.BoardList, error)
	BulkDetatchBoardListsByRootIDTX(ctx context.Context, db *gorm.DB, rootID uuid.UUID) ([]models.BoardList, error)
	RestoreListToBoard(ctx context.Context, boardID, listID uuid.UUID, position string) (*models.BoardList, error)
	GetDeletedBoardListLinks(ctx context.Context, boardID uuid.UUID) ([]models.BoardList, error)
	GetDeletedListCardLinksByBoardID(ctx context.Context, boardID uuid.UUID) ([]models.ListCard, error)
	RestoreBoardListLinksByIDsTX(ctx context.Context, tx *gorm.DB, boardID uuid.UUID, boardListIDs []uuid.UUID) ([]models.BoardList, error)
	PurgeBoardListLinksByIDsTX(ctx context.Context, tx *gorm.DB, boardID uuid.UUID, boardListIDs []uuid.UUID) ([]models.BoardList, error)
	GetDeletedListCardLinksByIDsAndBoardIDTX(ctx context.Context, tx *gorm.DB, boardID uuid.UUID, listCardIDs []uuid.UUID) ([]models.ListCard, error)
	GetDeletedListCardLinksByRootIDsTX(ctx context.Context, tx *gorm.DB, rootIDs []uuid.UUID) ([]models.ListCard, error)
	RestoreListCardLinksTX(ctx context.Context, tx *gorm.DB, listCards []models.ListCard) ([]models.ListCard, error)
	PurgeListCardLinksByIDsTX(ctx context.Context, tx *gorm.DB, listCardIDs []uuid.UUID) ([]models.ListCard, error)
	GetBoardList(ctx context.Context, boardID, listID uuid.UUID, includeDeleted bool) (*models.BoardList, error)
	GetBoardListByID(ctx context.Context, boardID, boardListID uuid.UUID, includeDeleted bool) (*models.BoardList, error)
	GetBoardListLinksByRootID(ctx context.Context, rootID uuid.UUID, includeDeleted bool) ([]models.BoardList, error)
	GetBoardListByIdsTX(ctx context.Context, tx *gorm.DB, ids []uuid.UUID, includeDeleted bool) ([]models.BoardList, error)
	BulkDetatchBoardListsByIdsTX(ctx context.Context, tx *gorm.DB, ids []uuid.UUID) ([]models.BoardList, error)
	//CreateListInBoardAt(ctx context.Context, list *models.List, boardID uuid.UUID, pos string) (*ListInBoard, error)
	GetListsInBoard(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.BoardList, error)
	PatchBoardListPositionTX(ctx context.Context, tx *gorm.DB, boardList *models.BoardList) error
	PatchBoardListAccessMode(ctx context.Context, boardList *models.BoardList) error
	BulkPatchBoardListPosition(ctx context.Context,
		boardID uuid.UUID, listIDs []uuid.UUID, positions []string) ([]models.BoardList, error)
	GetUserBoardLinks(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (*models.UserBoard, error)
	GetBoardListLinks(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.BoardList, error)
	GetBoardListLinksTX(ctx context.Context, tx *gorm.DB, boardID uuid.UUID, includeDeleted bool) ([]models.BoardList, error)
	GetListCardLinks(ctx context.Context, listIDs []uuid.UUID, includeDeleted bool) ([]models.ListCard, error)
	GetListCardLinksTX(ctx context.Context, tx *gorm.DB, listIDs []uuid.UUID, includeDeleted bool) ([]models.ListCard, error)
	GetListCardLinksByCardIDs(ctx context.Context, cardIDs []uuid.UUID, includeDeleted bool) ([]models.ListCard, error)
	GetExternalRootRefsByIDs(ctx context.Context, rootIDs []uuid.UUID, includeDeleted bool) ([]models.ExternalRootRefRow, error)
	GetUserBoardRelationsByBoardID(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.UserBoard, error)
	GetCardMembersForBoard(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.CardMember, error)
	GetCardChecklistsForBoard(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.CardChecklist, error)
	GetChecklistsByIDs(ctx context.Context, checklistIDs []uuid.UUID, includeDeleted bool) ([]models.Checklist, error)
	GetChecklistEntriesByChecklistIDs(ctx context.Context, checklistIDs []uuid.UUID, includeDeleted bool) ([]models.ChecklistEntry, error)
	GetEntriesByIDs(ctx context.Context, entryIDs []uuid.UUID, includeDeleted bool) ([]models.Entry, error)
	GetEntryMembersByEntryIDs(ctx context.Context, entryIDs []uuid.UUID, includeDeleted bool) ([]models.EntryMember, error)
}

type ListRepo interface {
	CreateListTX(ctx context.Context, db *gorm.DB, list *models.List) error
	GetListMeta(ctx context.Context, listID uuid.UUID, includeDeleted bool) (*models.List, error)
	GetUserLists(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.List, error)
	GetListsByListIds(ctx context.Context, listIds []uuid.UUID, includeDeleted bool) ([]models.List, error)
}

type ListShareOfferRepo interface {
	GetListShareOfferByListIDandTargetBoardID(ctx context.Context, listID, targetBoardID uuid.UUID, includeDeleted bool) (*models.BoardListShareOffer, error)
}

type BoardLabelsRepo interface {
	GetBoardLabels(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.BoardLabel, error)

	GetCardLabelLinksByBoardID(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.CardLabelLink, error)
}

type ListCardsRepo interface {
	GetListCardsByIdsTX(ctx context.Context, db *gorm.DB, listCardIDs []uuid.UUID, includeDeleted bool) ([]models.ListCard, error)
}
