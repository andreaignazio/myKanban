package cardcomments

import (
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GormCardCommentsRepository struct {
	db *gorm.DB
}

func (r *GormCardCommentsRepository) createCardComment(ctx context.Context, db *gorm.DB, comment *models.CardComment) error {
	if err := db.WithContext(ctx).Create(comment).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormCardCommentsRepository) getCardCommentsByCardID(ctx context.Context, db *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.CardComment, error) {
	var comments []models.CardComment
	query := db.WithContext(ctx).Where("card_id = ?", cardID).
		Preload("CommentMentions").
		Order("created_at DESC")
	if !includeDeleted {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.Find(&comments).Error; err != nil {
		return nil, err
	}
	return comments, nil
}

func NewGormCardCommentsRepository(db *gorm.DB) *GormCardCommentsRepository {
	return &GormCardCommentsRepository{
		db: db,
	}
}

func (r *GormCardCommentsRepository) CreateCardCommentTX(ctx context.Context, tx *gorm.DB, comment *models.CardComment) error {
	return r.createCardComment(ctx, tx, comment)
}

func (r *GormCardCommentsRepository) CreateCommentTX(ctx context.Context, tx *gorm.DB, comment *models.CardComment) error {
	return r.createCardComment(ctx, tx, comment)
}

func (r *GormCardCommentsRepository) BulkCreateCommentTX(ctx context.Context, tx *gorm.DB, comments []models.CardComment) error {
	if len(comments) == 0 {
		return nil
	}
	if err := tx.WithContext(ctx).Create(&comments).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormCardCommentsRepository) CreateCommentMentionsTX(ctx context.Context, tx *gorm.DB, mentions []models.CommentMention) error {
	if len(mentions) == 0 {
		return nil
	}
	if err := tx.WithContext(ctx).Create(&mentions).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormCardCommentsRepository) GetCardCommentByID(ctx context.Context, commentID uuid.UUID, includeDeleted bool) (*models.CardComment, error) {
	var comment models.CardComment
	query := r.db.WithContext(ctx).Where("id = ?", commentID).
		Preload("CommentMentions")
	if !includeDeleted {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.First(&comment).Error; err != nil {
		return nil, err
	}
	return &comment, nil
}

func (r *GormCardCommentsRepository) DeleteCardCommentByID(ctx context.Context, commentID uuid.UUID) (*models.CardComment, error) {
	var comment models.CardComment
	result := r.db.WithContext(ctx).
		Model(&models.CardComment{}).
		Clauses(clause.Returning{}).
		Where("id = ?", commentID).
		Delete(&comment)

	if result.Error != nil {
		return nil, result.Error
	}

	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	return &comment, nil
}

func (r *GormCardCommentsRepository) UpdateCardCommentTX(ctx context.Context, tx *gorm.DB, commentID uuid.UUID, updateMap map[string]any) (*models.CardComment, error) {
	var comment models.CardComment
	if err := tx.WithContext(ctx).
		Model(&comment).
		Clauses(clause.Returning{}).
		Where("id = ?", commentID).
		Updates(updateMap).Error; err != nil {
		return nil, err
	}
	return &comment, nil
}

func (r *GormCardCommentsRepository) DeleteCommentMentionsByCommentIDAndMentionedUserIDsTX(ctx context.Context, tx *gorm.DB, commentID uuid.UUID, mentionedUserIDs []uuid.UUID) error {
	if len(mentionedUserIDs) == 0 {
		return nil
	}
	result := tx.WithContext(ctx).
		Model(&models.CommentMention{}).
		Where("card_comment_id = ? AND mentioned_user_id IN ?", commentID, mentionedUserIDs).
		Delete(&models.CommentMention{})

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil

}

func (r *GormCardCommentsRepository) GetCardCommentsByCardID(ctx context.Context, cardID uuid.UUID, includeDeleted bool) ([]models.CardComment, error) {
	return r.getCardCommentsByCardID(ctx, r.db, cardID, includeDeleted)
}

func (r *GormCardCommentsRepository) GetCommentsByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.CardComment, error) {
	return r.getCardCommentsByCardID(ctx, tx, cardID, includeDeleted)
}
