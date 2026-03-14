package authzcontext

import (
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GormRepo struct {
	db *gorm.DB
}

func NewGormRepo(db *gorm.DB) *GormRepo {
	return &GormRepo{db: db}
}

type authzRepo interface {
	GetWorkspaceUserRole(workspaceID, userID uuid.UUID) (*models.UserWorkspace, error)
	GetWorkspaceSubscriptionPlan(workspaceID uuid.UUID) (*models.WorkspaceSubscription, error)
	GetBoardByID(boardID uuid.UUID) (*models.Board, error)
	GetBoardListByID(listID uuid.UUID) (*models.BoardList, error)
	GetUserBoard(userID, boardID uuid.UUID) (*models.UserBoard, error)
	GetBoardListByCardIDAndBoardID(cardID, boardID uuid.UUID) (*models.BoardList, error)
	GetBoardListByRootListCardIDAndBoardID(rootListCardID, boardID uuid.UUID) (*models.BoardList, error)
	GetInboxCardByCardID(ctx context.Context, userID, cardID uuid.UUID, includeDeleted bool) (*models.UserInboxCard, error)
	GetBoardListByListCardIDAndBoardID(ctx context.Context, listCardID, boardID uuid.UUID) (*models.BoardList, error)
	GetRootListCardByCardID(ctx context.Context, cardID uuid.UUID) (*models.ListCard, error)
	GetRootBoardListByListID(ctx context.Context, listID uuid.UUID) (*models.BoardList, error)
}

func (r *GormRepo) GetWorkspaceUserRole(workspaceID, userID uuid.UUID) (*models.UserWorkspace, error) {
	var userWorkspace models.UserWorkspace
	result := r.db.Where("workspace_id = ? AND user_id = ?", workspaceID, userID).First(&userWorkspace)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, result.Error
	}
	return &userWorkspace, nil
}

func (r *GormRepo) GetWorkspaceSubscriptionPlan(workspaceID uuid.UUID) (*models.WorkspaceSubscription, error) {
	var subscription models.WorkspaceSubscription
	result := r.db.Where("workspace_id = ?", workspaceID).First(&subscription)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, result.Error
	}
	return &subscription, nil
}

func (r *GormRepo) GetBoardByID(boardID uuid.UUID) (*models.Board, error) {
	var board models.Board
	result := r.db.Where("id = ?", boardID).First(&board)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, result.Error
	}
	return &board, nil
}

func (r *GormRepo) GetBoardListByID(listID uuid.UUID) (*models.BoardList, error) {
	var boardList models.BoardList
	result := r.db.Where("id = ?", listID).First(&boardList)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, result.Error
	}
	return &boardList, nil
}

func (r *GormRepo) GetUserBoard(userID, boardID uuid.UUID) (*models.UserBoard, error) {
	var userBoard models.UserBoard
	result := r.db.Where("user_id = ? AND board_id = ?", userID, boardID).First(&userBoard)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, result.Error
	}
	return &userBoard, nil
}

func (r *GormRepo) GetBoardListByCardIDAndBoardID(cardID, boardID uuid.UUID) (*models.BoardList, error) {
	var boardList models.BoardList
	result := r.db.Table("board_lists").
		Select("board_lists.*").
		Joins("join list_cards on list_cards.list_id = board_lists.list_id").
		Where("list_cards.card_id = ? AND board_lists.board_id = ?", cardID, boardID).
		Order("CASE WHEN board_lists.id = board_lists.root_id THEN 0 ELSE 1 END, board_lists.id").
		First(&boardList)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, result.Error
	}
	return &boardList, nil
}

func (r *GormRepo) GetBoardListByRootListCardIDAndBoardID(rootListCardID, boardID uuid.UUID) (*models.BoardList, error) {
	var boardList models.BoardList
	result := r.db.Table("board_lists").
		Select("board_lists.*").
		Joins("join list_cards on list_cards.list_id = board_lists.list_id").
		Where("list_cards.id = ? AND board_lists.board_id = ?", rootListCardID, boardID).
		Order("CASE WHEN board_lists.id = board_lists.root_id THEN 0 ELSE 1 END, board_lists.id").
		First(&boardList)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, result.Error
	}
	return &boardList, nil
}

func (r *GormRepo) GetInboxCardByCardID(ctx context.Context, userID, cardID uuid.UUID, includeDeleted bool) (*models.UserInboxCard, error) {
	var inboxCard models.UserInboxCard
	query := r.db.WithContext(ctx).Where("user_id = ? AND card_id = ?", userID, cardID)
	if !includeDeleted {
		query = query.Where("deleted_at IS NULL")
	}
	result := query.First(&inboxCard)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, result.Error
	}
	return &inboxCard, nil
}

func (r *GormRepo) GetBoardListByListCardIDAndBoardID(ctx context.Context, listCardID, boardID uuid.UUID) (*models.BoardList, error) {
	var boardList models.BoardList
	result := r.db.WithContext(ctx).Table("board_lists").
		Select("board_lists.*").
		Joins("join list_cards on list_cards.list_id = board_lists.list_id").
		Where("list_cards.id = ? AND board_lists.board_id = ?", listCardID, boardID).
		Order("CASE WHEN board_lists.id = board_lists.root_id THEN 0 ELSE 1 END, board_lists.id").
		First(&boardList)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, result.Error
	}
	return &boardList, nil
}

func (r *GormRepo) GetRootListCardByCardID(ctx context.Context, cardID uuid.UUID) (*models.ListCard, error) {
	var rootListCard models.ListCard
	result := r.db.WithContext(ctx).Table("list_cards").
		Select("list_cards.*").
		Joins("JOIN list_cards as lc2 on lc2.root_id = list_cards.id").
		Where("lc2.card_id = ? AND lc2.deleted_at IS NULL", cardID).
		First(&rootListCard)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, result.Error
	}
	return &rootListCard, nil
}

func (r *GormRepo) GetRootBoardListByListID(ctx context.Context, listID uuid.UUID) (*models.BoardList, error) {
	var boardList models.BoardList
	result := r.db.WithContext(ctx).Table("board_lists").
		Select("board_lists.*").
		Joins("JOIN board_lists as bl2 on bl2.root_id = board_lists.id").
		Where("bl2.list_id = ? AND bl2.deleted_at IS NULL", listID).
		First(&boardList)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, result.Error
	}
	return &boardList, nil
}
