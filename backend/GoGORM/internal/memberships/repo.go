package memberships

import (
	"GoGORM/internal/dbx"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/rbac"
	"GoGORM/models"
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
)

type GormRepo struct {
	db *gorm.DB
}

func NewGormRepo(db *gorm.DB) *GormRepo {
	return &GormRepo{db: db}
}

func (r *GormRepo) GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error) {

	var userBoard models.UserBoard
	query := r.db.WithContext(ctx).Table("user_boards ub")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("ub.deleted_at IS NULL")
	}
	result := query.
		Where("ub.user_id = ? AND ub.board_id = ?", userID, boardID).
		Limit(1).
		Find(&userBoard)
	if result.Error != nil {
		return "", dbx.WrapDBErr(result.Error, "user has no membership in board")
	}
	if result.RowsAffected == 0 {
		return "", domainerr.ErrNotFound
	}
	return userBoard.Role, nil
}

func (r *GormRepo) CreateUserBoardTX(ctx context.Context, db *gorm.DB, userBoard *models.UserBoard) error {
	if err := db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "user_id"}, {Name: "board_id"}},
			DoUpdates: clause.Assignments(map[string]any{
				"role":       gorm.Expr("EXCLUDED.role"),
				"pos":        gorm.Expr("EXCLUDED.pos"),
				"updated_at": gorm.Expr("NOW()"),
				"deleted_at": nil,
			}),
			Where: clause.Where{Exprs: []clause.Expression{
				clause.Expr{SQL: "user_boards.deleted_at IS NOT NULL"},
			}},
		}).
		Create(userBoard).Error; err != nil {
		return dbx.WrapDBErr(err, "")
	}

	var persisted models.UserBoard
	if err := db.WithContext(ctx).
		Table("user_boards").
		Where("user_id = ? AND board_id = ?", userBoard.UserID, userBoard.BoardID).
		First(&persisted).Error; err != nil {
		return dbx.WrapDBErr(err, "")
	}
	*userBoard = persisted

	return nil
}

func (r *GormRepo) GetBoardsOfListWithUserRole(ctx context.Context,
	userID, listID uuid.UUID, AllowedRoles []string, includeDeleted bool) ([]models.UserBoard, error) {

	var userBoards []models.UserBoard
	query := r.db.WithContext(ctx).Table("user_boards ub")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("ub.deleted_at IS NULL").Where("bl.deleted_at IS NULL")
	}
	if err := query.
		Joins("JOIN board_lists bl ON bl.board_id = ub.board_id").
		Where("bl.list_id = ? AND ub.role IN ?", listID, AllowedRoles).
		Scan(&userBoards).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "")
	}
	return userBoards, nil
}

func (r *GormRepo) GetUserBoardsFast(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.UserBoard, error) {
	var userBoards []models.UserBoard
	query := r.db.WithContext(ctx).Table("user_boards")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("user_id = ?", userID).
		Order("pos COLLATE \"C\"").
		Find(&userBoards).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error fetching user boards")
	}
	return userBoards, nil
}

func (r *GormRepo) GetUsersBoardRows(ctx context.Context, boardID, workspaceID uuid.UUID, includeDeleted bool) ([]BoardUserRow, error) {

	var boardUserRows []BoardUserRow
	query := r.db.WithContext(ctx)
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("users.deleted_at IS NULL").Where("ub.deleted_at IS NULL").Where("uw.deleted_at IS NULL")
	}
	if err := query.
		Select(`
		users.id AS user_id,
		users.name AS user_name,
		users.email AS user_email,
		users.username AS user_username,
		users.avatar_url AS user_avatar_url,
		users.props AS user_props,
		users.created_at AS user_created_at,
		users.updated_at AS user_updated_at,
		users.deleted_at AS user_deleted_at,
		ub.user_id AS ub_user_id,
		ub.board_id AS ub_board_id,
		ub.role AS ub_role,
		ub.pos AS ub_pos,
		ub.props AS ub_props,
		ub.created_at AS ub_created_at,
		ub.updated_at AS ub_updated_at,
		ub.deleted_at AS ub_deleted_at,
		uw.id AS uw_id,
		uw.workspace_id AS uw_workspace_id,
		uw.user_id AS uw_user_id,
		uw.pos AS uw_pos,
		uw.role AS uw_role,
		uw.created_at AS uw_created_at,
		uw.updated_at AS uw_updated_at,
		uw.deleted_at AS uw_deleted_at
		`).
		Table("users").
		Joins("JOIN user_boards ub ON ub.user_id = users.id").
		Joins("JOIN user_workspaces uw ON uw.user_id = users.id AND uw.workspace_id = ?", workspaceID).
		Where("ub.board_id = ?", boardID).
		Order("ub.created_at ASC").
		Scan(&boardUserRows).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get boards")
	}
	fmt.Println(boardUserRows)
	return boardUserRows, nil
}

