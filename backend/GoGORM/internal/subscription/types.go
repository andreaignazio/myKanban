package subscription

import (
	"GoGORM/internal/subscriptionplan"
	"GoGORM/models"
	"time"

	"github.com/google/uuid"
)

func MaxBoardsForWorkspaceSubscription(plan subscriptionplan.Plan) int {
	switch plan {
	case subscriptionplan.Free:
		return 5
	case subscriptionplan.Pro:
		return 15
	case subscriptionplan.Premium:
		return -1 // unlimited
	default:
		return 0
	}
}

func MaxMembersForWorkspaceSubscription(plan subscriptionplan.Plan) int {
	switch plan {
	case subscriptionplan.Free:
		return 10
	case subscriptionplan.Pro:
		return 15
	case subscriptionplan.Premium:
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
	CheckoutSessionCompleted    ProviderEventTypes = "checkout.session.completed"
	CustomerSubscriptionCreated ProviderEventTypes = "customer.subscription.created"
	CustomerSubscriptionUpdated ProviderEventTypes = "customer.subscription.updated"
	CustomerSubscriptionDeleted ProviderEventTypes = "customer.subscription.deleted"
)

type ProviderSubscriptionSnapshot struct {
	CheckoutSessionID string
	CustomerID        string
	SubscriptionID    string

	SeatQuantity int
	PlanCode     subscriptionplan.Plan
	Status       BillingStatus
	PriceID      string

	CancelAtPeriodEnd  bool
	CurrentPeriodStart *time.Time
	CurrentPeriodEnd   *time.Time
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

type SubscriptionAction string

const (
	SubscriptionActionCheckout  SubscriptionAction = "checkout"
	SubscriptionActionUpdated   SubscriptionAction = "updated"
	SubscriptionActionScheduled SubscriptionAction = "scheduled"
)

type StartSubscriptionResult struct {
	Action       SubscriptionAction
	CheckoutURL  *string
	SessionID    *string
	Subscription *models.WorkspaceSubscription
}

type UpdateSubscriptionPlanInput struct {
	WorkspaceID    uuid.UUID
	SubscriptionID string
	PlanCode       subscriptionplan.Plan
	SeatQuantity   int
}

type CreateSubscriptionUpdateConfirmationSessionInput struct {
	WorkspaceID    uuid.UUID
	CustomerID     string
	SubscriptionID string
	PlanCode       subscriptionplan.Plan
	SeatQuantity   int
	SuccessURL     string
	CancelURL      string
	PortalConfigID string
}

type GetSubscriptionStateInput struct {
	WorkspaceID    uuid.UUID
	SubscriptionID string
	EventType      string
	EventID        string
	OccurredAt     time.Time
}

type ScheduleSubscriptionPlanChangeInput struct {
	WorkspaceID         uuid.UUID
	SubscriptionID      string
	CurrentPlanCode     subscriptionplan.Plan
	CurrentPriceID      string
	CurrentSeatQuantity int
	TargetPlanCode      subscriptionplan.Plan
	TargetSeatQuantity  int
	Metadata            map[string]string
}

type ScheduleSubscriptionPlanChangeOutput struct {
	ScheduleID  string
	EffectiveAt time.Time
}

type PendingSubscriptionChange struct {
	ProviderScheduleID       *string
	PendingPlan              *subscriptionplan.Plan
	PendingSeatQuantity      *int
	PendingChangeEffectiveAt *time.Time
}

type WorkspaceBoardSuspensionCandidate struct {
	ID               uuid.UUID
	CreatedAt        time.Time
	IsSuspended      bool
	IsPendingSuspend bool
}

type WorkspaceMemberSuspensionCandidate struct {
	ID               uuid.UUID
	UserID           uuid.UUID
	Role             string
	CreatedAt        time.Time
	IsSuspended      bool
	IsPendingSuspend bool
}

type CreateCheckoutSessionInput struct {
	WorkspaceID uuid.UUID
	UserID      uuid.UUID // utile per audit/metadata, opzionale
	PlanCode    subscriptionplan.Plan
	Seats       int

	SuccessURL string
	CancelURL  string
}
