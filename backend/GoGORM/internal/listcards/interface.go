package listcards

import (
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ListCardsRepo interface {
	CreateCardListTX(ctx context.Context, db *gorm.DB, listCard *models.ListCard) error
	GetListCardByListAndCardTX(ctx context.Context, db *gorm.DB, listID, cardID uuid.UUID, includeDeleted bool) (*models.ListCard, error)
	GetAnyListCardByCardIDTX(ctx context.Context, db *gorm.DB, cardID uuid.UUID, includeDeleted bool) (*models.ListCard, error)
	GetCardsInList(ctx context.Context, listID uuid.UUID, includeDeleted bool) ([]models.ListCard, error)
	GetListCardsDetail(ctx context.Context, listID uuid.UUID, includeDeleted bool) ([]ListCardDetail, error)
	GetListCardsByCardIDsTX(ctx context.Context, db *gorm.DB, cardIDs []uuid.UUID, includeDeleted bool) ([]models.ListCard, error)
	BulkUpsertListCardsPosTX(ctx context.Context, db *gorm.DB, listCards []models.ListCard) error
	BulkDeleteListCardsTX(ctx context.Context,
		db *gorm.DB, listID uuid.UUID, cardIDs []uuid.UUID) ([]models.ListCard, error)
	GetListCardByListIDsTX(ctx context.Context, db *gorm.DB, listIDs []uuid.UUID) ([]models.ListCard, error)
	GetListCardsByIDsTX(ctx context.Context, db *gorm.DB, listCardIDs []uuid.UUID, includeDeleted bool) ([]models.ListCard, error)
	UpsertListCardByIdTX(ctx context.Context, db *gorm.DB, listCard *models.ListCard) error
	GetListCardsByRootIDTX(ctx context.Context, db *gorm.DB, rootID uuid.UUID, includeDeleted bool) ([]models.ListCard, error)
	GetListCardByIDTX(ctx context.Context, db *gorm.DB, listCardID uuid.UUID, includeDeleted bool) (*models.ListCard, error)
	GetListCardsIdsByRootIdsTX(ctx context.Context, db *gorm.DB, rootIDs []uuid.UUID, includeDeleted bool) ([]uuid.UUID, error)
	GetListCardsByIdsTX(ctx context.Context, db *gorm.DB, listCardIds []uuid.UUID, includeDeleted bool) ([]models.ListCard, error)
	BulkDeleteListCardsByIdsTX(ctx context.Context, tx *gorm.DB, idsToDelete []uuid.UUID) ([]models.ListCard, error)
}

type CapabilitiesRepo interface {
	CanEditCardInBoard(ctx context.Context, db *gorm.DB, userID, boardID, cardID uuid.UUID, roles []string, includeDeleted bool) (*bool, error)
	CanAccessListInBoard(ctx context.Context, db *gorm.DB,
		userID, boardID, listID uuid.UUID, roles []string, accessMode string, includeDeleted bool) (*bool, error)
}

type CardsRepo interface {
	CreateCard(ctx context.Context, db *gorm.DB, card *models.Card) error
	CreateCardTX(ctx context.Context, tx *gorm.DB, card *models.Card) error
	GetCardByIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) (*models.Card, error)
}

type CardCommentsRepo interface {
	GetCommentsByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.CardComment, error)
	CreateCommentTX(ctx context.Context, tx *gorm.DB, comment *models.CardComment) error
	BulkCreateCommentTX(ctx context.Context, tx *gorm.DB, comments []models.CardComment) error
}

type CardMembersRepo interface {
	GetMembersByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.CardMember, error)
	CreateMemberLinkTX(ctx context.Context, tx *gorm.DB, member *models.CardMember) error
	BulkCreateCardMembersLinkTX(ctx context.Context, tx *gorm.DB, members []models.CardMember) error
}

type BoardLabelsRepo interface {
	GetLabelsByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.CardLabelLink, error)
	GetLabelsByBoardIDTX(ctx context.Context, tx *gorm.DB, boardID uuid.UUID, includeDeleted bool) ([]models.BoardLabel, error)
	CreateLabelLinkTX(ctx context.Context, tx *gorm.DB, link *models.CardLabelLink) error
	BulkCreateLabelsTX(ctx context.Context, tx *gorm.DB, labels []models.BoardLabel) error
	BulkCreateLabelLinksTX(ctx context.Context, tx *gorm.DB, links []models.CardLabelLink) error
}

type ChecklistRepo interface {
	GetChecklistsByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.Checklist, error)
	GetEntriesByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.Entry, error)
	GetCardChecklistsByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.CardChecklist, error)
	GetChecklistEntriesByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.ChecklistEntry, error)
	BulkCreateChecklistsTX(ctx context.Context, tx *gorm.DB, checklists []models.Checklist) error
	BulkCreateEntriesTX(ctx context.Context, tx *gorm.DB, entries []models.Entry) error
	BulkCreateCardChecklistsTX(ctx context.Context, tx *gorm.DB, cardChecklists []models.CardChecklist) error
	BulkCreateChecklistEntriesTX(ctx context.Context, tx *gorm.DB, checklistEntries []models.ChecklistEntry) error
}

type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
	GetUserWorkspaceRole(ctx context.Context, userID, workspaceID uuid.UUID, includeDeleted bool) (string, error)
}

type ListRepo interface {
	GetListMeta(ctx context.Context, listID uuid.UUID, includeDeleted bool) (*models.List, error)
}

type BoardListRepo interface {
	GetBoardList(ctx context.Context, boardID, listID uuid.UUID, includeDeleted bool) (*models.BoardList, error)
	GetBoardListsByListIdTX(ctx context.Context, tx *gorm.DB, listID uuid.UUID, includeDeleted bool) ([]models.BoardList, error)
	GetBoardListsByListIdsTX(ctx context.Context, tx *gorm.DB, listIDs []uuid.UUID, includeDeleted bool) ([]models.BoardList, error)
}

type PositionHelper interface {
	CardPosAtListEnd(ctx context.Context, listID uuid.UUID) (string, error)
	CardPosAtListStart(ctx context.Context, listID uuid.UUID) (string, error)
	CardPosAfterID(ctx context.Context, listID, afterID uuid.UUID) (string, error)
	CardPosBeforeID(ctx context.Context, listID, afterID uuid.UUID) (string, error)
	BulkCardPosAfterID(ctx context.Context, cardIDs []uuid.UUID, sourceListId uuid.UUID,
		targetListID, afterID uuid.UUID, isCrossList bool) ([]string, error)
}

type BoardRepo interface {
	GetBoardByIDTX(ctx context.Context, tx *gorm.DB, boardID uuid.UUID, includeDeleted bool) (*models.Board, error)
}
