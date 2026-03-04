package shares

import (
	"GoGORM/internal/dbx"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GormListShareRepo struct {
	db *gorm.DB
}

func NewGormListShareRepo(db *gorm.DB) *GormListShareRepo {
	return &GormListShareRepo{db: db}
}

func (r *GormListShareRepo) CreateListShareOffer(ctx context.Context, shareOffer models.BoardListShareOffer) error {
	if err := r.db.WithContext(ctx).
		Table("board_list_share_offers").
		Create(&shareOffer).Error; err != nil {
		return dbx.WrapDBErr(err, "error creating share offer")
	}
	return nil
}

func (r *GormListShareRepo) GetListShareOffersByTargetBoardID(ctx context.Context, targetBoardID uuid.UUID, includeDeleted bool) ([]models.BoardListShareOffer, error) {
	shareOffers := []models.BoardListShareOffer{}
	query := r.db.WithContext(ctx).Table("board_list_share_offers blso")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("blso.deleted_at IS NULL")
	}
	if err := query.
		Where("blso.target_board_id = ?", targetBoardID).
		Find(&shareOffers).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting share offers by target board ID")
	}
	return shareOffers, nil
}

func (r *GormListShareRepo) GetListShareOfferDetail(ctx context.Context, shareID uuid.UUID, includeDeleted bool) (models.BoardListShareOffer, error) {
	shareOffer := models.BoardListShareOffer{}
	query := r.db.WithContext(ctx).Table("board_list_share_offers")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("id = ?", shareID).
		First(&shareOffer).Error; err != nil {
		return models.BoardListShareOffer{}, dbx.WrapDBErr(err, "error getting share offer detail by share ID")
	}
	return shareOffer, nil
}

func (r *GormListShareRepo) UpdateListShareOffer(ctx context.Context, shareOfferUpdate *ShareOfferUpdate) (*models.BoardListShareOffer, error) {
	return r.UpdateListShareOfferTx(ctx, r.db, shareOfferUpdate)
}

func (r *GormListShareRepo) UpdateListShareOfferTx(ctx context.Context, db *gorm.DB, shareOfferUpdate *ShareOfferUpdate) (*models.BoardListShareOffer, error) {

	var updatedShareOffer models.BoardListShareOffer
	if err := db.WithContext(ctx).
		Table("board_list_share_offers").
		Where("id = ?", shareOfferUpdate.ID).
		Clauses(clause.Returning{}).
		Updates(shareOfferUpdate).
		Scan(&updatedShareOffer).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error updating share offer")
	}
	return &updatedShareOffer, nil
}

func (r *GormListShareRepo) createOrUpdateBoardList(ctx context.Context, db *gorm.DB, boardList *models.BoardList) (*models.BoardList, error) {
	if err := db.WithContext(ctx).
		Table("board_lists").
		Clauses(clause.Returning{}, clause.OnConflict{
			Columns:   []clause.Column{{Name: "list_id"}, {Name: "board_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"access_mode"}), // se già esiste, aggiorna pos
		}).Create(&boardList).Scan(boardList).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error creating or updating board list")
	}
	return boardList, nil
}

func (r *GormListShareRepo) GetListShareOfferByListIDandTargetBoardID(ctx context.Context, listID,
	targetBoardID uuid.UUID, includeDeleted bool) (*models.BoardListShareOffer, error) {
	var shareOffer models.BoardListShareOffer
	query := r.db.WithContext(ctx).Table("board_list_share_offers")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	result := query.
		Where("list_id = ? AND target_board_id = ?", listID, targetBoardID).
		Limit(1).
		Find(&shareOffer)
	if result.Error != nil {
		return nil, dbx.WrapDBErr(result.Error, "error getting share offer by list ID and target board ID")
	}
	if result.RowsAffected == 0 {
		return nil, nil
	}
	return &shareOffer, nil
}
