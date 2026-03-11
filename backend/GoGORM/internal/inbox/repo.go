package inbox

import (
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GormInboxRepo struct {
	db *gorm.DB
}

func NewGormInboxRepo(db *gorm.DB) *GormInboxRepo {
	return &GormInboxRepo{
		db: db,
	}
}

func (r *GormInboxRepo) GetUserInboxCards(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.UserInboxCard, error) {
	inboxCards := []models.UserInboxCard{}
	query := r.db.WithContext(ctx).Table("user_inbox_cards")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}

	if err := query.
		Where("user_id = ?", userID).
		Order("pos COLLATE \"C\"").
		Find(&inboxCards).Error; err != nil {
		return nil, err
	}

	return inboxCards, nil
}

func (r *GormInboxRepo) CreateInboxCardTX(ctx context.Context, db *gorm.DB, inboxCard *models.UserInboxCard) error {
	if err := db.WithContext(ctx).
		Table("user_inbox_cards").
		Create(inboxCard).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormInboxRepo) GetMirrorsIds(ctx context.Context, userID, rootListCardID uuid.UUID) ([]uuid.UUID, error) {

	var mirrorIDs []uuid.UUID
	if err := r.db.WithContext(ctx).
		Table("list_cards").
		Select("list_cards.id").
		Where("list_cards.root_id = ?", rootListCardID).
		Find(&mirrorIDs).Error; err != nil {
		return nil, err
	}

	return mirrorIDs, nil
}

func (r *GormInboxRepo) DeleteInboxCardTX(ctx context.Context, db *gorm.DB, userID, cardID uuid.UUID) error {
	if err := db.WithContext(ctx).
		Table("user_inbox_cards").
		Where("user_id = ? AND card_id = ?", userID, cardID).
		Delete(&models.UserInboxCard{}).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormInboxRepo) GetInboxCardByCardID(ctx context.Context, userID, cardID uuid.UUID, includeDeleted bool) (*models.UserInboxCard, error) {
	return r.GetInboxCardByCardIDTX(ctx, r.db, userID, cardID, includeDeleted)
}

func (r *GormInboxRepo) GetInboxCardByCardIDTX(ctx context.Context, db *gorm.DB, userID, cardID uuid.UUID, includeDeleted bool) (*models.UserInboxCard, error) {
	var inboxCard models.UserInboxCard
	query := db.WithContext(ctx).Table("user_inbox_cards").
		Where("user_id = ? AND card_id = ?", userID, cardID)
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.First(&inboxCard).Error; err != nil {
		return nil, err
	}
	return &inboxCard, nil
}

func (r *GormInboxRepo) PatchInboxCardTX(ctx context.Context, db *gorm.DB, userID, cardID uuid.UUID, updateMap map[string]interface{}) (*models.UserInboxCard, error) {
	var inboxCard models.UserInboxCard
	result := db.WithContext(ctx).
		Model(&inboxCard).
		Clauses(clause.Returning{}).
		Where("user_id = ? AND card_id = ?", userID, cardID).
		Updates(updateMap)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	if inboxCard.ID == uuid.Nil {
		return nil, gorm.ErrInvalidData
	}

	if inboxCard.UserID == uuid.Nil || inboxCard.CardID == uuid.Nil {
		return nil, gorm.ErrInvalidData
	}
	return &inboxCard, nil
}
