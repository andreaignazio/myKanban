package shares

import (
	"GoGORM/internal/dbx"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GormShareRepo struct {
	db *gorm.DB
}

func NewGormShareRepo(db *gorm.DB) *GormShareRepo {
	return &GormShareRepo{db: db}
}

func (r *GormShareRepo) CreateShareOffer(ctx context.Context, shareOffer models.ShareOffer) error {
	if err := r.db.WithContext(ctx).
		Table("share_offers").
		Create(&shareOffer).Error; err != nil {
		return dbx.WrapDBErr(err, "error creating share offer")
	}
	return nil
}

func (r *GormShareRepo) CreateBulkShareOffers(ctx context.Context, shareOffers []models.ShareOffer) error {
	if err := r.db.WithContext(ctx).
		Table("share_offers").
		Create(&shareOffers).Error; err != nil {
		return dbx.WrapDBErr(err, "error creating bulk share offers")
	}
	return nil
}

func (r *GormShareRepo) GetShareOffersByTypeAndTargetID(ctx context.Context, targetType string,
	targetID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error) {
	shareOffers := []models.ShareOffer{}
	query := r.db.WithContext(ctx).Table("share_offers")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("target_type = ? AND target_id = ?", targetType, targetID).
		Order("created_at DESC").
		Find(&shareOffers).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting share offers by type and target ID")
	}
	return shareOffers, nil
}

func (r *GormShareRepo) GetBoardRequestShareOffers(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error) {
	shareOffers := []models.ShareOffer{}
	query := r.db.WithContext(ctx).Table("share_offers")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("target_type = ? AND target_id = ? AND kind = ?", "board", boardID, models.ShareOfferKindRequest).
		Order("created_at DESC").
		Find(&shareOffers).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting board request share offers")
	}
	return shareOffers, nil
}

func (r *GormShareRepo) GetWorkspaceRequestShareOffers(ctx context.Context, workspaceID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error) {
	shareOffers := []models.ShareOffer{}
	query := r.db.WithContext(ctx).Table("share_offers")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("target_type = ? AND target_id = ? AND kind = ?", "workspace", workspaceID, models.ShareOfferKindRequest).
		Order("created_at DESC").
		Find(&shareOffers).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting workspace request share offers")
	}
	return shareOffers, nil
}

func (r *GormShareRepo) GetBoardInviteShareOffers(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error) {
	shareOffers := []models.ShareOffer{}
	query := r.db.WithContext(ctx).Table("share_offers")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("target_type = ? AND target_id = ? AND kind = ?", "board", boardID, models.ShareOfferKindInvite).
		Order("created_at DESC").
		Find(&shareOffers).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting board invite share offers")
	}
	return shareOffers, nil
}

func (r *GormShareRepo) GetPendingShareOfferByRequesterAndTarget(ctx context.Context, fromUserID uuid.UUID,
	targetType string, targetID uuid.UUID, kind models.ShareOfferKind, includeDeleted bool) (*models.ShareOffer, error) {
	shareOffer := models.ShareOffer{}
	query := r.db.WithContext(ctx).Table("share_offers")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("from_user_id = ? AND target_type = ? AND target_id = ? AND kind = ? AND status = ?", fromUserID, targetType, targetID, kind, models.Pending).
		First(&shareOffer).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting pending share offer by requester and target")
	}
	return &shareOffer, nil
}

func (r *GormShareRepo) GetUserIncomingShareOffers(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error) {
	shareOffers := []models.ShareOffer{}
	query := r.db.WithContext(ctx).Table("share_offers")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("to_user_id = ?", userID).
		Order("created_at DESC").
		Find(&shareOffers).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting user incoming share offers")
	}
	return shareOffers, nil
}

func (r *GormShareRepo) GetUserOutgoingShareOffers(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error) {
	shareOffers := []models.ShareOffer{}
	query := r.db.WithContext(ctx).Table("share_offers")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("from_user_id = ?", userID).
		Order("created_at DESC").
		Find(&shareOffers).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting user outgoing share offers")
	}
	return shareOffers, nil
}

func (r *GormShareRepo) GetShareOfferByID(ctx context.Context, shareID uuid.UUID, includeDeleted bool) (*models.ShareOffer, error) {
	shareOffer := models.ShareOffer{}
	query := r.db.WithContext(ctx).Table("share_offers")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("id = ?", shareID).
		Order("created_at DESC").
		First(&shareOffer).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting share offer by id")
	}
	return &shareOffer, nil
}

func (r *GormShareRepo) UpdateShareOfferTx(ctx context.Context, db *gorm.DB, shareOfferUpdate *models.ShareOffer) error {
	if err := db.WithContext(ctx).
		Table("share_offers").
		Where("id = ?", shareOfferUpdate.ID).
		Clauses(clause.Returning{}).
		Updates(shareOfferUpdate).Error; err != nil {
		return dbx.WrapDBErr(err, "error updating share offer")
	}
	return nil
}