func (r *GormRepo) GetUsersBoardRowsByBoardIDs(ctx context.Context, boardIDs []uuid.UUID, includeDeleted bool) ([]BoardUserRow, error) {
	if len(boardIDs) == 0 {
		return []BoardUserRow{}, nil
	}
	var boardUserRows []BoardUserRow
	query := r.db.WithContext(ctx)
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("users.deleted_at IS NULL").Where("ub.deleted_at IS NULL")
	}
	if err := query.
		Select(`
		users.id AS user_id,
		users.name AS user_name,
		users.email AS user_email,
		users.username AS user_username,
		users.avatar_url AS user_avatar_url,
		users.props AS user_props,
		users.created_at AS user_created_at,
		users.updated_at AS user_updated_at,
		users.deleted_at AS user_deleted_at,
		ub.user_id AS ub_user_id,
		ub.board_id AS ub_board_id,
		ub.role AS ub_role,
		ub.pos AS ub_pos,
		ub.props AS ub_props,
		ub.created_at AS ub_created_at,
		ub.updated_at AS ub_updated_at,
		ub.deleted_at AS ub_deleted_at
		`).
		Table("users").
		Joins("JOIN user_boards ub ON ub.user_id = users.id").
		Where("ub.board_id IN ?", boardIDs).
		Order("ub.board_id, ub.created_at ASC").
		Scan(&boardUserRows).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get boards")
	}
	return boardUserRows, nil
}

func (r *GormRepo) CreateUserBoardLink(ctx context.Context, userBoard *models.UserBoard) error {
	if err := r.CreateUserBoardTX(ctx, r.db, userBoard); err != nil {
		return err
	}
	return nil
}

func (r *GormRepo) UpdateUserBoardRole(ctx context.Context, userBoard *models.UserBoard) error {
	if err := r.db.WithContext(ctx).
		Model(&models.UserBoard{}).
		Where("user_id = ? AND board_id = ?", userBoard.UserID, userBoard.BoardID).
		Clauses(clause.Returning{}).
		Update("role", userBoard.Role).
		Scan(&userBoard).Error; err != nil {
		return dbx.WrapDBErr(err, "error updating user board role")
	}
	return nil
}

func (r *GormRepo) DeleteUserBoardLink(ctx context.Context, userID, boardID uuid.UUID) error {
	tx := r.db.WithContext(ctx).
		Where("user_id = ? AND board_id = ?", userID, boardID).
		Delete(&models.UserBoard{})

	if tx.Error != nil {
		return dbx.WrapDBErr(tx.Error, "error deleting")
	}

	if tx.RowsAffected == 0 {
		return domainerr.ErrNotFound
	}

	return nil
}

func (r *GormRepo) GetUserWorkspaceRole(ctx context.Context, userID, workspaceID uuid.UUID, includeDeleted bool) (string, error) {
	var userWorkspace models.UserWorkspace
	query := r.db.WithContext(ctx).Table("user_workspaces")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}

	result := query.
		Where("user_id = ? AND workspace_id = ?", userID, workspaceID).
		Limit(1).
		Find(&userWorkspace)
	if result.Error != nil {
		return "", dbx.WrapDBErr(result.Error, "error fetching user workspace role")
	}
	if result.RowsAffected == 0 {
		return "", domainerr.ErrNotFound
	}

	if userWorkspace.IsSuspended && userWorkspace.Role != rbac.Owner {
		return "", domainerr.ErrMemberSuspended
	}

	return userWorkspace.Role.String(), nil
}

func (r *GormRepo) GetUser(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	var user models.User
	if err := r.db.WithContext(ctx).
		Table("users").
		Where("id = ?", userID).
		First(&user).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error fetching user")
	}
	return &user, nil
}

func (r *GormRepo) GetUserByClerkUserID(ctx context.Context, clerkUserID string) (*models.User, error) {
	var user models.User
	db := r.db.WithContext(ctx).Session(&gorm.Session{
		Logger: r.db.Logger.LogMode(logger.Warn),
	})
	if err := db.
		Table("users").
		Where("clerk_user_id = ?", clerkUserID).
		First(&user).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error fetching user by Clerk user ID")
	}
	return &user, nil
}

func (r *GormRepo) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	db := r.db.WithContext(ctx).Session(&gorm.Session{
		Logger: r.db.Logger.LogMode(logger.Warn),
	})
	if err := db.
		Table("users").
		Where("LOWER(email) = ?", strings.ToLower(email)).
		First(&user).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error fetching user by email")
	}
	return &user, nil
}

func (r *GormRepo) CreateUser(ctx context.Context, user *models.User) error {
	if err := r.db.WithContext(ctx).
		Table("users").
		Create(user).Error; err != nil {
		return dbx.WrapDBErr(err, "error creating user")
	}
	return nil
}

