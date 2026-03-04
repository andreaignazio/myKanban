package subscription

import (
	"GoGORM/internal/authz"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/rbac"
	"GoGORM/models"
	"context"
	"log"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SubscriptionService struct {
	db               *gorm.DB
	SubscriptionRepo SubscriptionRepo
	MembershipRepo   MembershipRepo
	BillingProvider  BillingProvider
	WebhookInboxRepo WebhookInboxRepo
	IncludeDeleted   bool
}

type SubscriptionRepo interface {
	GetDerivedUserLevel(ctx context.Context, userID uuid.UUID) (string, error)
	CountActiveUserWorkspaces(ctx context.Context, userID uuid.UUID) (int64, error)
	GetWorkspaceSubscription(ctx context.Context, workspaceID uuid.UUID) (*models.WorkspaceSubscription, error)
	CountWorkspaceBoards(ctx context.Context, workspaceID uuid.UUID) (int64, error)
	UpsertFromWebhook(ctx context.Context, tx *gorm.DB, workspaceID uuid.UUID, event BillingWebhookEvent) error
}

type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
	GetUserWorkspaceRole(ctx context.Context, userID, workspaceID uuid.UUID, includeDeleted bool) (string, error)
}

type BillingProvider interface {
	//EnsureProviderCustomer(ctx context.Context, workspaceID, ownerUserID uuid.UUID) (string, error)
	VerifyAndParseWebhook(ctx context.Context, rawBody []byte, signatureHeader string) (*BillingWebhookEvent, error)
	CreateCheckoutSession(ctx context.Context, input CreateCheckoutSessionInput) (*CreateCheckoutSessionOutput, error)
}

type WebhookInboxRepo interface {
	TryAcquire(ctx context.Context, provider string, eventID string) (bool, error)
	MarkProcessed(provider string, eventID string, processedAt time.Time) error
	//MarkFailed(provider string, eventID string, failedAt time.Time, reason string) error
}

func NewSubscriptionService(
	db *gorm.DB,
	subscriptionRepo SubscriptionRepo,
	membershipRepo MembershipRepo,
	billingProvider BillingProvider,
	webhookInboxRepo WebhookInboxRepo,
	includeDeleted bool) *SubscriptionService {
	return &SubscriptionService{
		db:               db,
		SubscriptionRepo: subscriptionRepo,
		MembershipRepo:   membershipRepo,
		BillingProvider:  billingProvider,
		WebhookInboxRepo: webhookInboxRepo,
		IncludeDeleted:   includeDeleted,
	}
}

func (s *SubscriptionService) CheckWorkspaceMembershipLimit(ctx context.Context, userID uuid.UUID) (bool, error) {
	active, err := s.SubscriptionRepo.CountActiveUserWorkspaces(ctx, userID)
	if err != nil {
		return false, err
	}
	userLevel, err := s.SubscriptionRepo.GetDerivedUserLevel(ctx, userID)
	if err != nil {
		return false, err
	}
	maxWorkspaces := MaxWorkspacesForUserLevel(UserLevel(userLevel))
	if maxWorkspaces == -1 {
		return true, nil // unlimited
	}
	return int(active) < maxWorkspaces, nil
}

func (s *SubscriptionService) StartCheckoutForWorkspace(ctx context.Context, workspaceID, actorUserID uuid.UUID,
	req *RequestSubscriptionCheckout) (*SubscriptionCheckoutResponse, error) {
	if err := authz.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, actorUserID, workspaceID, rbac.Owner, s.IncludeDeleted); err != nil {
		return nil, err
	}
	input := CreateCheckoutSessionInput{
		WorkspaceID: workspaceID,
		UserID:      actorUserID,
		PlanCode:    req.PlanCode,
		Seats:       req.Seats,
		SuccessURL:  req.SuccessUrl,
		CancelURL:   req.CancelUrl,
	}

	output, err := s.BillingProvider.CreateCheckoutSession(ctx, input)
	if err != nil {
		return nil, err
	}

	response := &SubscriptionCheckoutResponse{
		SessionID:   output.SessionID,
		CheckoutUrl: output.CheckoutUrl,
	}

	return response, nil

}

func (s *SubscriptionService) HandleBillingWebhook(ctx context.Context,
	event BillingWebhookEvent) error {

	if event.EventID == "" || event.Provider == "" {
		return domainerr.New(nil, "invalid webhook event: missing provider or event ID")
	}

	//dedup events
	acquired, err := s.WebhookInboxRepo.TryAcquire(ctx, event.Provider, event.EventID)
	if err != nil {
		return domainerr.Wrap(err, "failed to acquire webhook event")
	}

	if !acquired {
		log.Printf("subscription webhook already processed, ignoring duplicate: provider=%s event_id=%s", event.Provider, event.EventID)
		return nil
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.SubscriptionRepo.UpsertFromWebhook(ctx, tx, event.WorkspaceID, event); err != nil {
			return domainerr.Wrap(err, "failed to upsert subscription from webhook")
		}
		if err := s.WebhookInboxRepo.MarkProcessed(event.Provider, event.EventID, time.Now()); err != nil {
			return domainerr.Wrap(err, "failed to mark webhook event as processed")
		}
		return nil
	})

	if err != nil {
		return domainerr.Wrap(err, "failed to process webhook event in transaction")
	}

	return nil
}

func (s *SubscriptionService) ChangeSeatQuantity(ctx context.Context, workspaceID uuid.UUID, actorUserID uuid.UUID, newSeats int) error {
	return nil
}

func (s *SubscriptionService) CancelWorkspaceSubscription(ctx context.Context, workspaceID uuid.UUID, actorUserID uuid.UUID) error {
	return nil
}
