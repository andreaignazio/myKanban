package boards

import (
	"GoGORM/internal/dbx"
	"GoGORM/internal/domainerr"

	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GormBoardsRepo struct {
	db *gorm.DB
}

func NewGormBoardsRepo(db *gorm.DB) *GormBoardsRepo {
	return &GormBoardsRepo{db: db}
}

func (r *GormBoardsRepo) CreateBoardTX(ctx context.Context, db *gorm.DB, board *models.Board) error {

	if err := db.WithContext(ctx).
		Create(board).Error; err != nil {
		return dbx.WrapDBErr(err, "error creating board")
	}
	return nil
}

func (r *GormBoardsRepo) GetBoard(ctx context.Context, boardID uuid.UUID, includeDeleted bool) (*models.Board, error) {
	var board models.Board
	query := r.db.WithContext(ctx).Table("boards")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("boards.deleted_at IS NULL")
	}
	if err := query.
		Where("boards.id = ?", boardID).
		First(&board).Error; err != nil {
		return nil, err
	}
	return &board, nil
}

func (r *GormBoardsRepo) GetBoardByIDTX(ctx context.Context, tx *gorm.DB, boardID uuid.UUID, includeDeleted bool) (*models.Board, error) {
	board := &models.Board{}
	query := tx.WithContext(ctx).Table("boards")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("boards.deleted_at IS NULL")
	}

	if err := query.Where("boards.id = ?", boardID).Take(board).Error; err != nil {
		return nil, err
	}

	return board, nil
}

func (r *GormBoardsRepo) GetBoardsByIDs(ctx context.Context, boardIDs []uuid.UUID, includeDeleted bool) ([]models.Board, error) {
	if len(boardIDs) == 0 {
		return []models.Board{}, nil
	}
	boards := []models.Board{}
	query := r.db.WithContext(ctx).Table("boards")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("boards.deleted_at IS NULL")
	}
	if err := query.
		Where("boards.id IN ?", boardIDs).
		Find(&boards).Error; err != nil {
		return nil, err
	}
	return boards, nil
}

func (r *GormBoardsRepo) GetUserBoard(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (*UserBoardRow, error) {
	var boardRow UserBoardRow
	query := r.db.WithContext(ctx)
	if includeDeleted {
		query = query.Unscoped()
	}
	if !includeDeleted {
		query = query.Where("boards.deleted_at IS NULL").Where("ub.deleted_at IS NULL")
	}
	if err := query.
		Select(`
		boards.id AS board_id,
		boards.name AS board_name,
		boards.created_by_user_id AS board_created_by_user_id,
		boards.workspace_id AS board_workspace_id,
		boards.visibility AS board_visibility,
		boards.public_token AS board_public_token,
		boards.props AS board_props,
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
		Table("boards").
		Joins("JOIN user_boards ub ON ub.board_id = boards.id").
		Where("ub.user_id = ? AND ub.board_id = ?", userID, boardID).
		Order("ub.pos COLLATE \"C\"").
		Scan(&boardRow).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get boards")
	}
	return &boardRow, nil

}

func (r *GormBoardsRepo) GetUserBoards(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]UserBoardRow, error) {

	var boardsRows []UserBoardRow
	query := r.db.WithContext(ctx)
	if includeDeleted {
		query = query.Unscoped()
	}
	if !includeDeleted {
		query = query.Where("boards.deleted_at IS NULL").Where("ub.deleted_at IS NULL")
	}
	if err := query.
		Select(`
		boards.id AS board_id,
		boards.name AS board_name,
		boards.created_by_user_id AS board_created_by_user_id,
		boards.workspace_id AS board_workspace_id,
		boards.visibility AS board_visibility,
		boards.public_token AS board_public_token,
		boards.props AS board_props,
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
		Table("boards").
		Joins("JOIN user_boards ub ON ub.board_id = boards.id").
		Where("ub.user_id = ?", userID).
		Order("ub.pos COLLATE \"C\"").
		Scan(&boardsRows).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get boards")
	}

	return boardsRows, nil
}

func (r *GormBoardsRepo) PatchBoard(ctx context.Context, boardID uuid.UUID, payload UpdateBoardsInput) (*models.Board, error) {

	var board models.Board
	if err := r.db.WithContext(ctx).Table("boards").
		Where("boards.id = ?", boardID).
		Clauses(clause.Returning{}).
		Updates(&payload).
		Scan(&board).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error updating board")
	}

	return &board, nil

}

