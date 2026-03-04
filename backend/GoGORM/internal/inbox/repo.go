package inbox

import (
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
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
