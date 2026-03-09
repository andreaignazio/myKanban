package models

import (
	"GoGORM/internal/rbac"
	"GoGORM/internal/subscriptionplan"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Workspace struct {
	ID                  uuid.UUID           `gorm:"type:uuid;primaryKey"`
	Name                string              `gorm:"size:255;not null"`
	CreatedByUserID     uuid.UUID           `gorm:"not null"`
	WorkspaceVisibility WorkspaceVisibility `gorm:"type:text;not null;default:'private'"`
	PublicToken         string              `gorm:"type:text;unique;index"`
	Props               datatypes.JSON      `gorm:"type:jsonb;default:'{}'"`
	TimeStamps
}

type UserWorkspace struct {
	ID               uuid.UUID `gorm:"type:uuid;primaryKey"`
	WorkspaceID      uuid.UUID `gorm:"type:uuid;not null;index"`
	UserID           uuid.UUID `gorm:"type:uuid;not null;index"`
	Pos              string    `gorm:"type:text;not null;index"`
	Role             rbac.Role `gorm:"type:text;not null"`
	IsSuspended      bool      `gorm:"type:boolean;not null;default:false"`
	IsPendingSuspend bool      `gorm:"type:boolean;not null;default:false"`
	TimeStamps
}

type WorkspaceSubscription struct {
	WorkspaceID uuid.UUID             `gorm:"type:uuid;primaryKey"`
	Plan        subscriptionplan.Plan `gorm:"type:text;not null;default:'free'"`   // free/pro/premium
	Status      string                `gorm:"type:text;not null;default:'none'"`   // none/trial/active/past_due/canceled
	Provider    string                `gorm:"type:text;not null;default:'stripe'"` // stripe/paypal

	ProviderCustomerID     *string `gorm:"type:text;"`
	ProviderSubscriptionID *string `gorm:"type:text;index"`
	ProviderScheduleID     *string `gorm:"type:text;index"`
	ProviderPriceID        *string `gorm:"type:text;"`

	SeatQuantity             int                    `gorm:"type:int;not null;default:0"`
	CancelAtPeriodEnd        bool                   `gorm:"type:boolean;not null;default:false"`
	PendingPlan              *subscriptionplan.Plan `gorm:"type:text;"`
	PendingSeatQuantity      *int                   `gorm:"type:int;"`
	PendingChangeEffectiveAt *time.Time             `gorm:"type:timestamp;"`

	CurrentPeriodStart  time.Time  `gorm:"type:timestamp;"`
	CurrentPeriodEnd    *time.Time `gorm:"type:timestamp;"`
	LastWebhookAt       *time.Time `gorm:"type:timestamp;"`
	LastProviderEventID *string    `gorm:"type:text;"`
	TimeStamps
}

type BillingWebhookEvent struct {
	ID            uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Provider      string     `gorm:"type:text;not null;index"`
	EventID       string     `gorm:"type:text;not null;index"`
	Payloadhash   string     `gorm:"type:text;not null;default:''"`
	Status        string     `gorm:"type:text;not null;default:'received'"`
	ProcessedAt   *time.Time `gorm:"type:timestamp;"`
	FailedAt      *time.Time `gorm:"type:timestamp;"`
	FailureReason *string    `gorm:"type:text;"`
	TimeStamps
}

type UserWorkspaceRow struct {
	WorkspaceID                          uuid.UUID           `gorm:"column:workspace_id"`
	WorkspaceName                        string              `gorm:"column:workspace_name"`
	WorkspaceCreatedByUserID             uuid.UUID           `gorm:"column:workspace_created_by_user_id"`
	WorkspaceVisibility                  WorkspaceVisibility `gorm:"column:workspace_visibility"`
	WorkspacePublicToken                 string              `gorm:"column:workspace_public_token"`
	WorkspaceProps                       datatypes.JSON      `gorm:"column:workspace_props"`
	WorkspaceCreatedAt                   time.Time           `gorm:"column:workspace_created_at"`
	WorkspaceUpdatedAt                   time.Time           `gorm:"column:workspace_updated_at"`
	WorkspaceDeletedAt                   gorm.DeletedAt      `gorm:"column:workspace_deleted_at"`
	UserWorkspaceID                      uuid.UUID           `gorm:"column:workspace_user_id"`
	UserWorkspaceWorkspaceID             uuid.UUID           `gorm:"column:workspace_user_workspace_id"`
	UserWorkspaceUserID                  uuid.UUID           `gorm:"column:workspace_user_user_id"`
	UserWorkspacePos                     string              `gorm:"column:workspace_user_pos"`
	UserWorkspaceRole                    string              `gorm:"column:workspace_user_role"`
	UserWorkspaceIsSuspended             bool                `gorm:"column:workspace_user_is_suspended"`
	UserWorkspaceIsPendingSuspend        bool                `gorm:"column:workspace_user_is_pending_suspend"`
	UserWorkspaceCreatedAt               time.Time           `gorm:"column:workspace_user_created_at"`
	UserWorkspaceUpdatedAt               time.Time           `gorm:"column:workspace_user_updated_at"`
	UserWorkspaceDeletedAt               gorm.DeletedAt      `gorm:"column:workspace_user_deleted_at"`
	SubscriptionWorkspaceID              *uuid.UUID          `gorm:"column:subscription_workspace_id"`
	SubscriptionPlan                     *string             `gorm:"column:subscription_plan"`
	SubscriptionStatus                   *string             `gorm:"column:subscription_status"`
	SubscriptionProvider                 *string             `gorm:"column:subscription_provider"`
	SubscriptionProviderCustomerID       *string             `gorm:"column:subscription_provider_customer_id"`
	SubscriptionProviderSubscriptionID   *string             `gorm:"column:subscription_provider_subscription_id"`
	SubscriptionProviderScheduleID       *string             `gorm:"column:subscription_provider_schedule_id"`
	SubscriptionProviderPriceID          *string             `gorm:"column:subscription_provider_price_id"`
	SubscriptionSeatQuantity             *int                `gorm:"column:subscription_seat_quantity"`
	SubscriptionCancelAtPeriodEnd        *bool               `gorm:"column:subscription_cancel_at_period_end"`
	SubscriptionPendingPlan              *string             `gorm:"column:subscription_pending_plan"`
	SubscriptionPendingSeatQuantity      *int                `gorm:"column:subscription_pending_seat_quantity"`
	SubscriptionPendingChangeEffectiveAt *time.Time          `gorm:"column:subscription_pending_change_effective_at"`
	SubscriptionCurrentPeriodStart       *time.Time          `gorm:"column:subscription_current_period_start"`
	SubscriptionCurrentPeriodEnd         *time.Time          `gorm:"column:subscription_current_period_end"`
	SubscriptionLastWebhookAt            *time.Time          `gorm:"column:subscription_last_webhook_at"`
	SubscriptionLastProviderEventID      *string             `gorm:"column:subscription_last_provider_event_id"`
	SubscriptionCreatedAt                *time.Time          `gorm:"column:subscription_created_at"`
	SubscriptionUpdatedAt                *time.Time          `gorm:"column:subscription_updated_at"`
	SubscriptionDeletedAt                *time.Time          `gorm:"column:subscription_deleted_at"`
}

func (r UserWorkspaceRow) ToWorkspaceAndUser() (Workspace, UserWorkspace) {
	role, ok := rbac.ParseRole(r.UserWorkspaceRole)
	if !ok {
		role = rbac.Viewer
	}

	workspace := Workspace{
		ID:                  r.WorkspaceID,
		Name:                r.WorkspaceName,
		CreatedByUserID:     r.WorkspaceCreatedByUserID,
		WorkspaceVisibility: r.WorkspaceVisibility,
		PublicToken:         r.WorkspacePublicToken,
		Props:               r.WorkspaceProps,
		TimeStamps: TimeStamps{
			CreatedAt: r.WorkspaceCreatedAt,
			UpdatedAt: r.WorkspaceUpdatedAt,
			DeletedAt: r.WorkspaceDeletedAt,
		},
	}

	userWorkspace := UserWorkspace{
		ID:               r.UserWorkspaceID,
		WorkspaceID:      r.UserWorkspaceWorkspaceID,
		UserID:           r.UserWorkspaceUserID,
		Pos:              r.UserWorkspacePos,
		Role:             role,
		IsSuspended:      r.UserWorkspaceIsSuspended,
		IsPendingSuspend: r.UserWorkspaceIsPendingSuspend,
		TimeStamps: TimeStamps{
			CreatedAt: r.UserWorkspaceCreatedAt,
			UpdatedAt: r.UserWorkspaceUpdatedAt,
			DeletedAt: r.UserWorkspaceDeletedAt,
		},
	}

	return workspace, userWorkspace
}
