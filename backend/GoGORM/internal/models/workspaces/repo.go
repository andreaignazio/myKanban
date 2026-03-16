package workspaces

import (
	"GoGORM/internal/models/boards"
	"GoGORM/internal/rbac"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GormWorkspaceRepo struct {
	db *gorm.DB
}

func NewGormWorkspaceRepo(db *gorm.DB) *GormWorkspaceRepo {
	return &GormWorkspaceRepo{db: db}
}

func (r *GormWorkspaceRepo) CreateWorkspaceTX(ctx context.Context, tx *gorm.DB, workspace *models.Workspace) error {
	if err := tx.WithContext(ctx).
		Create(workspace).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormWorkspaceRepo) CreateUserWorkspaceTX(ctx context.Context, tx *gorm.DB, userWorkspace *models.UserWorkspace) error {
	if err := tx.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "workspace_id"}, {Name: "user_id"}},
			DoUpdates: clause.Assignments(map[string]any{
				"role":       gorm.Expr("EXCLUDED.role"),
				"pos":        gorm.Expr("EXCLUDED.pos"),
				"updated_at": gorm.Expr("NOW()"),
				"deleted_at": nil,
			}),
			Where: clause.Where{Exprs: []clause.Expression{
				clause.Expr{SQL: "user_workspaces.deleted_at IS NOT NULL"},
			}},
		}).
		Create(userWorkspace).Error; err != nil {
		return err
	}

	var persisted models.UserWorkspace
	if err := tx.WithContext(ctx).
		Table("user_workspaces").
		Where("workspace_id = ? AND user_id = ?", userWorkspace.WorkspaceID, userWorkspace.UserID).
		First(&persisted).Error; err != nil {
		return err
	}
	*userWorkspace = persisted

	return nil
}

func (r *GormWorkspaceRepo) GetWorkspaceByID(ctx context.Context, workspaceID uuid.UUID, includeDeleted bool) (*models.Workspace, error) {
	var workspace models.Workspace
	query := r.db.WithContext(ctx).
		Table("workspaces").
		Where("id = ?", workspaceID)
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.First(&workspace).Error; err != nil {
		return nil, err
	}
	return &workspace, nil
}

func (r *GormWorkspaceRepo) PatchWorkspaceByID(ctx context.Context, workspaceID uuid.UUID, updateMap map[string]any) (*models.Workspace, error) {
	var workspace models.Workspace
	res := r.db.WithContext(ctx).
		Model(&workspace).
		Where("id = ?", workspaceID).
		Where("deleted_at IS NULL").
		Clauses(clause.Returning{}).
		Updates(updateMap)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return &workspace, nil
}