func (r *GormShareRepo) GetUserBoardRequestsOutgoing(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error) {
	shareOffers := []models.ShareOffer{}
	query := r.db.WithContext(ctx).Table("share_offers")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("from_user_id = ? AND target_type = ? AND kind = ?", userID, "board", models.ShareOfferKindRequest).
		Order("created_at DESC").
		Find(&shareOffers).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting user board access sent requests")
	}
	return shareOffers, nil
}

func (r *GormShareRepo) GetUserBoardInvitesIncoming(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error) {
	shareOffers := []models.ShareOffer{}
	query := r.db.WithContext(ctx).Table("share_offers")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("to_user_id = ? AND target_type = ? AND kind = ?", userID, "board", models.ShareOfferKindInvite).
		Order("created_at DESC").
		Find(&shareOffers).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting user incoming board invites")
	}
	return shareOffers, nil
}

func (r *GormShareRepo) GetUserWorkspaceRequestsOutgoing(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error) {
	shareOffers := []models.ShareOffer{}
	query := r.db.WithContext(ctx).Table("share_offers")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("from_user_id = ? AND target_type = ? AND kind = ?", userID, "workspace", models.ShareOfferKindRequest).
		Order("created_at DESC").
		Find(&shareOffers).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting user workspace access sent requests")
	}
	return shareOffers, nil
}

func (r *GormShareRepo) GetPendingOfferedBoardIDsByWorkspaceForUser(ctx context.Context, workspaceID, userID uuid.UUID, includeDeleted bool) ([]uuid.UUID, error) {
	boardIDs := make([]uuid.UUID, 0)
	query := r.db.WithContext(ctx).
		Table("share_offers so").
		Joins("JOIN boards b ON b.id = so.target_id").
		Distinct("so.target_id")

	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("so.deleted_at IS NULL").Where("b.deleted_at IS NULL")
	}

	if err := query.
		Where("b.workspace_id = ?", workspaceID).
		Where("so.target_type = ?", "board").
		Where("so.status = ?", models.Pending).
		Where("so.kind = ?", models.ShareOfferKindInvite).
		Where("so.to_user_id = ?", userID).
		Order("so.target_id").
		Pluck("so.target_id", &boardIDs).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting pending offered board target IDs by workspace for user")
	}

	return boardIDs, nil
}

func (r *GormShareRepo) GetPendingRequestedBoardIDsByWorkspaceForUser(ctx context.Context, workspaceID, userID uuid.UUID, includeDeleted bool) ([]uuid.UUID, error) {
	boardIDs := make([]uuid.UUID, 0)
	query := r.db.WithContext(ctx).
		Table("share_offers so").
		Joins("JOIN boards b ON b.id = so.target_id").
		Distinct("so.target_id")

	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("so.deleted_at IS NULL").Where("b.deleted_at IS NULL")
	}

	if err := query.
		Where("b.workspace_id = ?", workspaceID).
		Where("so.target_type = ?", "board").
		Where("so.status = ?", models.Pending).
		Where("so.kind = ?", models.ShareOfferKindRequest).
		Where("so.from_user_id = ?", userID).
		Order("so.target_id").
		Pluck("so.target_id", &boardIDs).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting pending requested board target IDs by workspace for user")
	}

	return boardIDs, nil
}

func (r *GormShareRepo) GetPendingBoardShareOffersByWorkspaceForUser(ctx context.Context, workspaceID, userID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error) {
	shareOffers := make([]models.ShareOffer, 0)
	query := r.db.WithContext(ctx).
		Table("share_offers so").
		Joins("JOIN boards b ON b.id = so.target_id")

	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("so.deleted_at IS NULL").Where("b.deleted_at IS NULL")
	}

	if err := query.
		Where("b.workspace_id = ?", workspaceID).
		Where("so.target_type = ?", "board").
		Where("so.status = ?", models.Pending).
		Where("(so.kind = ? AND so.to_user_id = ?) OR (so.kind = ? AND so.from_user_id = ?)",
			models.ShareOfferKindInvite, userID,
			models.ShareOfferKindRequest, userID,
		).
		Order("so.created_at DESC").
		Find(&shareOffers).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting pending board share offers by workspace for user")
	}

	return shareOffers, nil
}

func (r *GormShareRepo) GetBoardRequestShareOffersByWorkspaceForAdminOwner(ctx context.Context, workspaceID, userID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error) {
	shareOffers := []models.ShareOffer{}
	query := r.db.WithContext(ctx).
		Table("share_offers so").
		Joins("JOIN boards b ON b.id = so.target_id").
		Joins("JOIN user_boards ub ON ub.board_id = so.target_id AND ub.user_id = ?", userID).
		Select("so.*")

	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("so.deleted_at IS NULL").Where("b.deleted_at IS NULL").Where("ub.deleted_at IS NULL")
	}

	if err := query.
		Where("b.workspace_id = ?", workspaceID).
		Where("so.target_type = ?", "board").
		Where("so.kind = ?", models.ShareOfferKindRequest).
		Where("so.status = ?", models.Pending).
		Where("ub.role IN ?", []string{"admin", "owner"}).
		Order("so.created_at DESC").
		Find(&shareOffers).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error getting pending board access request share offers by workspace for admin/owner")
	}

	return shareOffers, nil
}
