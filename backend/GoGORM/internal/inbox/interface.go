package inbox

import (
	"GoGORM/internal/listcards"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type InboxRepo interface {
	CreateInboxCardTX(ctx context.Context, db *gorm.DB, inboxCard *models.UserInboxCard) error
	GetUserInboxCards(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.UserInboxCard, error)
	GetMirrorsIds(ctx context.Context, userID, rootListCardID uuid.UUID) ([]uuid.UUID, error)
	DeleteInboxCardTX(ctx context.Context, db *gorm.DB, userID, cardID uuid.UUID) error
	GetInboxCardByCardID(ctx context.Context, userID, cardID uuid.UUID, includeDeleted bool) (*models.UserInboxCard, error)
	PatchInboxCardTX(ctx context.Context, db *gorm.DB, userID, cardID uuid.UUID, updateMap map[string]interface{}) (*models.UserInboxCard, error)
}

type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
}

type PositionHelper interface {
	InboxPosAtStart(ctx context.Context, userID uuid.UUID) (string, error)
	InboxPosAtEnd(ctx context.Context, userID uuid.UUID) (string, error)
	InboxPosBeforeID(ctx context.Context, userID, beforeID uuid.UUID) (string, error)
}

type CardPositionHelper interface {
	CardPosAtListEnd(ctx context.Context, listID uuid.UUID) (string, error)
	CardPosAtListStart(ctx context.Context, listID uuid.UUID) (string, error)
	CardPosAfterID(ctx context.Context, listID, afterID uuid.UUID) (string, error)
	CardPosBeforeID(ctx context.Context, listID, afterID uuid.UUID) (string, error)
}

type ListCardsRepo interface {
	CreateCardListTX(ctx context.Context, db *gorm.DB, listCard *models.ListCard) error
	GetAnyListCardByCardIDTX(ctx context.Context, db *gorm.DB, cardID uuid.UUID, includeDeleted bool) (*models.ListCard, error)
	FindAnyListCardByCardIDTX(ctx context.Context, db *gorm.DB, cardID uuid.UUID, includeDeleted bool) (*models.ListCard, bool, error)
	UpsertListCardByIdTX(ctx context.Context, db *gorm.DB, listCard *models.ListCard) error
	GetListCardByListAndCardTX(ctx context.Context, db *gorm.DB, listID, cardID uuid.UUID, includeDeleted bool) (*models.ListCard, error)
	GetListCardByIDTX(ctx context.Context, db *gorm.DB, listCardID uuid.UUID, includeDeleted bool) (*models.ListCard, error)
}

type ListCardsService interface {
	CopyCardChecklistsTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, newCard *models.Card,
		domain *listcards.CheckListDomain) error
}

type BoardListRepo interface {
	GetBoardListsByListIdTX(ctx context.Context, tx *gorm.DB, listID uuid.UUID, includeDeleted bool) ([]models.BoardList, error)
}

type LinksRepo interface {
	GetExternalRootRefsByIDs(ctx context.Context, rootIDs []uuid.UUID, includeDeleted bool) ([]models.ExternalRootRefRow, error)
}

type BoardsRepo interface {
	GetBoard(ctx context.Context, boardID uuid.UUID, includeDeleted bool) (*models.Board, error)
}

type CardsRepo interface {
	CreateCard(ctx context.Context, db *gorm.DB, card *models.Card) error
	CreateCardTX(ctx context.Context, tx *gorm.DB, card *models.Card) error
	GetCardByIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) (*models.Card, error)
	GetCardsByIDs(ctx context.Context, cardIDs []uuid.UUID, includeDeleted bool) ([]models.Card, error)
	PatchCardDetailsTX(ctx context.Context, tx *gorm.DB,
		cardID uuid.UUID, updateMap map[string]any) (*models.Card, error)
}

/*type CardsRepo interface {
	PatchCardDetails(ctx context.Context, cardID uuid.UUID, updateMap map[string]any) (*models.Card, error)
	GetUserCards(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.Card, error)
	GetCardsWhereUserIsMember(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.Card, error)
	GetCardsByIDs(ctx context.Context, cardIDs []uuid.UUID, includeDeleted bool) ([]models.Card, error)
	GetCardByID(ctx context.Context, card *models.Card, includeDeleted bool) error
}*/
