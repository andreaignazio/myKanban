package cardmembers

import (
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GormCardMembersRepo struct {
	db *gorm.DB
}

func (r *GormCardMembersRepo) getCardMembersForCard(ctx context.Context, db *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.CardMember, error) {
	var cardMembers []models.CardMember
	query := db.WithContext(ctx).Table("card_members")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}

	if err := query.
		Where("card_id = ?", cardID).
		Find(&cardMembers).Error; err != nil {
		return nil, err
	}

	return cardMembers, nil
}

func (r *GormCardMembersRepo) addCardMember(ctx context.Context, db *gorm.DB, cardMember *models.CardMember) error {
	if err := db.WithContext(ctx).Create(cardMember).Error; err != nil {
		return err
	}
	return nil
}

func NewGormCardMembersRepo(db *gorm.DB) *GormCardMembersRepo {
	return &GormCardMembersRepo{db: db}
}

func (r *GormCardMembersRepo) GetCardMembersForBoard(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.CardMember, error) {
	var cardMembers []models.CardMember

	query := r.db.WithContext(ctx).Table("card_members cm")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("cm.deleted_at IS NULL").Where("lc.deleted_at IS NULL").Where("bl.deleted_at IS NULL")
	}

	if err := query.
		Select("DISTINCT cm.*").
		Joins("JOIN list_cards lc ON lc.card_id = cm.card_id").
		Joins("JOIN board_lists bl ON bl.list_id = lc.list_id").
		Where("bl.board_id = ?", boardID).
		Find(&cardMembers).Error; err != nil {
		return nil, err
	}

	return cardMembers, nil
}

func (r *GormCardMembersRepo) GetCardMembersForCard(ctx context.Context, cardID uuid.UUID, includeDeleted bool) ([]models.CardMember, error) {
	return r.getCardMembersForCard(ctx, r.db, cardID, includeDeleted)
}

func (r *GormCardMembersRepo) AddCardMember(ctx context.Context, cardMember models.CardMember) error {
	return r.addCardMember(ctx, r.db, &cardMember)
}

func (r *GormCardMembersRepo) GetMembersByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.CardMember, error) {
	return r.getCardMembersForCard(ctx, tx, cardID, includeDeleted)
}

func (r *GormCardMembersRepo) CreateMemberLinkTX(ctx context.Context, tx *gorm.DB, member *models.CardMember) error {
	return r.addCardMember(ctx, tx, member)
}

func (r *GormCardMembersRepo) BulkCreateCardMembersLinkTX(ctx context.Context, tx *gorm.DB, members []models.CardMember) error {
	if len(members) == 0 {
		return nil
	}
	if err := tx.WithContext(ctx).Create(&members).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormCardMembersRepo) RemoveCardMember(ctx context.Context, cardID, userID uuid.UUID) (*models.CardMember, error) {
	var deleted models.CardMember
	result := r.db.WithContext(ctx).
		Clauses(clause.Returning{}).
		Where("card_id = ? AND user_id = ?", cardID, userID).
		Delete(&deleted)

	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	return &deleted, nil
}
