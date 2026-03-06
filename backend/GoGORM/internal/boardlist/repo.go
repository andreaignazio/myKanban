package boardlist

import (
	"GoGORM/internal/dbx"
	"GoGORM/internal/models/boards"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BoardListRepo struct {
	db *gorm.DB
}

func NewBoardListRepo(db *gorm.DB) *BoardListRepo {
	return &BoardListRepo{db: db}
}

func (r *BoardListRepo) GetBoardListRows(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]boards.BoardListRow, error) {

	var boardListRows []boards.BoardListRow
	query := r.db.WithContext(ctx)
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("lists.deleted_at IS NULL").Where("bl.deleted_at IS NULL")
	}
	if err := query.
		Select(`
		lists.id AS list_id,
		lists.title AS list_title,
		lists.created_by_user_id AS list_created_by_user_id,
		lists.created_in_board_id AS list_created_in_board_id,
		lists.created_at AS list_created_at,
		lists.updated_at AS list_updated_at,
		lists.deleted_at AS list_deleted_at,
		bl.id AS bl_id,
		bl.list_id AS bl_list_id,
		bl.board_id AS bl_board_id,
		bl.pos AS bl_pos,
		bl.access_mode AS bl_access_mode,
		bl.created_at AS bl_created_at,
		bl.updated_at AS bl_updated_at,
		bl.deleted_at AS bl_deleted_at
		`).
		Table("lists").
		Joins("JOIN board_lists bl ON bl.list_id = lists.id").
		Where("bl.board_id = ?", boardID).
		Order("bl.pos COLLATE \"C\"").
		Scan(&boardListRows).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get lists")
	}
	return boardListRows, nil
}

func (r *BoardListRepo) GetBoardListsByListIDs(ctx context.Context, listIDs []uuid.UUID, includeDeleted bool) ([]models.BoardList, error) {
	if len(listIDs) == 0 {
		return []models.BoardList{}, nil
	}

	boardLists := []models.BoardList{}
	query := r.db.WithContext(ctx).Table("board_lists")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}

	if err := query.
		Where("list_id IN ?", listIDs).
		Order("board_id ASC, pos COLLATE \"C\"").
		Find(&boardLists).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get board_lists by list IDs")
	}

	return boardLists, nil
}

func (r *BoardListRepo) GetBoardList(ctx context.Context, boardID, listID uuid.UUID, includeDeleted bool) (*models.BoardList, error) {
	boardList := &models.BoardList{}
	query := r.db.WithContext(ctx).Table("board_lists")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}

	if err := query.
		Where("board_id = ? AND list_id = ?", boardID, listID).
		Take(boardList).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get board_list")
	}

	return boardList, nil
}

func (r *BoardListRepo) GetBoardListsByListIdsTX(ctx context.Context, tx *gorm.DB, listIDs []uuid.UUID, includeDeleted bool) ([]models.BoardList, error) {
	if len(listIDs) == 0 {
		return []models.BoardList{}, nil
	}
	boardLists := []models.BoardList{}
	query := tx.WithContext(ctx).Table("board_lists")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("list_id IN ?", listIDs).
		Order("board_id ASC, pos COLLATE \"C\"").
		Find(&boardLists).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get board_lists by list IDs TX")
	}
	return boardLists, nil
}

func (r *BoardListRepo) GetBoardListsByListIdTX(ctx context.Context, tx *gorm.DB, listID uuid.UUID, includeDeleted bool) ([]models.BoardList, error) {
	boardLists := []models.BoardList{}
	query := tx.WithContext(ctx).Table("board_lists")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}

	if err := query.
		Where("list_id = ?", listID).
		Order("created_at ASC").
		Find(&boardLists).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get board_lists by list_id")
	}

	return boardLists, nil
}
