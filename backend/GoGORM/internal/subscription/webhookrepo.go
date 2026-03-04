package subscription

import (
	"GoGORM/models"
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

type GormWebhookInboxRepo struct {
	db *gorm.DB
}

func NewGormWebhookInboxRepo(db *gorm.DB) *GormWebhookInboxRepo {
	return &GormWebhookInboxRepo{
		db: db,
	}
}

func (r *GormWebhookInboxRepo) TryAcquire(ctx context.Context, provider, eventID string) (bool, error) {
	rec := models.BillingWebhookEvent{
		ID:       uuid.New(),
		Provider: provider,
		EventID:  eventID,
		Status:   "received",
	}

	err := r.db.WithContext(ctx).Create(&rec).Error
	if err == nil {
		return true, nil
	}

	if isUniqueViolation(err) {
		return false, nil // già visto / già acquisito
	}

	return false, err
}

func isUniqueViolation(err error) bool {
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return true
	}

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}

	return strings.Contains(err.Error(), "SQLSTATE 23505")
}

func (r *GormWebhookInboxRepo) MarkProcessed(provider, eventID string, processedAt time.Time) error {
	return r.db.Model(&models.BillingWebhookEvent{}).
		Where("provider = ? AND event_id = ?", provider, eventID).
		Updates(map[string]interface{}{
			"processed_at": processedAt,
			"status":       "processed",
		}).Error
}
