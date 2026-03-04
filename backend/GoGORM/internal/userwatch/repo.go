package userWatch

import (
	"GoGORM/internal/dbx"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GormRepo struct {
	db *gorm.DB
}

func NewGormRepo(db *gorm.DB) *GormRepo {
	return &GormRepo{db: db}
}

func (r *GormRepo) GetUserBoardWatches(ctx context.Context, userID uuid.UUID) ([]models.BoardWatch, error) {
	var watches []models.BoardWatch
	if err := r.db.WithContext(ctx).
		Table("board_watches bw").
		Where("bw.user_id = ?", userID).
		Where("bw.deleted_at IS NULL").
		Order("bw.pos COLLATE \"C\"").
		Find(&watches).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting board watches")
	}
	return watches, nil
}

func (r *GormRepo) GetUserCardWatches(ctx context.Context, userID uuid.UUID) ([]models.CardWatch, error) {
	var watches []models.CardWatch
	if err := r.db.WithContext(ctx).
		Table("card_watches cw").
		Where("cw.user_id = ?", userID).
		Where("cw.deleted_at IS NULL").
		Order("cw.pos COLLATE \"C\"").
		Find(&watches).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting card watches")
	}
	return watches, nil
}

func (r *GormRepo) GetUserListWatches(ctx context.Context, userID uuid.UUID) ([]models.ListWatch, error) {
	var watches []models.ListWatch
	if err := r.db.WithContext(ctx).
		Table("list_watches lw").
		Where("lw.user_id = ?", userID).
		Where("lw.deleted_at IS NULL").
		Order("lw.pos COLLATE \"C\"").
		Find(&watches).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting list watches")
	}
	return watches, nil
}

func (r *GormRepo) CreateBoardWatch(ctx context.Context, boardWatch *models.BoardWatch) error {
	if err := r.db.WithContext(ctx).Create(boardWatch).Error; err != nil {
		return dbx.WrapDBErr(err, "error creating board watch")
	}
	return nil
}

func (r *GormRepo) CreateCardWatch(ctx context.Context, cardWatch *models.CardWatch) error {
	if err := r.db.WithContext(ctx).Create(cardWatch).Error; err != nil {
		return dbx.WrapDBErr(err, "error creating card watch")
	}
	return nil
}

func (r *GormRepo) CreateListWatch(ctx context.Context, listWatch *models.ListWatch) error {
	if err := r.db.WithContext(ctx).Create(listWatch).Error; err != nil {
		return dbx.WrapDBErr(err, "error creating list watch")
	}
	return nil
}

func (r *GormRepo) DeleteBoardWatch(ctx context.Context, id uuid.UUID) error {
	if err := r.db.WithContext(ctx).
		Table("board_watches").
		Where("id = ?", id).
		Delete(&models.BoardWatch{}).Error; err != nil {
		return dbx.WrapDBErr(err, "error deleting board watch")
	}
	return nil
}

func (r *GormRepo) DeleteCardWatch(ctx context.Context, id uuid.UUID) error {
	if err := r.db.WithContext(ctx).
		Table("card_watches").
		Where("id = ?", id).
		Delete(&models.CardWatch{}).Error; err != nil {
		return dbx.WrapDBErr(err, "error deleting card watch")
	}
	return nil
}

func (r *GormRepo) DeleteListWatch(ctx context.Context, id uuid.UUID) error {
	if err := r.db.WithContext(ctx).
		Table("list_watches").
		Where("id = ?", id).
		Delete(&models.ListWatch{}).Error; err != nil {
		return dbx.WrapDBErr(err, "error deleting list watch")
	}
	return nil
}

func (r *GormRepo) PatchBoardWatch(ctx context.Context, id uuid.UUID, payload map[string]any) (*models.BoardWatch, error) {
	var boardWatch models.BoardWatch
	if err := r.db.WithContext(ctx).
		Model(&boardWatch).
		Where("id = ?", id).
		Clauses(clause.Returning{}).
		Updates(payload).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error patching board watch")
	}
	return &boardWatch, nil
}

func (r *GormRepo) PatchCardWatch(ctx context.Context, id uuid.UUID, payload map[string]any) (*models.CardWatch, error) {
	var cardWatch models.CardWatch
	if err := r.db.WithContext(ctx).
		Model(&cardWatch).
		Where("id = ?", id).
		Clauses(clause.Returning{}).
		Updates(payload).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error patching card watch")
	}
	return &cardWatch, nil
}

func (r *GormRepo) PatchListWatch(ctx context.Context, id uuid.UUID, payload map[string]any) (*models.ListWatch, error) {
	var listWatch models.ListWatch
	if err := r.db.WithContext(ctx).
		Model(&listWatch).
		Where("id = ?", id).
		Clauses(clause.Returning{}).
		Updates(payload).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error patching list watch")
	}
	return &listWatch, nil
}
