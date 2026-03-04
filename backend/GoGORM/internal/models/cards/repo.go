package cards

import (
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GormCardsRepo struct {
	db *gorm.DB
}

func (r *GormCardsRepo) createCard(ctx context.Context, db *gorm.DB, card *models.Card) error {
	if err := db.WithContext(ctx).
		Table("cards").
		Create(card).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormCardsRepo) getCardByID(ctx context.Context, db *gorm.DB, cardID uuid.UUID, includeDeleted bool) (*models.Card, error) {
	card := &models.Card{ID: cardID}
	query := db.WithContext(ctx).Table("cards")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("cards.deleted_at IS NULL")
	}
	if err := query.
		Where("id = ?", card.ID).
		First(card).Error; err != nil {
		return nil, err
	}
	return card, nil
}

func NewGormCardsRepo(db *gorm.DB) *GormCardsRepo {
	return &GormCardsRepo{db: db}
}

func (r *GormCardsRepo) CreateCard(ctx context.Context, db *gorm.DB, card *models.Card) error {
	return r.createCard(ctx, db, card)
}

func (r *GormCardsRepo) CreateCardTX(ctx context.Context, tx *gorm.DB, card *models.Card) error {
	return r.createCard(ctx, tx, card)
}

func (r *GormCardsRepo) PatchCardDetails(ctx context.Context,
	cardID uuid.UUID, updateMap map[string]any) (*models.Card, error) {
	var card models.Card
	if err := r.db.WithContext(ctx).
		Model(&card).
		Where("id = ?", cardID).
		Clauses(clause.Returning{}).
		Updates(updateMap).Error; err != nil {
		return nil, err
	}
	return &card, nil
}

func (r *GormCardsRepo) GetUserCards(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.Card, error) {
	var cards []models.Card
	query := r.db.WithContext(ctx).Table("cards")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("cards.deleted_at IS NULL").Where("lc.deleted_at IS NULL").Where("bl.deleted_at IS NULL").Where("ub.deleted_at IS NULL")
	}
	if err := query.
		Select("DISTINCT cards.*").
		Joins("JOIN list_cards lc ON lc.card_id = cards.id").
		Joins("JOIN board_lists bl ON bl.list_id = lc.list_id").
		Joins("JOIN user_boards ub ON ub.board_id = bl.board_id").
		Where("ub.user_id = ?", userID).
		Find(&cards).Error; err != nil {
		return nil, err
	}
	return cards, nil
}

func (r *GormCardsRepo) GetCardsWhereUserIsMember(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.Card, error) {
	var cards []models.Card
	query := r.db.WithContext(ctx).Table("cards")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("cards.deleted_at IS NULL").Where("cm.deleted_at IS NULL")
	}
	if err := query.
		Select("DISTINCT cards.*").
		Joins("JOIN card_members cm ON cm.card_id = cards.id").
		Where("cm.user_id = ?", userID).
		Find(&cards).Error; err != nil {
		return nil, err
	}
	return cards, nil
}

func (r *GormCardsRepo) GetCardByID(ctx context.Context, card *models.Card, includeDeleted bool) error {
	fetchedCard, err := r.getCardByID(ctx, r.db, card.ID, includeDeleted)
	if err != nil {
		return err
	}
	*card = *fetchedCard
	return nil
}

func (r *GormCardsRepo) GetCardByIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) (*models.Card, error) {
	return r.getCardByID(ctx, tx, cardID, includeDeleted)
}

func (r *GormCardsRepo) GetCardsByIDs(ctx context.Context, cardIDs []uuid.UUID, includeDeleted bool) ([]models.Card, error) {
	var cards []models.Card
	query := r.db.WithContext(ctx).Table("cards")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("cards.deleted_at IS NULL")
	}
	if err := query.
		Where("id IN ?", cardIDs).
		Find(&cards).Error; err != nil {
		return nil, err
	}
	return cards, nil
}
