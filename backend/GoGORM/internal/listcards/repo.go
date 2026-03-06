package listcards

import (
	"GoGORM/internal/dbx"
	"GoGORM/internal/models/boards"
	"GoGORM/models"
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GormListCardsRepo struct {
	db *gorm.DB
}

func NewGormListCardsRepo(db *gorm.DB) *GormListCardsRepo {
	return &GormListCardsRepo{db: db}
}

func (r *GormListCardsRepo) CreateCardListTX(ctx context.Context, db *gorm.DB, listCard *models.ListCard) error {
	if err := db.WithContext(ctx).
		Table("list_cards").
		Clauses(clause.Returning{}, clause.OnConflict{
			Columns: []clause.Column{{Name: "list_id"}, {Name: "card_id"}},
			DoUpdates: clause.Assignments(map[string]any{
				"root_id":    gorm.Expr("excluded.root_id"),
				"pos":        gorm.Expr("excluded.pos"),
				"deleted_at": nil,
			}),
		}).
		Create(listCard).
		Scan(listCard).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormListCardsRepo) UpsertListCardByIdTX(ctx context.Context, db *gorm.DB, listCard *models.ListCard) error {
	if err := db.WithContext(ctx).
		Table("list_cards").
		Clauses(clause.Returning{}, clause.OnConflict{
			Columns: []clause.Column{{Name: "id"}},
			DoUpdates: clause.Assignments(map[string]any{
				"root_id":    gorm.Expr("excluded.root_id"),
				"pos":        gorm.Expr("excluded.pos"),
				"list_id":    gorm.Expr("excluded.list_id"),
				"deleted_at": nil,
			}),
		}).
		Create(listCard).
		Scan(listCard).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormListCardsRepo) GetListCardByListAndCardTX(ctx context.Context, db *gorm.DB, listID, cardID uuid.UUID, includeDeleted bool) (*models.ListCard, error) {
	var listCard models.ListCard
	query := db.WithContext(ctx).Table("list_cards")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("list_id = ? AND card_id = ?", listID, cardID).
		Take(&listCard).Error; err != nil {
		return nil, err
	}
	return &listCard, nil
}

func (r *GormListCardsRepo) GetCardsInList(ctx context.Context, listID uuid.UUID, includeDeleted bool) ([]models.ListCard, error) {
	var listCards []models.ListCard
	query := r.db.WithContext(ctx).Table("list_cards")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("list_id = ?", listID).
		Order("pos COLLATE \"C\"").
		Find(&listCards).Error; err != nil {
		return nil, err
	}
	return listCards, nil
}

type ListCardDetail struct {
	models.Card
	ListCardID    uuid.UUID      `gorm:"column:lc_id"`
	RootID        uuid.UUID      `gorm:"column:root_id"`
	Pos           string         `gorm:"column:pos"`
	ListID        uuid.UUID      `gorm:"column:list_id"`
	ListCreatedAt time.Time      `gorm:"column:created_at"`
	ListUpdatedAt time.Time      `gorm:"column:updated_at"`
	ListDeletedAt gorm.DeletedAt `gorm:"column:lc_deleted_at"`
}

func (r *GormListCardsRepo) GetListCardsDetail(ctx context.Context, listID uuid.UUID, includeDeleted bool) ([]ListCardDetail, error) {
	var cards []ListCardDetail
	query := r.db.WithContext(ctx).Table("list_cards lc")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("lc.deleted_at IS NULL").Where("c.deleted_at IS NULL")
	}
	if err := query.
		Select("c.*, lc.id AS lc_id, lc.root_id, lc.pos, lc.created_at, lc.updated_at, lc.list_id, lc.deleted_at AS lc_deleted_at").
		Joins("JOIN cards c ON lc.card_id = c.id").
		Where("lc.list_id = ?", listID).
		Order("lc.pos COLLATE \"C\"").
		Find(&cards).Error; err != nil {
		return nil, err
	}
	return cards, nil
}

func (r *GormListCardsRepo) GetListCardRows(ctx context.Context, listIDs []uuid.UUID, includeDeleted bool) ([]boards.ListCardRow, error) {
	var listCardRows []boards.ListCardRow
	query := r.db.WithContext(ctx)
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("cards.deleted_at IS NULL").Where("lc.deleted_at IS NULL")
	}
	if err := query.
		Select(`
		cards.id AS card_id,
		cards.title AS card_title,
		cards.done AS card_done,
		cards.description AS card_description,
		cards.start_date AS card_start_date,
		cards.end_date AS card_end_date,
		cards.props AS card_props,
		cards.created_by_user_id AS card_created_by_user_id,
		cards.created_in_list_id AS card_created_in_list_id,
		cards.created_at AS card_created_at,
		cards.updated_at AS card_updated_at,
		cards.deleted_at AS card_deleted_at,
		lc.id AS lc_id,
		lc.list_id AS lc_list_id,
		lc.card_id AS lc_card_id,
		lc.pos AS lc_pos,
		lc.created_at AS lc_created_at,
		lc.updated_at AS lc_updated_at,
		lc.deleted_at AS lc_deleted_at
		`).
		Table("cards").
		Joins("JOIN list_cards lc ON lc.card_id = cards.id").
		Where("lc.list_id IN ?", listIDs).
		Order("lc.pos COLLATE \"C\"").
		Scan(&listCardRows).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get boards")
	}
	return listCardRows, nil
}