func (r *GormWorkspaceRepo) GetWorkspacesByUserID(ctx context.Context, userID uuid.UUID) ([]models.UserWorkspaceRow, error) {
	var rows []models.UserWorkspaceRow
	if err := r.db.WithContext(ctx).
		Table("workspaces").
		Joins("JOIN user_workspaces wu ON wu.workspace_id = workspaces.id").
		Joins("LEFT JOIN workspace_subscriptions ws ON ws.workspace_id = workspaces.id AND ws.deleted_at IS NULL").
		Unscoped().
		Select(`
			workspaces.id AS workspace_id,
			workspaces.name AS workspace_name,
			workspaces.created_by_user_id AS workspace_created_by_user_id,
			workspaces.workspace_visibility AS workspace_visibility,
			workspaces.public_token AS workspace_public_token,
			workspaces.props AS workspace_props,
			workspaces.created_at AS workspace_created_at,
			workspaces.updated_at AS workspace_updated_at,
			workspaces.deleted_at AS workspace_deleted_at,
			wu.id AS workspace_user_id,
			wu.workspace_id AS workspace_user_workspace_id,
			wu.user_id AS workspace_user_user_id,
			wu.pos AS workspace_user_pos,
			wu.role AS workspace_user_role,
			wu.is_suspended AS workspace_user_is_suspended,
			wu.is_pending_suspend AS workspace_user_is_pending_suspend,
			wu.created_at AS workspace_user_created_at,
			wu.updated_at AS workspace_user_updated_at,
			wu.deleted_at AS workspace_user_deleted_at,
			ws.workspace_id AS subscription_workspace_id,
			ws.plan AS subscription_plan,
			ws.status AS subscription_status,
			ws.provider AS subscription_provider,
			ws.provider_customer_id AS subscription_provider_customer_id,
			ws.provider_subscription_id AS subscription_provider_subscription_id,
			ws.provider_schedule_id AS subscription_provider_schedule_id,
			ws.provider_price_id AS subscription_provider_price_id,
			ws.seat_quantity AS subscription_seat_quantity,
			ws.cancel_at_period_end AS subscription_cancel_at_period_end,
			ws.pending_plan AS subscription_pending_plan,
			ws.pending_seat_quantity AS subscription_pending_seat_quantity,
			ws.pending_change_effective_at AS subscription_pending_change_effective_at,
			ws.current_period_start AS subscription_current_period_start,
			ws.current_period_end AS subscription_current_period_end,
			ws.last_webhook_at AS subscription_last_webhook_at,
			ws.last_provider_event_id AS subscription_last_provider_event_id,
			ws.created_at AS subscription_created_at,
			ws.updated_at AS subscription_updated_at,
			ws.deleted_at AS subscription_deleted_at
		`).
		Where("wu.user_id = ?", userID).
		Where("workspaces.deleted_at IS NULL AND wu.deleted_at IS NULL").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *GormWorkspaceRepo) SearchPublicWorkspaces(ctx context.Context, query string, page, limit int, sort string, includeDeleted bool) ([]models.Workspace, int64, error) {
	workspaces := []models.Workspace{}
	baseQuery := r.db.WithContext(ctx).
		Table("workspaces").
		Where("workspace_visibility = ?", models.WorkspaceVisibilityPublic)

	if includeDeleted {
		baseQuery = baseQuery.Unscoped()
	} else {
		baseQuery = baseQuery.Where("deleted_at IS NULL")
	}

	if query != "" {
		baseQuery = baseQuery.Where("name ILIKE ?", "%"+query+"%")
	}

	var total int64
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	orderBy := "updated_at DESC"
	if sort == "name" {
		orderBy = "name ASC"
	}
	if err := baseQuery.
		Order(orderBy).
		Limit(limit).
		Offset(offset).
		Find(&workspaces).Error; err != nil {
		return nil, 0, err
	}

	return workspaces, total, nil
}

func (r *GormWorkspaceRepo) GetPendingOfferTargetWorkspaceIDsByUserID(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]uuid.UUID, error) {
	workspaceIDs := make([]uuid.UUID, 0)
	query := r.db.WithContext(ctx).
		Table("share_offers").
		Distinct("target_id")

	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}

	if err := query.
		Where("to_user_id = ?", userID).
		Where("target_type = ?", "workspace").
		Where("status = ?", models.Pending).
		Order("target_id").
		Pluck("target_id", &workspaceIDs).Error; err != nil {
		return nil, err
	}

	return workspaceIDs, nil
}

func (r *GormWorkspaceRepo) GetPendingWorkspaceShareOffersForUser(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error) {
	shareOffers := make([]models.ShareOffer, 0)
	query := r.db.WithContext(ctx).Table("share_offers")

	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}

	if err := query.
		Where("target_type = ?", "workspace").
		Where("status = ?", models.Pending).
		Where("(to_user_id = ? OR (from_user_id = ? AND kind = ?))", userID, userID, models.ShareOfferKindRequest).
		Order("target_id, created_at DESC").
		Find(&shareOffers).Error; err != nil {
		return nil, err
	}

	return shareOffers, nil
}

