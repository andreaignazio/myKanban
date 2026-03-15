package auditcontext

import (
	"GoGORM/internal/dbx"
	"GoGORM/internal/dto"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Reader interface {
	GetUserLiteOnlyWorkspaceRoleByID(ctx context.Context, userID uuid.UUID, workspaceID uuid.UUID) (*models.UserLite, error)

	GetUserLiteWithBoardRoleByID(ctx context.Context, userID uuid.UUID, workspaceID, boardID uuid.UUID) (*models.UserLite, error)
	GetUsersLiteWithBoardRoleByIDs(ctx context.Context, userIDs []uuid.UUID, workspaceID, boardID uuid.UUID) ([]*models.UserLite, error)
	GetWorkspaceDetailsByID(ctx context.Context, workspaceID uuid.UUID) (*dto.WorkspaceDetailsResponse, error)
	GetListMeta(ctx context.Context, listID uuid.UUID) (*models.List, error)
	GetBoardMeta(ctx context.Context, boardID uuid.UUID) (*models.Board, error)
	GetListMetaByCardID(ctx context.Context, boardID, cardID uuid.UUID) (*models.List, error)
	GetCardMeta(ctx context.Context, cardID uuid.UUID) (*models.Card, error)
	GetChecklistMeta(ctx context.Context, checklistID uuid.UUID) (*models.Checklist, error)
	GetWorkspaceMeta(ctx context.Context, workspaceID uuid.UUID) (*models.Workspace, error)
	GetUserBoardsByBoardID(ctx context.Context, boardID uuid.UUID) ([]*models.UserBoard, error)
	GetUsersByIDs(ctx context.Context, userIDs []uuid.UUID) ([]*models.User, error)
	GetUserLite(ctx context.Context, userID uuid.UUID) (*models.UserLite, error)
	GetBoardListsByBoardID(ctx context.Context, boardID uuid.UUID) ([]models.BoardList, error)
	GetWorkspaceAdminOwnerUserIDs(ctx context.Context, workspaceID uuid.UUID) ([]uuid.UUID, error)
}

type AuditContextRepo struct {
	db *gorm.DB
}

type workspaceMemberRow struct {
	User          models.User          `gorm:"embedded;embeddedPrefix:user_"`
	UserWorkspace models.UserWorkspace `gorm:"embedded;embeddedPrefix:uw_"`
}

func NewAuditContextRepo(db *gorm.DB) *AuditContextRepo {
	return &AuditContextRepo{db: db}
}

func (r *AuditContextRepo) GetUserLiteOnlyWorkspaceRoleByID(ctx context.Context, userID uuid.UUID, workspaceID uuid.UUID) (*models.UserLite, error) {
	var userLite models.UserLite
	if err := r.db.WithContext(ctx).
		Table("users u").
		Select("u.id, u.name, u.username, u.avatar_url, u.props, uw.role AS workspace_user_role").
		Joins("JOIN user_workspaces uw ON uw.user_id = u.id AND uw.workspace_id = ?", workspaceID).
		Where("u.id = ?", userID).
		First(&userLite).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "auditcontext: error fetching user lite with roles")
	}
	return &userLite, nil
}

func (r *AuditContextRepo) GetUserLite(ctx context.Context, userID uuid.UUID) (*models.UserLite, error) {
	var userLite models.UserLite
	if err := r.db.WithContext(ctx).
		Table("users").
		Where("id = ?", userID).
		First(&userLite).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "auditcontext: error fetching user lite")
	}
	return &userLite, nil
}

func (r *AuditContextRepo) GetUsersByIDs(ctx context.Context, userIDs []uuid.UUID) ([]*models.User, error) {
	var users []*models.User
	if err := r.db.WithContext(ctx).
		Table("users").
		Where("id IN ?", userIDs).
		Find(&users).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "auditcontext: error fetching users by IDs")
	}
	return users, nil
}

