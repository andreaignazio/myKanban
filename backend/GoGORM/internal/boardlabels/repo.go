package BoardLabels

import (
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GormBoardLabelsRepo struct {
	db *gorm.DB
}

func (r *GormBoardLabelsRepo) getBoardLabels(ctx context.Context, db *gorm.DB, boardID uuid.UUID, includeDeleted bool) ([]models.BoardLabel, error) {
	var labels []models.BoardLabel
	query := db.WithContext(ctx).Where("board_id = ?", boardID)
	if !includeDeleted {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.Find(&labels).Error; err != nil {
		return nil, err
	}
	return labels, nil
}

func (r *GormBoardLabelsRepo) createCardLabelLink(ctx context.Context, db *gorm.DB, link *models.CardLabelLink) error {
	if err := db.WithContext(ctx).Create(link).Error; err != nil {
		return err
	}
	return nil
}

func NewGormBoardLabelsRepo(db *gorm.DB) *GormBoardLabelsRepo {
	return &GormBoardLabelsRepo{db: db}
}

func (r *GormBoardLabelsRepo) GetBoardLabels(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.BoardLabel, error) {
	return r.getBoardLabels(ctx, r.db, boardID, includeDeleted)
}

func (r *GormBoardLabelsRepo) GetLabelsByBoardIDTX(ctx context.Context, tx *gorm.DB, boardID uuid.UUID, includeDeleted bool) ([]models.BoardLabel, error) {
	return r.getBoardLabels(ctx, tx, boardID, includeDeleted)
}

func (r *GormBoardLabelsRepo) GetBoardLabelByID(ctx context.Context, labelID uuid.UUID) (*models.BoardLabel, error) {
	var label models.BoardLabel
	if err := r.db.WithContext(ctx).
		Table("board_labels").
		Where("id = ?", labelID).First(&label).Error; err != nil {
		return nil, err
	}
	return &label, nil
}

func (r *GormBoardLabelsRepo) CreateBoardLabel(ctx context.Context, label *models.BoardLabel) error {
	if err := r.db.WithContext(ctx).Create(label).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormBoardLabelsRepo) DeleteBoardLabel(ctx context.Context, labelID uuid.UUID) (*models.BoardLabel, error) {
	var deleted models.BoardLabel
	result := r.db.WithContext(ctx).
		Clauses(clause.Returning{}).
		Where("id = ?", labelID).
		Delete(&deleted)

	if result.Error != nil {
		return nil, result.Error
	}

	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	return &deleted, nil
}

func (r *GormBoardLabelsRepo) PatchBoardLabel(ctx context.Context, labelID uuid.UUID, updates map[string]any) (*models.BoardLabel, error) {
	var updated models.BoardLabel
	result := r.db.WithContext(ctx).
		Model(&updated).
		Clauses(clause.Returning{}).
		Where("id = ? AND deleted_at IS NULL", labelID).
		Updates(updates)

	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return &updated, nil
}

func (r *GormBoardLabelsRepo) AddLabelToCard(ctx context.Context, link *models.CardLabelLink) error {
	return r.createCardLabelLink(ctx, r.db, link)
}

func (r *GormBoardLabelsRepo) CreateLabelLinkTX(ctx context.Context, tx *gorm.DB, link *models.CardLabelLink) error {
	return r.createCardLabelLink(ctx, tx, link)
}

func (r *GormBoardLabelsRepo) GetLabelsByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.CardLabelLink, error) {
	var links []models.CardLabelLink
	query := tx.WithContext(ctx).Where("card_id = ?", cardID)
	if !includeDeleted {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.Find(&links).Error; err != nil {
		return nil, err
	}
	return links, nil
}

func (r *GormBoardLabelsRepo) BulkCreateLabelsTX(ctx context.Context, tx *gorm.DB, labels []models.BoardLabel) error {
	if len(labels) == 0 {
		return nil
	}
	if err := tx.WithContext(ctx).Create(&labels).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormBoardLabelsRepo) BulkCreateLabelLinksTX(ctx context.Context, tx *gorm.DB, links []models.CardLabelLink) error {
	if len(links) == 0 {
		return nil
	}
	if err := tx.WithContext(ctx).Create(&links).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormBoardLabelsRepo) GetCardLabelLinksByBoardID(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.CardLabelLink, error) {
	var links []models.CardLabelLink
	query := r.db.WithContext(ctx).Where("board_id = ?", boardID)
	if !includeDeleted {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.Find(&links).Error; err != nil {
		return nil, err
	}
	return links, nil
}

func (r *GormBoardLabelsRepo) GetBoardLabelsByBoardIDs(ctx context.Context, boardIDs []uuid.UUID, includeDeleted bool) ([]models.BoardLabel, error) {
	if len(boardIDs) == 0 {
		return []models.BoardLabel{}, nil
	}

	labels := []models.BoardLabel{}
	query := r.db.WithContext(ctx).Table("board_labels").Where("board_id IN ?", boardIDs)
	if !includeDeleted {
		query = query.Where("deleted_at IS NULL")
	}

	if err := query.Find(&labels).Error; err != nil {
		return nil, err
	}

	return labels, nil
}

func (r *GormBoardLabelsRepo) GetCardLabelLinksByCardIDs(ctx context.Context, cardIDs []uuid.UUID, includeDeleted bool) ([]models.CardLabelLink, error) {
	if len(cardIDs) == 0 {
		return []models.CardLabelLink{}, nil
	}

	links := []models.CardLabelLink{}
	query := r.db.WithContext(ctx).Table("card_label_links").Where("card_id IN ?", cardIDs)
	if !includeDeleted {
		query = query.Where("deleted_at IS NULL")
	}

	if err := query.Find(&links).Error; err != nil {
		return nil, err
	}

	return links, nil
}

func (r *GormBoardLabelsRepo) RemoveLabelFromCard(ctx context.Context, boardID, cardID, labelID uuid.UUID) (*models.CardLabelLink, error) {
	var deleted models.CardLabelLink
	result := r.db.WithContext(ctx).
		Clauses(clause.Returning{}).
		Where("board_id = ? AND card_id = ? AND board_label_id = ?", boardID, cardID, labelID).
		Delete(&deleted)

	if result.Error != nil {
		return nil, result.Error
	}

	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	return &deleted, nil
}
