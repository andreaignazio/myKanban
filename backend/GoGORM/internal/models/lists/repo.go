package lists

import (
	"GoGORM/internal/dbx"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GormListsRepo struct {
	db *gorm.DB
}

func NewGormListsRepo(db *gorm.DB) *GormListsRepo {
	return &GormListsRepo{db: db}
}

func (r *GormListsRepo) GetListDetail(ctx context.Context, listID uuid.UUID, includeDeleted bool) (*ListDetailDomain, error) {
	var cards []models.Card
	query := r.db.WithContext(ctx).Table("cards")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("cards.deleted_at IS NULL").Where("lc.deleted_at IS NULL")
	}
	if err := query.
		Joins("JOIN list_cards lc ON lc.card_id = cards.id").
		Where("lc.list_id = ?", listID).
		Find(&cards).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "failed to get cards")
	}
	list, err := r.GetListMeta(ctx, listID, includeDeleted)
	if err != nil {
		return nil, err
	}
	listDetail := ListDetailDomain{
		ID:        list.ID,
		Title:     list.Title,
		Cards:     cards,
		DeletedAt: list.DeletedAt,
	}
	return &listDetail, nil
}

func (r *GormListsRepo) GetListMeta(ctx context.Context, listID uuid.UUID, includeDeleted bool) (*models.List, error) {
	var list models.List
	query := r.db.WithContext(ctx).Table("lists")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("lists.deleted_at IS NULL")
	}
	if err := query.
		Where("id = ?", listID).
		First(&list).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "failed to get list")
	}
	return &list, nil
}

func (r *GormListsRepo) CreateListTX(ctx context.Context, db *gorm.DB, list *models.List) error {
	if err := db.WithContext(ctx).
		Table("lists").
		Create(list).
		Clauses(clause.Returning{}).
		Scan(list).
		Error; err != nil {
		return dbx.WrapDBErr(err, "error creating list")
	}
	return nil
}

func (r *GormListsRepo) GetUserLists(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.List, error) {
	var lists []models.List
	query := r.db.WithContext(ctx).Table("lists")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("lists.deleted_at IS NULL").Where("bl.deleted_at IS NULL").Where("ub.deleted_at IS NULL")
	}
	if err := query.
		Select("DISTINCT lists.*").
		Joins("JOIN board_lists bl ON bl.list_id = lists.id").
		Joins("JOIN user_boards ub ON ub.board_id = bl.board_id").
		Where("ub.user_id = ?", userID).
		Find(&lists).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "failed to get user lists")
	}
	return lists, nil
}

func (r *GormListsRepo) GetListsByIDs(ctx context.Context, listIDs []uuid.UUID, includeDeleted bool) ([]models.List, error) {
	if len(listIDs) == 0 {
		return []models.List{}, nil
	}
	var lists []models.List
	query := r.db.WithContext(ctx).Table("lists")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("lists.deleted_at IS NULL")
	}
	if err := query.
		Where("id IN ?", listIDs).
		Find(&lists).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "failed to get lists by IDs")
	}
	return lists, nil
}

func (r *GormListsRepo) PatchListDetails(ctx context.Context, listID uuid.UUID, updateMap map[string]any) (*models.List, error) {
	var list models.List
	if err := r.db.WithContext(ctx).
		Model(&list).
		Where("id = ?", listID).
		Clauses(clause.Returning{}).
		Updates(updateMap).Error; err != nil {
		return nil, err
	}
	return &list, nil
}

func (r *GormListsRepo) GetListsByListIds(ctx context.Context, listIds []uuid.UUID, includeDeleted bool) ([]models.List, error) {
	var lists []models.List
	query := r.db.WithContext(ctx).Table("lists")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("lists.deleted_at IS NULL")
	}
	if err := query.
		Where("id IN ?", listIds).
		Find(&lists).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "failed to get lists by IDs")
	}
	return lists, nil
}
