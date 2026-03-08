package subscription

import (
	"GoGORM/models"
	"context"
	"errors"
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
		Where("workspace_id = ? AND deleted_at IS NULL", workspaceID).
		First(&subscription).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
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
	if event.ProviderSubscriptionSnapshot.CurrentPeriodStart != nil {
		periodStart = *event.ProviderSubscriptionSnapshot.CurrentPeriodStart
	}

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
	clearPendingExpr := "((workspace_subscriptions.pending_plan IS NULL OR excluded.plan = workspace_subscriptions.pending_plan) AND (workspace_subscriptions.pending_seat_quantity IS NULL OR excluded.seat_quantity = workspace_subscriptions.pending_seat_quantity)) OR excluded.status IN ('canceled')"
	err := tx.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "workspace_id"}},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"plan":                        gorm.Expr("excluded.plan"),
				"status":                      gorm.Expr("excluded.status"),
				"provider":                    gorm.Expr("excluded.provider"),
				"provider_customer_id":        gorm.Expr("excluded.provider_customer_id"),
				"provider_subscription_id":    gorm.Expr("excluded.provider_subscription_id"),
				"provider_price_id":           gorm.Expr("excluded.provider_price_id"),
				"seat_quantity":               gorm.Expr("excluded.seat_quantity"),
				"cancel_at_period_end":        gorm.Expr("excluded.cancel_at_period_end"),
				"current_period_start":        gorm.Expr("excluded.current_period_start"),
				"current_period_end":          gorm.Expr("excluded.current_period_end"),
				"last_webhook_at":             gorm.Expr("excluded.last_webhook_at"),
				"last_provider_event_id":      gorm.Expr("excluded.last_provider_event_id"),
				"provider_schedule_id":        gorm.Expr("CASE WHEN " + clearPendingExpr + " THEN NULL ELSE workspace_subscriptions.provider_schedule_id END"),
				"pending_plan":                gorm.Expr("CASE WHEN " + clearPendingExpr + " THEN NULL ELSE workspace_subscriptions.pending_plan END"),
				"pending_seat_quantity":       gorm.Expr("CASE WHEN " + clearPendingExpr + " THEN NULL ELSE workspace_subscriptions.pending_seat_quantity END"),
				"pending_change_effective_at": gorm.Expr("CASE WHEN " + clearPendingExpr + " THEN NULL ELSE workspace_subscriptions.pending_change_effective_at END"),
				"updated_at":                  gorm.Expr("excluded.updated_at"),
			}),
		}).
		Create(&subscription).
		Error
	return err
}

func (r *GormSubscriptionRepo) UpdatePendingChange(ctx context.Context, tx *gorm.DB, workspaceID uuid.UUID, pending PendingSubscriptionChange) error {
	updates := map[string]interface{}{
		"provider_schedule_id":        pending.ProviderScheduleID,
		"pending_plan":                pending.PendingPlan,
		"pending_seat_quantity":       pending.PendingSeatQuantity,
		"pending_change_effective_at": pending.PendingChangeEffectiveAt,
		"updated_at":                  time.Now(),
	}

	return tx.WithContext(ctx).
		Table("workspace_subscriptions").
		Where("workspace_id = ? AND deleted_at IS NULL", workspaceID).
		Updates(updates).Error
}

func (r *GormSubscriptionRepo) ClearPendingChange(ctx context.Context, tx *gorm.DB, workspaceID uuid.UUID) error {
	return r.UpdatePendingChange(ctx, tx, workspaceID, PendingSubscriptionChange{})
}

func strPtrOrNil(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
