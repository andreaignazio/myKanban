package subscription

import (
	"GoGORM/models"
	"time"

	"github.com/google/uuid"
)

func MaxBoardsForWorkspaceSubscription(plan models.SubscriptionPlan) int {
	switch plan {
	case models.FreePlan:
		return 5
	case models.ProPlan:
		return 15
	case models.PremiumPlan:
		return -1 // unlimited
	default:
		return 0
	}
}

func MaxMembersForWorkspaceSubscription(plan models.SubscriptionPlan) int {
	switch plan {
	case models.FreePlan:
		return 10
	case models.ProPlan:
		return 15
	case models.PremiumPlan:
		return -1 // unlimited
	default:
		return 0
	}
}

type BillingStatus string

const (
	BillingStatusTrialing   BillingStatus = "trialing"
	BillingStatusActive     BillingStatus = "active"
	BillingStatusPastDue    BillingStatus = "past_due"
	BillingStatusCanceled   BillingStatus = "canceled"
	BillingStatusIncomplete BillingStatus = "incomplete"
)

type ProviderEventTypes string

const (
	CheckoutSessionCompleted ProviderEventTypes = "checkout.session.completed"
)

type ProviderSubscriptionSnapshot struct {
	CheckoutSessionID string
	CustomerID        string
	SubscriptionID    string

	SeatQuantity int
	PlanCode     models.SubscriptionPlan
	Status       BillingStatus
	PriceID      string

	CancelAtPeriodEnd bool
	CurrentPeriodEnd  *time.Time
}

type BillingWebhookEvent struct {
	Provider  string
	EventID   string
	EventType string

	OccurredAt  time.Time
	WorkspaceID uuid.UUID

	ProviderSubscriptionSnapshot ProviderSubscriptionSnapshot
}

type CreateCheckoutSessionOutput struct {
	SessionID    string
	CheckoutUrl  string
	ClientSecret *string
	ExpiresAt    *time.Time
}

type CreateCheckoutSessionInput struct {
	WorkspaceID uuid.UUID
	UserID      uuid.UUID // utile per audit/metadata, opzionale
	PlanCode    models.SubscriptionPlan
	Seats       int

	SuccessURL string
	CancelURL  string
}