func (r *AuditContextRepo) GetWorkspaceDetailsByID(ctx context.Context, workspaceID uuid.UUID) (*dto.WorkspaceDetailsResponse, error) {
	workspaceMeta, err := r.GetWorkspaceMeta(ctx, workspaceID)
	if err != nil {
		return nil, err
	}

	memberRows, err := r.getWorkspaceMembersByWorkspaceIDs(ctx, []uuid.UUID{workspaceID})
	if err != nil {
		return nil, err
	}

	subscriptions, err := r.getWorkspaceSubscriptionsByWorkspaceIDs(ctx, []uuid.UUID{workspaceID})
	if err != nil {
		return nil, err
	}

	workspaceDetails := dto.WorkspaceDetailsResponse{
		Workspace:             dto.WorkspaceToResponse(workspaceMeta),
		WorkspaceMembers:      []dto.WorkspaceMembersResponse{},
		WorkspaceSubscription: dto.SubscriptionResponse{},
	}

	if len(memberRows) > 0 {
		users := make([]dto.UserResponse, 0, len(memberRows))
		userWorkspaces := make([]dto.UserWorkspaceResponse, 0, len(memberRows))
		for i := range memberRows {
			users = append(users, dto.UserToResponse(&memberRows[i].User))
			userWorkspaces = append(userWorkspaces, dto.UserWorkspaceToResponse(&memberRows[i].UserWorkspace))
		}

		workspaceDetails.WorkspaceMembers = []dto.WorkspaceMembersResponse{
			{
				User:           users,
				UsersWorkspace: userWorkspaces,
			},
		}
	}

	if len(subscriptions) > 0 {
		workspaceDetails.WorkspaceSubscription = dto.WorkspaceSubscriptionToResponse(&subscriptions[0])
	}

	return &workspaceDetails, nil
}

func (r *AuditContextRepo) getWorkspaceSubscriptionsByWorkspaceIDs(ctx context.Context, workspaceIDs []uuid.UUID) ([]models.WorkspaceSubscription, error) {
	if len(workspaceIDs) == 0 {
		return []models.WorkspaceSubscription{}, nil
	}

	subscriptions := []models.WorkspaceSubscription{}
	if err := r.db.WithContext(ctx).
		Table("workspace_subscriptions").
		Where("deleted_at IS NULL").
		Where("workspace_id IN ?", workspaceIDs).
		Where("status IN ('trial', 'trialing', 'active')").
		Find(&subscriptions).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "auditcontext: error fetching workspace subscriptions")
	}

	return subscriptions, nil
}