func (r *GormWorkspaceRepo) GetUserWorkspacesByUserID(ctx context.Context, userID uuid.UUID) ([]models.UserWorkspace, error) {
	var userWorkspaces []models.UserWorkspace
	if err := r.db.WithContext(ctx).
		Table("user_workspaces").
		Where("user_id = ?", userID).
		Where("deleted_at IS NULL").
		Order("pos COLLATE \"C\"").
		Find(&userWorkspaces).Error; err != nil {
		return nil, err
	}
	return userWorkspaces, nil
}

func (r *GormWorkspaceRepo) GetWorkspacesBoardsForUserID(ctx context.Context, userID uuid.UUID, workspaceIDs []uuid.UUID) ([]boards.UserBoardRow, error) {
	allowedRoles := rbac.AllowedAtLeast(rbac.Viewer)
	var rows []boards.UserBoardRow
	if err := r.db.WithContext(ctx).
		Table("boards").
		Joins("LEFT JOIN user_boards ub ON ub.board_id = boards.id AND ub.user_id = ? AND ub.deleted_at IS NULL", userID).
		Select(`
			boards.id AS board_id,
			boards.name AS board_name,
			boards.created_by_user_id AS board_created_by_user_id,
			boards.workspace_id AS board_workspace_id,
			boards.visibility AS board_visibility,
			boards.public_token AS board_public_token,
			boards.props AS board_props,
			boards.is_suspended AS board_is_suspended,
			boards.is_pending_suspend AS board_is_pending_suspend,
			boards.created_at AS board_created_at,
			boards.updated_at AS board_updated_at,
			boards.deleted_at AS board_deleted_at,
			ub.user_id AS ub_user_id,
			ub.board_id AS ub_board_id,
			ub.role AS ub_role,
			ub.pos AS ub_pos,
			ub.props AS ub_props,
			ub.created_at AS ub_created_at,
			ub.updated_at AS ub_updated_at,
			ub.deleted_at AS ub_deleted_at
		`).
		Where("boards.workspace_id IN ?", workspaceIDs).
		Where("boards.deleted_at IS NULL").
		Where("boards.visibility != 'private' OR (boards.visibility = 'private' AND ub.user_id IS NOT NULL AND ub.role IN ?)", allowedRoles).
		Order("ub.pos COLLATE \"C\"").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil

}

func (r *GormWorkspaceRepo) GetWorkspaceIDsByUserID(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) {
	var workspaceIDs []uuid.UUID
	if err := r.db.WithContext(ctx).
		Table("user_workspaces").
		Where("user_id = ?", userID).
		Where("deleted_at IS NULL").
		Order("pos COLLATE \"C\"").
		Pluck("workspace_id", &workspaceIDs).Error; err != nil {
		return nil, err
	}
	return workspaceIDs, nil
}

func (r *GormWorkspaceRepo) GetUserWorkspacesByIDs(ctx context.Context, userID uuid.UUID, workspaceIDs []uuid.UUID) ([]models.UserWorkspace, error) {
	var userWorkspaces []models.UserWorkspace
	if err := r.db.WithContext(ctx).
		Table("user_workspaces").
		Where("user_id = ?", userID).
		Where("workspace_id IN ?", workspaceIDs).
		Where("deleted_at IS NULL").
		Order("pos COLLATE \"C\"").
		Find(&userWorkspaces).Error; err != nil {
		return nil, err
	}
	return userWorkspaces, nil
}

