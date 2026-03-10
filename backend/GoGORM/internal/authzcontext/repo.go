package authzcontext

import (
	"GoGORM/models"

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
		Joins("join list_cards on list_cards.list_id = board_lists.id").
		Where("list_cards.card_id = ? AND board_lists.board_id = ?", cardID, boardID).
		First(&boardList)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, result.Error
	}
	return &boardList, nil
}