func (r *GormRepo) PatchUserByID(ctx context.Context, userID uuid.UUID, updates map[string]any) (*models.User, error) {
	result := r.db.WithContext(ctx).
		Table("users").
		Where("id = ?", userID).
		Updates(updates)
	if result.Error != nil {
		return nil, dbx.WrapDBErr(result.Error, "error patching user")
	}
	if result.RowsAffected == 0 {
		return nil, domainerr.ErrNotFound
	}
	return r.GetUser(ctx, userID)
}

func (r *GormRepo) GetUserWorkspaceIDs(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) {
	workspaceIDs := make([]uuid.UUID, 0)
	if err := r.db.WithContext(ctx).
		Table("user_workspaces").
		Select("workspace_id").
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Find(&workspaceIDs).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error fetching user workspace IDs")
	}
	return workspaceIDs, nil
}

func (r *GormRepo) SearchUsers(ctx context.Context, query string) ([]models.User, error) {
	var users []models.User
	if err := r.db.WithContext(ctx).
		Table("users").
		Where("name ILIKE ? OR username ILIKE ?", "%"+query+"%", "%"+query+"%").
		Find(&users).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error searching users")
	}
	return users, nil
}

func (r *GormRepo) GetUsersByIDs(ctx context.Context, userIDs []uuid.UUID) ([]models.User, error) {
	var users []models.User
	if err := r.db.WithContext(ctx).
		Table("users").
		Where("id IN ?", userIDs).
		Find(&users).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error fetching users by IDs")
	}
	return users, nil
}

func (r *GormRepo) GetUserLiteByID(ctx context.Context, userID uuid.UUID) (*models.UserLite, error) {
	var userLite models.UserLite
	if err := r.db.WithContext(ctx).
		Table("users").
		Select("id, name, username, avatar_url, props").
		Where("id = ?", userID).
		First(&userLite).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error fetching user")
	}
	return &userLite, nil
}

func (r *GormRepo) GetUserLiteWithBoardRoleByID(ctx context.Context, userID uuid.UUID, workspaceID, boardID uuid.UUID) (*models.UserLite, error) {
	var userLite models.UserLite
	if err := r.db.WithContext(ctx).
		Table("users u").
		Select("u.id, u.name, u.username, u.avatar_url, u.props, ub.role AS user_board_role, uw.role AS workspace_user_role").
		Joins("JOIN user_boards ub ON ub.user_id = u.id AND ub.board_id = ?", boardID).
		Joins("JOIN user_workspaces uw ON uw.user_id = u.id AND uw.workspace_id = ?", workspaceID).
		Where("u.id = ?", userID).
		First(&userLite).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error fetching user with role")
	}
	return &userLite, nil
}

func (r *GormRepo) GetUserLiteWithWorkspaceRoleByID(ctx context.Context, userID uuid.UUID, workspaceID uuid.UUID) (*models.UserLite, error) {
	var userLite models.UserLite
	if err := r.db.WithContext(ctx).
		Table("users u").
		Select("u.id, u.name, u.username, u.avatar_url, u.props, uw.role AS workspace_user_role").
		Joins("JOIN user_workspaces uw ON uw.user_id = u.id AND uw.workspace_id = ?", workspaceID).
		Where("u.id = ?", userID).
		First(&userLite).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error fetching user with workspace role")
	}
	return &userLite, nil
}

func (r *GormRepo) GetUserLitesByIDs(ctx context.Context, workspaceID uuid.UUID, userIDs []uuid.UUID) ([]models.UserLite, error) {
	var userLites []models.UserLite
	if err := r.db.WithContext(ctx).
		Table("users u").
		Select("u.id, u.name, u.username, u.avatar_url, u.props, uw.role AS workspace_user_role").
		Joins("JOIN user_workspaces uw ON uw.user_id = u.id AND uw.workspace_id = ?", workspaceID).
		Where("u.id IN ?", userIDs).
		Find(&userLites).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error fetching users with workspace role")
	}
	return userLites, nil
}

func (r *GormRepo) AddMemberToChecklistEntry(ctx context.Context, entryMember *models.EntryMember) error {
	if err := r.db.WithContext(ctx).Create(entryMember).Error; err != nil {
		return dbx.WrapDBErr(err, "error adding member to checklist entry")
	}
	return nil
}

func (r *GormRepo) RemoveMemberFromChecklistEntry(ctx context.Context, entryID, memberID uuid.UUID) (*models.EntryMember, error) {
	var deleted models.EntryMember
	result := r.db.WithContext(ctx).
		Clauses(clause.Returning{}).
		Where("entry_id = ? AND user_id = ?", entryID, memberID).
		Delete(&deleted)
	if result.Error != nil {
		return nil, dbx.WrapDBErr(result.Error, "error removing member from checklist entry")
	}
	if result.RowsAffected == 0 {
		return nil, domainerr.ErrNotFound
	}
	return &deleted, nil
}
