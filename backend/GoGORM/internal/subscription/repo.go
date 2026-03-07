package subscription

import (
	"GoGORM/models"
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GormSubscriptionRepo struct {
	db *gorm.DB
}

func NewGormSubscriptionRepo(db *gorm.DB) *GormSubscriptionRepo {
	return &GormSubscriptionRepo{db: db}
}

func (r *GormSubscriptionRepo) GetWorkspaceSubscription(ctx context.Context, workspaceID uuid.UUID) (*models.WorkspaceSubscription, error) {
	var subscription models.WorkspaceSubscription
	if err := r.db.WithContext(ctx).Table("workspace_subscriptions").
		Where("workspace_id = ? AND deleted_at IS NULL AND status IN ('trial', 'active')", workspaceID).
		First(&subscription).Error; err != nil {
		return nil, err
	}
	return &subscription, nil
}

func (r *GormSubscriptionRepo) CountWorkspaceBoards(ctx context.Context, workspaceID uuid.UUID) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Table("boards").
		Where("workspace_id = ? AND deleted_at IS NULL", workspaceID).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *GormSubscriptionRepo) UpsertFromWebhook(ctx context.Context, tx *gorm.DB,
	workspaceID uuid.UUID, event BillingWebhookEvent) error {
	now := time.Now()
	periodStart := now

	status := string(event.ProviderSubscriptionSnapshot.Status)

	subscription := models.WorkspaceSubscription{
		WorkspaceID:            workspaceID,
		Plan:                   event.ProviderSubscriptionSnapshot.PlanCode,
		Status:                 status,
		Provider:               event.Provider,
		ProviderCustomerID:     &event.ProviderSubscriptionSnapshot.CustomerID,
		ProviderSubscriptionID: &event.ProviderSubscriptionSnapshot.SubscriptionID,
		ProviderPriceID:        &event.ProviderSubscriptionSnapshot.PriceID,
		SeatQuantity:           event.ProviderSubscriptionSnapshot.SeatQuantity,
		CancelAtPeriodEnd:      event.ProviderSubscriptionSnapshot.CancelAtPeriodEnd,
		CurrentPeriodStart:     periodStart,
		CurrentPeriodEnd:       event.ProviderSubscriptionSnapshot.CurrentPeriodEnd,
		LastWebhookAt:          &event.OccurredAt,
		LastProviderEventID:    strPtrOrNil(event.EventID),
	}
	err := tx.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "workspace_id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"plan",
				"status",
				"provider",
				"provider_customer_id",
				"provider_subscription_id",
				"provider_price_id",
				"seat_quantity",
				"cancel_at_period_end",
				"current_period_start",
				"current_period_end",
				"last_webhook_at",
				"last_provider_event_id",
				"updated_at",
			}),
		}).
		Create(&subscription).
		Error
	return err
}

func strPtrOrNil(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
