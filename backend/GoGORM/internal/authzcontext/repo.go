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