func (r *GormWorkspaceRepo) GetWorkspaceBoardsForUserID(ctx context.Context, userID, workspaceID uuid.UUID) ([]boards.UserBoardRow, error) {

	rows, err := r.GetWorkspacesBoardsForUserID(ctx, userID, []uuid.UUID{workspaceID})
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *GormWorkspaceRepo) GetAllWorkspaceBoardsForAdmin(ctx context.Context, userID uuid.UUID, workspaceIDs []uuid.UUID) ([]boards.UserBoardRow, error) {
	if len(workspaceIDs) == 0 {
		return []boards.UserBoardRow{}, nil
	}
	var rows []boards.UserBoardRow
	if err := r.db.WithContext(ctx).
		Table("boards").
		Joins("LEFT JOIN user_boards ub ON ub.board_id = boards.id AND ub.user_id = ? AND ub.deleted_at IS NULL", userID).
		Select(`
			boards.id AS board_id,
			boards.name AS board_name,
			boards.created_by_user_id AS board_created_by_user_id,
			boards.workspace_id AS board_workspace_id,
			boards.visibility AS board_visibility,
			boards.public_token AS board_public_token,
			boards.props AS board_props,
			boards.is_suspended AS board_is_suspended,
			boards.is_pending_suspend AS board_is_pending_suspend,
			boards.created_at AS board_created_at,
			boards.updated_at AS board_updated_at,
			boards.deleted_at AS board_deleted_at,
			ub.user_id AS ub_user_id,
			ub.board_id AS ub_board_id,
			ub.role AS ub_role,
			ub.pos AS ub_pos,
			ub.props AS ub_props,
			ub.created_at AS ub_created_at,
			ub.updated_at AS ub_updated_at,
			ub.deleted_at AS ub_deleted_at
		`).
		Where("boards.workspace_id IN ?", workspaceIDs).
		Where("boards.deleted_at IS NULL").
		Order("boards.created_at DESC").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *GormWorkspaceRepo) GetUserWorkspace(ctx context.Context, userID, workspaceID uuid.UUID) (*models.UserWorkspace, error) {
	var userWorkspace models.UserWorkspace
	if err := r.db.WithContext(ctx).
		Table("user_workspaces").
		Where("user_id = ?", userID).
		Where("workspace_id = ?", workspaceID).
		Where("deleted_at IS NULL").
		First(&userWorkspace).Error; err != nil {
		return nil, err
	}
	return &userWorkspace, nil
}

func (r *GormWorkspaceRepo) GetWorkspaceMembersByWorkspaceID(ctx context.Context, workspaceID uuid.UUID, includeDeleted bool) ([]WorkspaceMemberRow, error) {
	rows := []WorkspaceMemberRow{}
	query := r.db.WithContext(ctx).Table("user_workspaces uw")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("uw.deleted_at IS NULL").Where("u.deleted_at IS NULL")
	}
	if err := query.
		Select(`
			u.id AS user_id,
			u.name AS user_name,
			u.email AS user_email,
			u.username AS user_username,
			u.avatar_url AS user_avatar_url,
			u.props AS user_props,
			u.created_at AS user_created_at,
			u.updated_at AS user_updated_at,
			u.deleted_at AS user_deleted_at,
			uw.id AS uw_id,
			uw.workspace_id AS uw_workspace_id,
			uw.user_id AS uw_user_id,
			uw.pos AS uw_pos,
			uw.role AS uw_role,
			uw.is_suspended AS uw_is_suspended,
			uw.is_pending_suspend AS uw_is_pending_suspend,
			uw.created_at AS uw_created_at,
			uw.updated_at AS uw_updated_at,
			uw.deleted_at AS uw_deleted_at
		`).
		Joins("JOIN users u ON u.id = uw.user_id").
		Where("uw.workspace_id = ?", workspaceID).
		Order("uw.pos COLLATE \"C\"").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *GormWorkspaceRepo) GetWorkspacesByIDs(ctx context.Context, workspaceIDs []uuid.UUID, includeDeleted bool) ([]models.Workspace, error) {
	if len(workspaceIDs) == 0 {
		return []models.Workspace{}, nil
	}
	workspaces := []models.Workspace{}
	query := r.db.WithContext(ctx).Table("workspaces")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("id IN ?", workspaceIDs).
		Find(&workspaces).Error; err != nil {
		return nil, err
	}
	return workspaces, nil
}