func (r *GormBoardsRepo) PatchUserBoardProps(ctx context.Context, userID, boardID uuid.UUID, payload UpdateUserBoardInput) (*models.UserBoard, error) {
	var relation models.UserBoard
	if err := r.db.WithContext(ctx).
		Table("user_boards").
		Where("user_id = ? AND board_id = ?", userID, boardID).
		Where("deleted_at IS NULL").
		Clauses(clause.Returning{}).
		Updates(&payload).
		Scan(&relation).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error updating user board props")
	}

	return &relation, nil
}

func (r *GormBoardsRepo) DeleteBoard(ctx context.Context, boardID uuid.UUID) error {
	tx := r.db.WithContext(ctx).
		Table("boards").
		Where("boards.id = ?", boardID).
		Delete(&models.Board{})

	if tx.Error != nil {
		return dbx.WrapDBErr(tx.Error, "error deleting")
	}

	if tx.RowsAffected == 0 {
		return domainerr.ErrNotFound
	}
	return nil
}

func (r *GormBoardsRepo) DeleteBoardTX(ctx context.Context, db *gorm.DB, boardID uuid.UUID) (*models.Board, error) {
	var board models.Board
	tx := db.WithContext(ctx).
		Table("boards").
		Clauses(clause.Returning{}).
		Where("id = ?", boardID).
		Delete(&board)

	if tx.Error != nil {
		return nil, dbx.WrapDBErr(tx.Error, "error deleting")
	}

	if tx.RowsAffected == 0 {
		return nil, domainerr.ErrNotFound
	}
	return &board, nil
}

func (r *GormBoardsRepo) RestoreBoardTX(ctx context.Context, db *gorm.DB, boardID uuid.UUID) (*models.Board, error) {
	var board models.Board
	tx := db.WithContext(ctx).
		Table("boards").
		Where("boards.id = ?", boardID).
		Unscoped().
		Update("deleted_at", nil).
		Clauses(clause.Returning{}).
		Scan(&board)

	if tx.Error != nil {
		return nil, dbx.WrapDBErr(tx.Error, "error restoring board")
	}

	if tx.RowsAffected == 0 {
		return nil, domainerr.ErrNotFound
	}
	return &board, nil
}

func (r *GormBoardsRepo) PurgeBoardTX(ctx context.Context, db *gorm.DB, boardID uuid.UUID) error {
	tx := db.WithContext(ctx).
		Table("boards").
		Where("boards.id = ?", boardID).
		Unscoped().
		Delete(&models.Board{})

	if tx.Error != nil {
		return dbx.WrapDBErr(tx.Error, "error purging board")
	}
	if tx.RowsAffected == 0 {
		return domainerr.ErrNotFound
	}
	return nil
}

func (r *GormBoardsRepo) GetUserBoardTX(ctx context.Context, db *gorm.DB, userID, boardID uuid.UUID, includeDeleted bool) (*models.UserBoard, error) {
	var boardRow models.UserBoard
	query := db.WithContext(ctx)
	if includeDeleted {
		query = query.Unscoped()
	}
	if !includeDeleted {
		query = query.Where("ub.deleted_at IS NULL")
	}
	if err := query.
		Table("user_boards ub").
		Where("ub.user_id = ? AND ub.board_id = ?", userID, boardID).
		First(&boardRow).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get user board")
	}
	return &boardRow, nil

}

func (r *GormBoardsRepo) PurgeUserBoardsByBoardIDTX(ctx context.Context, db *gorm.DB, boardID uuid.UUID, deleteUnscoped bool) error {
	tx := db.WithContext(ctx).
		Table("user_boards").
		Where("board_id = ?", boardID)
	if deleteUnscoped {
		tx = tx.Unscoped()
	}
	tx = tx.Delete(&models.UserBoard{})

	if tx.Error != nil {
		return dbx.WrapDBErr(tx.Error, "error purging user boards")
	}
	if tx.RowsAffected == 0 {
		return domainerr.ErrNotFound
	}
	return nil
}