func (r *GormListCardsRepo) BulkUpsertListCardsPosTX(ctx context.Context, db *gorm.DB, listCards []models.ListCard) error {
	return errors.New("bulk upsert list_cards disabled: returning order not guaranteed")
}

func (r *GormListCardsRepo) BulkDeleteListCardsTX(ctx context.Context,
	db *gorm.DB, listID uuid.UUID, cardIDs []uuid.UUID) ([]models.ListCard, error) {
	var deletedListCards []models.ListCard
	if err := db.WithContext(ctx).
		Table("list_cards").
		Where("list_id = ? AND card_id IN ?", listID, cardIDs).
		Clauses(clause.Returning{}).
		Delete(&models.ListCard{}).
		Scan(&deletedListCards).Error; err != nil {
		return nil, err
	}
	return deletedListCards, nil
}

func (r *GormListCardsRepo) GetListCardByListIDsTX(ctx context.Context, db *gorm.DB, listIDs []uuid.UUID) ([]models.ListCard, error) {
	var listCards []models.ListCard
	if err := db.WithContext(ctx).
		Table("list_cards").
		Where("list_id IN ?", listIDs).
		Order("list_id ASC, pos COLLATE \"C\"").
		Find(&listCards).Error; err != nil {
		return nil, err
	}
	return listCards, nil
}

func (r *GormListCardsRepo) GetListCardsByCardIDsTX(ctx context.Context, db *gorm.DB, cardIDs []uuid.UUID, includeDeleted bool) ([]models.ListCard, error) {
	if len(cardIDs) == 0 {
		return []models.ListCard{}, nil
	}

	var listCards []models.ListCard
	query := db.WithContext(ctx).Table("list_cards")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}

	if err := query.
		Where("card_id IN ?", cardIDs).
		Order("card_id ASC, pos COLLATE \"C\"").
		Find(&listCards).Error; err != nil {
		return nil, err
	}

	return listCards, nil
}

func (r *GormListCardsRepo) GetListCardsByCardIDs(ctx context.Context, cardIDs []uuid.UUID, includeDeleted bool) ([]models.ListCard, error) {
	return r.GetListCardsByCardIDsTX(ctx, r.db, cardIDs, includeDeleted)
}

func (r *GormListCardsRepo) GetListCardsByIDsTX(ctx context.Context, db *gorm.DB, listCardIDs []uuid.UUID, includeDeleted bool) ([]models.ListCard, error) {
	if len(listCardIDs) == 0 {
		return []models.ListCard{}, nil
	}

	var listCards []models.ListCard
	query := db.WithContext(ctx).Table("list_cards")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}

	if err := query.
		Where("id IN ?", listCardIDs).
		Find(&listCards).Error; err != nil {
		return nil, err
	}

	return listCards, nil
}

func (r *GormListCardsRepo) GetAnyListCardByCardIDTX(ctx context.Context, db *gorm.DB, cardID uuid.UUID, includeDeleted bool) (*models.ListCard, error) {
	var listCard models.ListCard
	query := db.WithContext(ctx).Table("list_cards")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}

	if err := query.
		Where("card_id = ?", cardID).
		Order("created_at ASC").
		Take(&listCard).Error; err != nil {
		return nil, err
	}
	return &listCard, nil
}

func (r *GormListCardsRepo) GetListCardsByRootIDTX(ctx context.Context, db *gorm.DB, rootID uuid.UUID, includeDeleted bool) ([]models.ListCard, error) {
	var listCards []models.ListCard
	query := db.WithContext(ctx).Table("list_cards")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}

	if err := query.
		Where("root_id = ?", rootID).
		Order("created_at ASC").
		Find(&listCards).Error; err != nil {
		return nil, err
	}
	return listCards, nil
}

func (r *GormListCardsRepo) GetListCardsIdsByRootIdsTX(ctx context.Context, db *gorm.DB, rootIDs []uuid.UUID, includeDeleted bool) ([]uuid.UUID, error) {
	if len(rootIDs) == 0 {
		return []uuid.UUID{}, nil
	}
	var ids []uuid.UUID
	query := db.WithContext(ctx).Table("list_cards").Select("id")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.Where("root_id IN ?", rootIDs).Find(&ids).Error; err != nil {
		return nil, err
	}
	return ids, nil
}

func (r *GormListCardsRepo) GetListCardsByIdsTX(ctx context.Context, db *gorm.DB, listCardIds []uuid.UUID, includeDeleted bool) ([]models.ListCard, error) {
	return r.GetListCardsByIDsTX(ctx, db, listCardIds, includeDeleted)
}

func (r *GormListCardsRepo) BulkDeleteListCardsByIdsTX(ctx context.Context, tx *gorm.DB, idsToDelete []uuid.UUID) ([]models.ListCard, error) {
	if len(idsToDelete) == 0 {
		return []models.ListCard{}, nil
	}
	var deletedListCards []models.ListCard
	if err := tx.WithContext(ctx).
		Table("list_cards").
		Where("id IN ?", idsToDelete).
		Clauses(clause.Returning{}).
		Delete(&models.ListCard{}).
		Scan(&deletedListCards).Error; err != nil {
		return nil, err
	}
	return deletedListCards, nil
}

func (r *GormListCardsRepo) GetListCardByIDTX(ctx context.Context, db *gorm.DB, listCardID uuid.UUID, includeDeleted bool) (*models.ListCard, error) {
	listCard := &models.ListCard{}
	query := db.WithContext(ctx).Table("list_cards")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}

	if err := query.Where("id = ?", listCardID).Take(listCard).Error; err != nil {
		return nil, err
	}

	return listCard, nil
}