func (r *GormWorkspaceRepo) GetWorkspaceSubscriptionsByWorkspaceIDs(ctx context.Context, workspaceIDs []uuid.UUID, includeDeleted bool) ([]models.WorkspaceSubscription, error) {
	if len(workspaceIDs) == 0 {
		return []models.WorkspaceSubscription{}, nil
	}
	subscriptions := []models.WorkspaceSubscription{}
	query := r.db.WithContext(ctx).Table("workspace_subscriptions")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("workspace_id IN ?", workspaceIDs).
		Find(&subscriptions).Error; err != nil {
		return nil, err
	}
	return subscriptions, nil
}

func (r *GormWorkspaceRepo) GetWorkspaceMembersByWorkspaceIDs(ctx context.Context, workspaceIDs []uuid.UUID, includeDeleted bool) ([]WorkspaceMemberRow, error) {
	if len(workspaceIDs) == 0 {
		return []WorkspaceMemberRow{}, nil
	}
	rows := []WorkspaceMemberRow{}
	query := r.db.WithContext(ctx).Table("user_workspaces uw")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("uw.deleted_at IS NULL").Where("u.deleted_at IS NULL")
	}
	if err := query.
		Select(`
			u.id AS user_id,
			u.name AS user_name,
			u.email AS user_email,
			u.username AS user_username,
			u.avatar_url AS user_avatar_url,
			u.props AS user_props,
			u.created_at AS user_created_at,
			u.updated_at AS user_updated_at,
			u.deleted_at AS user_deleted_at,
			uw.id AS uw_id,
			uw.workspace_id AS uw_workspace_id,
			uw.user_id AS uw_user_id,
			uw.pos AS uw_pos,
			uw.role AS uw_role,
			uw.is_suspended AS uw_is_suspended,
			uw.is_pending_suspend AS uw_is_pending_suspend,
			uw.created_at AS uw_created_at,
			uw.updated_at AS uw_updated_at,
			uw.deleted_at AS uw_deleted_at
		`).
		Joins("JOIN users u ON u.id = uw.user_id").
		Where("uw.workspace_id IN ?", workspaceIDs).
		Order("uw.workspace_id, uw.pos COLLATE \"C\"").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *GormWorkspaceRepo) CheckUserWorkspaceMembership(ctx context.Context, userID, workspaceID uuid.UUID, includeDeleted bool) (bool, error) {
	var count int64
	query := r.db.WithContext(ctx).
		Table("user_workspaces").
		Where("user_id = ?", userID).
		Where("workspace_id = ?", workspaceID)
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *GormWorkspaceRepo) CheckUserWorkspaceMembershipByBoardID(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (bool, error) {
	var count int64
	query := r.db.WithContext(ctx).
		Table("user_workspaces uw").
		Joins("JOIN boards b ON b.workspace_id = uw.workspace_id").
		Where("uw.user_id = ?", userID).
		Where("b.id = ?", boardID)
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("uw.deleted_at IS NULL").Where("b.deleted_at IS NULL")
	}
	if err := query.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *GormWorkspaceRepo) GetWorkspaceIDByBoardID(ctx context.Context, boardID uuid.UUID) (uuid.UUID, error) {
	var row struct {
		WorkspaceID uuid.UUID `gorm:"column:workspace_id"`
	}
	if err := r.db.WithContext(ctx).
		Table("boards").
		Select("workspace_id").
		Where("id = ?", boardID).
		Where("deleted_at IS NULL").
		First(&row).Error; err != nil {
		return uuid.Nil, err
	}
	return row.WorkspaceID, nil
}

