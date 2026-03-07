package userNotification

import (
	"GoGORM/internal/dto"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GormNotifcationRepo struct {
	db *gorm.DB
}

func NewGormNotificationRepo(db *gorm.DB) *GormNotifcationRepo {
	return &GormNotifcationRepo{db: db}
}

func (r *GormNotifcationRepo) GetUserNotifications(ctx context.Context, userID uuid.UUID) ([]dto.UserNotificationRow, error) {
	var notifications []dto.UserNotificationRow
	err := r.db.WithContext(ctx).
		Table("user_audit_notifications uan").
		Select("bae.*, uan.id AS notification_id, uan.read, uan.created_at AS notification_created_at, uan.updated_at AS notification_updated_at, uan.deleted_at AS notification_deleted_at").
		Joins("JOIN board_audit_events bae ON bae.id = uan.audit_id").
		Where("uan.user_id = ? AND uan.deleted_at IS NULL AND bae.deleted_at IS NULL", userID).
		Order("bae.created_at DESC").
		Find(&notifications).Error
	if err != nil {
		return nil, err
	}
	return notifications, nil
}

func (r *GormNotifcationRepo) GetEntitiesDetails(ctx context.Context, entitiesIdsMap map[string][]uuid.UUID) ([]models.Workspace, []models.Board, []models.List, []models.Card, error) {
	var workspaces []models.Workspace
	if len(entitiesIdsMap["workspace"]) > 0 {
		if err := r.db.WithContext(ctx).
			Table("workspaces").
			Where("id IN ? AND deleted_at IS NULL", entitiesIdsMap["workspace"]).
			Find(&workspaces).Error; err != nil {
			return nil, nil, nil, nil, err
		}
	}
	var boards []models.Board
	if len(entitiesIdsMap["board"]) > 0 {
		if err := r.db.WithContext(ctx).
			Table("boards").
			Where("id IN ? AND deleted_at IS NULL", entitiesIdsMap["board"]).
			Find(&boards).Error; err != nil {
			return nil, nil, nil, nil, err
		}
	}
	var lists []models.List
	if len(entitiesIdsMap["list"]) > 0 {
		if err := r.db.WithContext(ctx).
			Table("lists").
			Where("id IN ? AND deleted_at IS NULL", entitiesIdsMap["list"]).
			Find(&lists).Error; err != nil {
			return nil, nil, nil, nil, err
		}
	}
	var cards []models.Card
	if len(entitiesIdsMap["card"]) > 0 {
		if err := r.db.WithContext(ctx).
			Table("cards").
			Where("id IN ? AND deleted_at IS NULL", entitiesIdsMap["card"]).
			Find(&cards).Error; err != nil {
			return nil, nil, nil, nil, err
		}
	}
	return workspaces, boards, lists, cards, nil
}

func (r *GormNotifcationRepo) MarkNotifications(ctx context.Context, userID uuid.UUID, notificationIDs []uuid.UUID, read bool) error {
	return r.db.WithContext(ctx).
		Table("user_audit_notifications").
		Where("id IN ? AND user_id = ? AND deleted_at IS NULL", notificationIDs, userID).
		Updates(map[string]interface{}{
			"read": read,
		}).Error
}
