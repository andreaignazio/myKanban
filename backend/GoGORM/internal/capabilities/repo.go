package capabilities

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GormCappabilitiesRepo struct {
	db *gorm.DB
}

func NewGormCapabilitiesRepo(db *gorm.DB) *GormCappabilitiesRepo {
	return &GormCappabilitiesRepo{db: db}
}

func (r *GormCappabilitiesRepo) CanEditCardInBoard(ctx context.Context, db *gorm.DB, userID, boardID, cardID uuid.UUID, roles []string, includeDeleted bool) (*bool, error) {
	var ok bool
	query := `
	SELECT EXISTS (
	SELECT 1
	FROM user_boards ub
	JOIN board_lists bl
	ON bl.board_id = ub.board_id
	JOIN list_cards lc
	ON lc.list_id = bl.list_id
	WHERE ub.user_id = ?
	AND bl.board_id = ?
	AND lc.card_id = ?
	AND ub.role IN ?
	`
	if !includeDeleted {
		query += `
	AND ub.deleted_at IS NULL
	AND bl.deleted_at IS NULL
	AND lc.deleted_at IS NULL
	`
	}
	query += `
	)
	`
	if err := db.Raw(query, userID, boardID, cardID, roles).
		Scan(&ok).Error; err != nil {
		return nil, err
	}
	return &ok, nil
}

func (r *GormCappabilitiesRepo) CanAccessListInBoard(ctx context.Context, db *gorm.DB,
	userID, boardID, listID uuid.UUID, roles []string, accessMode string, includeDeleted bool) (*bool, error) {

	var ok bool
	query := `
    SELECT EXISTS (
        SELECT 1
        FROM user_boards ub
        JOIN board_lists bl
            ON bl.board_id = ub.board_id
        WHERE ub.user_id = ?
        AND ub.board_id = ?
        AND bl.list_id = ?
        AND ub.role IN ?
        AND bl.access_mode = ?
    `
	if !includeDeleted {
		query += `
        AND ub.deleted_at IS NULL
        AND bl.deleted_at IS NULL
        `
	}
	query += `
    )
    `
	if err := db.Raw(query, userID, boardID, listID, roles, accessMode).
		Scan(&ok).Error; err != nil {
		return nil, err
	}
	return &ok, nil
}