func (r *AuditContextRepo) getWorkspaceMembersByWorkspaceIDs(ctx context.Context, workspaceIDs []uuid.UUID) ([]workspaceMemberRow, error) {
	if len(workspaceIDs) == 0 {
		return []workspaceMemberRow{}, nil
	}

	rows := []workspaceMemberRow{}
	if err := r.db.WithContext(ctx).
		Table("user_workspaces uw").
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
			uw.created_at AS uw_created_at,
			uw.updated_at AS uw_updated_at,
			uw.deleted_at AS uw_deleted_at
		`).
		Joins("JOIN users u ON u.id = uw.user_id").
		Where("uw.deleted_at IS NULL").
		Where("u.deleted_at IS NULL").
		Where("uw.workspace_id IN ?", workspaceIDs).
		Order("uw.workspace_id, uw.pos COLLATE \"C\"").
		Scan(&rows).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "auditcontext: error fetching workspace members")
	}

	return rows, nil
}

func (r *AuditContextRepo) GetUserLiteWithBoardRoleByID(ctx context.Context, userID uuid.UUID, workspaceID, boardID uuid.UUID) (*models.UserLite, error) {
	var userLite models.UserLite
	if err := r.db.WithContext(ctx).
		Table("users u").
		Select("u.id, u.name, u.username, u.avatar_url, u.props, ub.role AS user_board_role, uw.role AS workspace_user_role").
		Joins("JOIN user_boards ub ON ub.user_id = u.id AND ub.board_id = ?", boardID).
		Joins("JOIN user_workspaces uw ON uw.user_id = u.id AND uw.workspace_id = ?", workspaceID).
		Where("u.id = ?", userID).
		First(&userLite).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "auditcontext: error fetching user lite with roles")
	}
	return &userLite, nil
}

func (r *AuditContextRepo) GetUsersLiteWithBoardRoleByIDs(ctx context.Context, userIDs []uuid.UUID, workspaceID, boardID uuid.UUID) ([]*models.UserLite, error) {
	var usersLite []*models.UserLite
	if err := r.db.WithContext(ctx).
		Table("users u").
		Select("u.id, u.name, u.username, u.avatar_url, u.props, ub.role AS user_board_role, uw.role AS workspace_user_role").
		Joins("JOIN user_boards ub ON ub.user_id = u.id AND ub.board_id = ?", boardID).
		Joins("JOIN user_workspaces uw ON uw.user_id = u.id AND uw.workspace_id = ?", workspaceID).
		Where("u.id IN ?", userIDs).
		Find(&usersLite).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "auditcontext: error fetching users lite with roles")
	}
	return usersLite, nil
}

func (r *AuditContextRepo) GetListMeta(ctx context.Context, listID uuid.UUID) (*models.List, error) {
	var list models.List
	if err := r.db.WithContext(ctx).
		Table("lists").
		Where("id = ? AND deleted_at IS NULL", listID).
		First(&list).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "auditcontext: error fetching list meta")
	}
	return &list, nil
}

func (r *AuditContextRepo) GetBoardMeta(ctx context.Context, boardID uuid.UUID) (*models.Board, error) {
	var board models.Board
	if err := r.db.WithContext(ctx).
		Table("boards").
		Where("id = ? AND deleted_at IS NULL", boardID).
		First(&board).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "auditcontext: error fetching board meta")
	}
	return &board, nil
}

func (r *AuditContextRepo) GetListMetaByCardID(ctx context.Context, boardID, cardID uuid.UUID) (*models.List, error) {
	var list models.List
	if err := r.db.WithContext(ctx).
		Table("lists l").
		Joins("JOIN list_cards lc ON lc.list_id = l.id AND lc.card_id = ?", cardID).
		Joins("JOIN board_lists bl ON bl.list_id = l.id AND bl.board_id = ?", boardID).
		Where("l.deleted_at IS NULL").
		First(&list).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "auditcontext: error fetching list meta by card ID")
	}
	return &list, nil
}

func (r *AuditContextRepo) GetCardMeta(ctx context.Context, cardID uuid.UUID) (*models.Card, error) {
	var card models.Card
	if err := r.db.WithContext(ctx).
		Table("cards").
		Where("id = ? AND deleted_at IS NULL", cardID).
		First(&card).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "auditcontext: error fetching card meta")
	}
	return &card, nil
}

func (r *AuditContextRepo) GetChecklistMeta(ctx context.Context, checklistID uuid.UUID) (*models.Checklist, error) {
	var checklist models.Checklist
	if err := r.db.WithContext(ctx).
		Table("checklists").
		Where("id = ? AND deleted_at IS NULL", checklistID).
		First(&checklist).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "auditcontext: error fetching checklist meta")
	}
	return &checklist, nil
}

func (r *AuditContextRepo) GetWorkspaceMeta(ctx context.Context, workspaceID uuid.UUID) (*models.Workspace, error) {
	var workspace models.Workspace
	if err := r.db.WithContext(ctx).
		Table("workspaces").
		Where("id = ? AND deleted_at IS NULL", workspaceID).
		First(&workspace).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "auditcontext: error fetching workspace meta")
	}
	return &workspace, nil
}

func (r *AuditContextRepo) GetUserBoardsByBoardID(ctx context.Context, boardID uuid.UUID) ([]*models.UserBoard, error) {
	var userBoards []*models.UserBoard
	if err := r.db.WithContext(ctx).
		Table("user_boards").
		Where("board_id = ? AND deleted_at IS NULL", boardID).
		Find(&userBoards).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "auditcontext: error fetching user boards by board ID")
	}
	return userBoards, nil
}

func (r *AuditContextRepo) GetBoardListsByBoardID(ctx context.Context, boardID uuid.UUID) ([]models.BoardList, error) {
	var boardLists []models.BoardList
	if err := r.db.WithContext(ctx).
		Table("board_lists").
		Where("board_id = ? AND deleted_at IS NULL", boardID).
		Order("pos COLLATE \"C\"").
		Find(&boardLists).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "auditcontext: error fetching board lists by board ID")
	}
	return boardLists, nil
}

func (r *AuditContextRepo) GetWorkspaceAdminOwnerUserIDs(ctx context.Context, workspaceID uuid.UUID) ([]uuid.UUID, error) {
	var userIDs []uuid.UUID
	if err := r.db.WithContext(ctx).
		Table("user_workspaces").
		Where("workspace_id = ? AND role IN ? AND deleted_at IS NULL", workspaceID, []string{"admin", "owner"}).
		Pluck("user_id", &userIDs).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "auditcontext: error fetching workspace admin/owner user IDs")
	}
	return userIDs, nil
}