func (r *GormWorkspaceRepo) GetClosedWorkspaceBoardsForUserID(ctx context.Context, userID, workspaceID uuid.UUID) ([]boards.UserBoardRow, error) {
	allowedRoles := rbac.AllowedAtLeast(rbac.Viewer)
	var rows []boards.UserBoardRow
	if err := r.db.WithContext(ctx).
		Table("boards").
		Joins("LEFT JOIN user_boards ub ON ub.board_id = boards.id AND ub.user_id = ? AND ub.deleted_at IS NULL", userID).
		Select(`
			boards.id AS board_id,
			boards.name AS board_name,
			boards.created_by_user_id AS board_created_by_user_id,
			boards.workspace_id AS board_workspace_id,
			boards.visibility AS board_visibility,
			boards.public_token AS board_public_token,
			boards.props AS board_props,
			boards.is_suspended AS board_is_suspended,
			boards.is_pending_suspend AS board_is_pending_suspend,
			boards.created_at AS board_created_at,
			boards.updated_at AS board_updated_at,
			boards.deleted_at AS board_deleted_at,
			ub.user_id AS ub_user_id,
			ub.board_id AS ub_board_id,
			ub.role AS ub_role,
			ub.pos AS ub_pos,
			ub.props AS ub_props,
			ub.created_at AS ub_created_at,
			ub.updated_at AS ub_updated_at,
			ub.deleted_at AS ub_deleted_at
		`).
		Unscoped().
		Where("boards.workspace_id = ?", workspaceID).
		Where("boards.deleted_at IS NOT NULL").
		Where("boards.visibility != 'private' OR (boards.visibility = 'private' AND ub.user_id IS NOT NULL AND ub.role IN ?)", allowedRoles).
		Order("ub.pos COLLATE \"C\"").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *GormWorkspaceRepo) UpdateUserWorkspaceRoleTX(ctx context.Context, tx *gorm.DB, userID, workspaceID uuid.UUID, updateMap map[string]interface{}) (*models.UserWorkspace, error) {
	var userWorkspace models.UserWorkspace
	res := tx.WithContext(ctx).
		Model(&userWorkspace).
		Where("user_id = ?", userID).
		Where("workspace_id = ?", workspaceID).
		Where("deleted_at IS NULL").
		Clauses(clause.Returning{}).
		Updates(updateMap)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return &userWorkspace, nil
}

func (r *GormWorkspaceRepo) DeleteUserWorkspaceTX(ctx context.Context, tx *gorm.DB, userID, workspaceID uuid.UUID) (*models.UserWorkspace, error) {
	var userWorkspace models.UserWorkspace
	res := tx.WithContext(ctx).
		Model(&userWorkspace).
		Where("user_id = ?", userID).
		Where("workspace_id = ?", workspaceID).
		Where("deleted_at IS NULL").
		Clauses(clause.Returning{}).
		Update("deleted_at", gorm.Expr("NOW()"))
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return &userWorkspace, nil
}

func (r *GormWorkspaceRepo) DeleteUserBaordsWhereWorkspaceIDTX(ctx context.Context, tx *gorm.DB, userID, workspaceID uuid.UUID) error {
	boardIDsInWorkspace := tx.WithContext(ctx).
		Table("boards").
		Select("id").
		Where("workspace_id = ?", workspaceID).
		Where("deleted_at IS NULL")

	if err := tx.WithContext(ctx).
		Table("user_boards").
		Where("user_boards.user_id = ?", userID).
		Where("user_boards.deleted_at IS NULL").
		Where("user_boards.board_id IN (?)", boardIDsInWorkspace).
		Update("deleted_at", gorm.Expr("NOW()")).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormWorkspaceRepo) SoftDeleteWorkspaceTX(ctx context.Context, tx *gorm.DB, workspaceID uuid.UUID) (*models.Workspace, error) {
	var workspace models.Workspace
	res := tx.WithContext(ctx).
		Model(&workspace).
		Where("id = ?", workspaceID).
		Where("deleted_at IS NULL").
		Clauses(clause.Returning{}).
		Update("deleted_at", gorm.Expr("NOW()"))
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return &workspace, nil
}

func (r *GormWorkspaceRepo) SoftDeleteWorkspaceBoardsTX(ctx context.Context, tx *gorm.DB, workspaceID uuid.UUID) error {
	return tx.WithContext(ctx).
		Table("boards").
		Where("workspace_id = ?", workspaceID).
		Where("deleted_at IS NULL").
		Update("deleted_at", gorm.Expr("NOW()")).Error
}
