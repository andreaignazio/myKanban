package sharelinks

import (
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GormShareLinksRepo struct {
	db *gorm.DB
}

func NewGormShareLinksRepo(db *gorm.DB) *GormShareLinksRepo {
	return &GormShareLinksRepo{db: db}
}

func (r *GormShareLinksRepo) CreateShareLink(ctx context.Context, shareLink *models.PublicShareLink) error {
	if err := r.db.WithContext(ctx).Create(shareLink).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormShareLinksRepo) GetShareLinkByToken(ctx context.Context, token string) (*models.PublicShareLink, error) {
	var shareLink models.PublicShareLink
	if err := r.db.WithContext(ctx).Where("token = ?", token).First(&shareLink).Error; err != nil {
		return nil, err
	}
	return &shareLink, nil
}

func (r *GormShareLinksRepo) RevokeShareLink(ctx context.Context, shareLink *models.PublicShareLink) error {

	if err := r.db.WithContext(ctx).Save(shareLink).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormShareLinksRepo) GetShareLinksByTargetID(ctx context.Context, targetID uuid.UUID, includeDeleted bool) ([]models.PublicShareLink, error) {
	var shareLinks []models.PublicShareLink
	query := r.db.WithContext(ctx).Where("target_id = ?", targetID)
	if !includeDeleted {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.Find(&shareLinks).Error; err != nil {
		return nil, err
	}
	return shareLinks, nil
}

func (r *GormShareLinksRepo) GetBoardByID(ctx context.Context, boardID uuid.UUID, includeDeleted bool) (*models.Board, error) {
	var board models.Board
	query := r.db.WithContext(ctx).Table("boards").Where("id = ?", boardID)
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.First(&board).Error; err != nil {
		return nil, err
	}
	return &board, nil
}

func (r *GormShareLinksRepo) GetWorkspaceByID(ctx context.Context, workspaceID uuid.UUID, includeDeleted bool) (*models.Workspace, error) {
	var workspace models.Workspace
	query := r.db.WithContext(ctx).Table("workspaces").Where("id = ?", workspaceID)
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

func (r *GormShareLinksRepo) GetUserBoardsByBoardID(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.UserBoard, error) {
	var userBoards []models.UserBoard
	query := r.db.WithContext(ctx).Table("user_boards").Where("board_id = ?", boardID)
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.Order("pos COLLATE \"C\"").Find(&userBoards).Error; err != nil {
		return nil, err
	}
	return userBoards, nil
}

func (r *GormShareLinksRepo) GetUserWorkspacesByWorkspaceID(ctx context.Context, workspaceID uuid.UUID, includeDeleted bool) ([]models.UserWorkspace, error) {
	var userWorkspaces []models.UserWorkspace
	query := r.db.WithContext(ctx).Table("user_workspaces").Where("workspace_id = ?", workspaceID)
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.Order("pos COLLATE \"C\"").Find(&userWorkspaces).Error; err != nil {
		return nil, err
	}
	return userWorkspaces, nil
}
