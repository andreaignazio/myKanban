package subscription

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	"GoGORM/internal/guard"
	"GoGORM/internal/rbac"
	"GoGORM/models"
	"context"
	"errors"
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
	GetWorkspaceSubscription(ctx context.Context, workspaceID uuid.UUID) (*models.WorkspaceSubscription, error)
	CountWorkspaceBoards(ctx context.Context, workspaceID uuid.UUID) (int64, error)
	UpsertFromWebhook(ctx context.Context, tx *gorm.DB, workspaceID uuid.UUID, event BillingWebhookEvent) error
	UpdatePendingChange(ctx context.Context, tx *gorm.DB, workspaceID uuid.UUID, pending PendingSubscriptionChange) error
	ClearPendingChange(ctx context.Context, tx *gorm.DB, workspaceID uuid.UUID) error
}

type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
	GetUserWorkspaceRole(ctx context.Context, userID, workspaceID uuid.UUID, includeDeleted bool) (string, error)
}

type BillingProvider interface {
	//EnsureProviderCustomer(ctx context.Context, workspaceID, ownerUserID uuid.UUID) (string, error)
	VerifyAndParseWebhook(ctx context.Context, rawBody []byte, signatureHeader string) (*BillingWebhookEvent, error)
	CreateCheckoutSession(ctx context.Context, input CreateCheckoutSessionInput) (*CreateCheckoutSessionOutput, error)
	CreateSubscriptionUpdateConfirmationSession(ctx context.Context, input CreateSubscriptionUpdateConfirmationSessionInput) (*CreateCheckoutSessionOutput, error)
	GetSubscriptionState(ctx context.Context, input GetSubscriptionStateInput) (*BillingWebhookEvent, error)
	CancelSubscription(ctx context.Context, subscriptionID string) (*BillingWebhookEvent, error)
	ResumeSubscription(ctx context.Context, subscriptionID string) (*BillingWebhookEvent, error)
	ScheduleSubscriptionPlanChange(ctx context.Context, input ScheduleSubscriptionPlanChangeInput) (*ScheduleSubscriptionPlanChangeOutput, error)
	ReleaseSubscriptionSchedule(ctx context.Context, scheduleID string) error
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
	return true, nil
}

func (s *SubscriptionService) StartCheckoutForWorkspace(ctx context.Context, workspaceID, actorUserID uuid.UUID,
	req *RequestSubscriptionCheckout) (*SubscriptionCheckoutResponse, error) {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, actorUserID, workspaceID, rbac.Owner, s.IncludeDeleted); err != nil {
		return nil, err
	}

	currentSubscription, err := s.SubscriptionRepo.GetWorkspaceSubscription(ctx, workspaceID)
	if err != nil {
		return nil, domainerr.Wrap(err, "failed to fetch workspace subscription")
	}

	if currentSubscription == nil || currentSubscription.ProviderSubscriptionID == nil || *currentSubscription.ProviderSubscriptionID == "" {
		return s.startNewCheckout(ctx, workspaceID, actorUserID, req)
	}

	comparison, ok := req.PlanCode.Compare(currentSubscription.Plan)
	if !ok {
		return nil, domainerr.New(nil, "invalid subscription plan transition")
	}
	isImmediateUpgrade := comparison > 0 || (comparison == 0 && req.Seats > currentSubscription.SeatQuantity)

	if req.PlanCode == currentSubscription.Plan && req.Seats == currentSubscription.SeatQuantity {
		if currentSubscription.ProviderScheduleID == nil || *currentSubscription.ProviderScheduleID == "" {
			return subscriptionActionResponse(SubscriptionActionUpdated, currentSubscription), nil
		}

		if err := s.BillingProvider.ReleaseSubscriptionSchedule(ctx, *currentSubscription.ProviderScheduleID); err != nil {
			return nil, domainerr.Wrap(err, "failed to release pending subscription schedule")
		}

		updatedSubscription, err := s.updatePendingChangeAndFetch(ctx, workspaceID, PendingSubscriptionChange{})
		if err != nil {
			return nil, err
		}

		return subscriptionActionResponse(SubscriptionActionUpdated, updatedSubscription), nil
	}

	if currentSubscription.ProviderScheduleID != nil && *currentSubscription.ProviderScheduleID != "" {
		if err := s.BillingProvider.ReleaseSubscriptionSchedule(ctx, *currentSubscription.ProviderScheduleID); err != nil {
			return nil, domainerr.Wrap(err, "failed to release existing subscription schedule")
		}
		if _, err := s.updatePendingChangeAndFetch(ctx, workspaceID, PendingSubscriptionChange{}); err != nil {
			return nil, err
		}
	}

	if isImmediateUpgrade {
		if currentSubscription.ProviderCustomerID == nil || *currentSubscription.ProviderCustomerID == "" {
			return nil, domainerr.New(nil, "workspace subscription missing provider customer ID")
		}

		portalSession, err := s.BillingProvider.CreateSubscriptionUpdateConfirmationSession(ctx, CreateSubscriptionUpdateConfirmationSessionInput{
			WorkspaceID:    workspaceID,
			CustomerID:     *currentSubscription.ProviderCustomerID,
			SubscriptionID: *currentSubscription.ProviderSubscriptionID,
			PlanCode:       req.PlanCode,
			SeatQuantity:   req.Seats,
			SuccessURL:     req.SuccessUrl,
			CancelURL:      req.CancelUrl,
		})
		if err != nil {
			return nil, domainerr.Wrap(err, "failed to create hosted upgrade confirmation session")
		}
		if portalSession == nil || portalSession.CheckoutUrl == "" {
			return nil, domainerr.New(nil, "billing provider returned empty hosted upgrade confirmation session")
		}

		return &SubscriptionCheckoutResponse{
			Action:      string(SubscriptionActionCheckout),
			SessionID:   strPtrOrNil(portalSession.SessionID),
			CheckoutUrl: strPtrOrNil(portalSession.CheckoutUrl),
		}, nil
	}

	if currentSubscription.CurrentPeriodEnd == nil {
		refreshedSubscription, err := s.refreshSubscriptionStateIfNeeded(ctx, workspaceID, currentSubscription)
		if err != nil {
			return nil, err
		}
		currentSubscription = refreshedSubscription
		if currentSubscription == nil || currentSubscription.CurrentPeriodEnd == nil {
			return nil, domainerr.New(nil, "current subscription is missing period end for scheduled downgrade")
		}
	}

	scheduleOutput, err := s.BillingProvider.ScheduleSubscriptionPlanChange(ctx, ScheduleSubscriptionPlanChangeInput{
		WorkspaceID:         workspaceID,
		SubscriptionID:      *currentSubscription.ProviderSubscriptionID,
		CurrentPlanCode:     currentSubscription.Plan,
		CurrentPriceID:      valueOrStringPtr(currentSubscription.ProviderPriceID),
		CurrentSeatQuantity: currentSubscription.SeatQuantity,
		TargetPlanCode:      req.PlanCode,
		TargetSeatQuantity:  req.Seats,
		Metadata: map[string]string{
			"workspace_id": workspaceID.String(),
		},
	})
	if err != nil {
		return nil, domainerr.Wrap(err, "failed to schedule provider subscription change")
	}
	if scheduleOutput == nil || scheduleOutput.ScheduleID == "" {
		return nil, domainerr.New(nil, "billing provider returned empty schedule response")
	}

	pendingPlan := req.PlanCode
	pendingSeats := req.Seats
	scheduleID := scheduleOutput.ScheduleID
	updatedSubscription, err := s.updatePendingChangeAndFetch(ctx, workspaceID, PendingSubscriptionChange{
		ProviderScheduleID:       &scheduleID,
		PendingPlan:              &pendingPlan,
		PendingSeatQuantity:      &pendingSeats,
		PendingChangeEffectiveAt: &scheduleOutput.EffectiveAt,
	})
	if err != nil {
		return nil, err
	}

	return subscriptionActionResponse(SubscriptionActionScheduled, updatedSubscription), nil
}

func (s *SubscriptionService) startNewCheckout(ctx context.Context, workspaceID, actorUserID uuid.UUID,
	req *RequestSubscriptionCheckout) (*SubscriptionCheckoutResponse, error) {
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
		Action:      string(SubscriptionActionCheckout),
		SessionID:   strPtrOrNil(output.SessionID),
		CheckoutUrl: strPtrOrNil(output.CheckoutUrl),
	}

	return response, nil
}

func (s *SubscriptionService) persistSubscriptionEventAndFetch(ctx context.Context, workspaceID uuid.UUID, event BillingWebhookEvent, clearPending bool) (*models.WorkspaceSubscription, error) {
	if event.WorkspaceID == uuid.Nil {
		event.WorkspaceID = workspaceID
	}
	if event.WorkspaceID != workspaceID {
		return nil, domainerr.Wrap(errors.New("provider workspace mismatch"), "subscription update returned mismatched workspace")
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.SubscriptionRepo.UpsertFromWebhook(ctx, tx, workspaceID, event); err != nil {
			return domainerr.Wrap(err, "failed to persist provider subscription state")
		}
		if clearPending {
			if err := s.SubscriptionRepo.ClearPendingChange(ctx, tx, workspaceID); err != nil {
				return domainerr.Wrap(err, "failed to clear pending subscription change")
			}
		}
		return nil
	}); err != nil {
		return nil, err
	}

	updatedSubscription, err := s.SubscriptionRepo.GetWorkspaceSubscription(ctx, workspaceID)
	if err != nil {
		return nil, domainerr.Wrap(err, "failed to fetch updated workspace subscription")
	}

	return updatedSubscription, nil
}

func (s *SubscriptionService) updatePendingChangeAndFetch(ctx context.Context, workspaceID uuid.UUID, pending PendingSubscriptionChange) (*models.WorkspaceSubscription, error) {
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		return s.SubscriptionRepo.UpdatePendingChange(ctx, tx, workspaceID, pending)
	}); err != nil {
		return nil, domainerr.Wrap(err, "failed to persist pending subscription change")
	}

	updatedSubscription, err := s.SubscriptionRepo.GetWorkspaceSubscription(ctx, workspaceID)
	if err != nil {
		return nil, domainerr.Wrap(err, "failed to fetch updated workspace subscription")
	}

	return updatedSubscription, nil
}

func (s *SubscriptionService) refreshSubscriptionStateIfNeeded(ctx context.Context, workspaceID uuid.UUID, currentSubscription *models.WorkspaceSubscription) (*models.WorkspaceSubscription, error) {
	if currentSubscription == nil || currentSubscription.CurrentPeriodEnd != nil {
		return currentSubscription, nil
	}
	if s.BillingProvider == nil {
		return currentSubscription, nil
	}
	if currentSubscription.ProviderSubscriptionID == nil || *currentSubscription.ProviderSubscriptionID == "" {
		return currentSubscription, nil
	}

	event, err := s.BillingProvider.GetSubscriptionState(ctx, GetSubscriptionStateInput{
		WorkspaceID:    workspaceID,
		SubscriptionID: *currentSubscription.ProviderSubscriptionID,
		EventType:      string(CustomerSubscriptionUpdated),
		OccurredAt:     time.Now(),
	})
	if err != nil {
		return nil, domainerr.Wrap(err, "failed to refresh provider subscription state")
	}
	if event == nil {
		return currentSubscription, nil
	}

	updatedSubscription, err := s.persistSubscriptionEventAndFetch(ctx, workspaceID, *event, false)
	if err != nil {
		return nil, err
	}

	return updatedSubscription, nil
}

func subscriptionActionResponse(action SubscriptionAction, subscription *models.WorkspaceSubscription) *SubscriptionCheckoutResponse {
	response := &SubscriptionCheckoutResponse{Action: string(action)}
	if subscription != nil {
		subscriptionDTO := dto.WorkspaceSubscriptionToResponse(subscription)
		response.Subscription = &subscriptionDTO
	}
	return response
}

func valueOrStringPtr(value *string) string {
	if value == nil {
		return ""
	}
	return *value
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
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, actorUserID, workspaceID, rbac.Owner, s.IncludeDeleted); err != nil {
		return err
	}

	currentSubscription, err := s.SubscriptionRepo.GetWorkspaceSubscription(ctx, workspaceID)
	if err != nil {
		return domainerr.Wrap(err, "failed to fetch workspace subscription")
	}
	if currentSubscription == nil {
		return domainerr.WithKind(domainerr.New(nil, "workspace subscription not found"), domainerr.ErrNotFound)
	}
	if currentSubscription.ProviderSubscriptionID == nil || *currentSubscription.ProviderSubscriptionID == "" {
		return domainerr.New(nil, "workspace subscription missing provider subscription ID")
	}
	if currentSubscription.CancelAtPeriodEnd {
		return nil
	}
	if s.BillingProvider == nil {
		return domainerr.New(nil, "billing provider not configured")
	}
	if err := s.releasePendingScheduleForDirectBillingChange(ctx, workspaceID, currentSubscription); err != nil {
		return err
	}

	event, err := s.BillingProvider.CancelSubscription(ctx, *currentSubscription.ProviderSubscriptionID)
	if err != nil {
		return domainerr.Wrap(err, "failed to cancel provider subscription")
	}
	if event == nil {
		return domainerr.New(nil, "billing provider returned empty cancel response")
	}
	if event.WorkspaceID == uuid.Nil {
		event.WorkspaceID = workspaceID
	}
	if event.WorkspaceID != workspaceID {
		return domainerr.Wrap(errors.New("provider workspace mismatch"), "cancel subscription returned mismatched workspace")
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.SubscriptionRepo.UpsertFromWebhook(ctx, tx, workspaceID, *event); err != nil {
			return domainerr.Wrap(err, "failed to persist canceled subscription state")
		}
		return nil
	}); err != nil {
		return domainerr.Wrap(err, "failed to cancel subscription in transaction")
	}

	return nil
}

func (s *SubscriptionService) ResumeWorkspaceSubscription(ctx context.Context, workspaceID uuid.UUID, actorUserID uuid.UUID) error {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, actorUserID, workspaceID, rbac.Owner, s.IncludeDeleted); err != nil {
		return err
	}

	currentSubscription, err := s.SubscriptionRepo.GetWorkspaceSubscription(ctx, workspaceID)
	if err != nil {
		return domainerr.Wrap(err, "failed to fetch workspace subscription")
	}
	if currentSubscription == nil {
		return domainerr.WithKind(domainerr.New(nil, "workspace subscription not found"), domainerr.ErrNotFound)
	}
	if currentSubscription.ProviderSubscriptionID == nil || *currentSubscription.ProviderSubscriptionID == "" {
		return domainerr.New(nil, "workspace subscription missing provider subscription ID")
	}
	if !currentSubscription.CancelAtPeriodEnd {
		return nil
	}
	if s.BillingProvider == nil {
		return domainerr.New(nil, "billing provider not configured")
	}
	if err := s.releasePendingScheduleForDirectBillingChange(ctx, workspaceID, currentSubscription); err != nil {
		return err
	}

	event, err := s.BillingProvider.ResumeSubscription(ctx, *currentSubscription.ProviderSubscriptionID)
	if err != nil {
		return domainerr.Wrap(err, "failed to resume provider subscription")
	}
	if event == nil {
		return domainerr.New(nil, "billing provider returned empty resume response")
	}
	if event.WorkspaceID == uuid.Nil {
		event.WorkspaceID = workspaceID
	}
	if event.WorkspaceID != workspaceID {
		return domainerr.Wrap(errors.New("provider workspace mismatch"), "resume subscription returned mismatched workspace")
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.SubscriptionRepo.UpsertFromWebhook(ctx, tx, workspaceID, *event); err != nil {
			return domainerr.Wrap(err, "failed to persist resumed subscription state")
		}
		return nil
	}); err != nil {
		return domainerr.Wrap(err, "failed to resume subscription in transaction")
	}

	return nil
}

func (s *SubscriptionService) releasePendingScheduleForDirectBillingChange(ctx context.Context, workspaceID uuid.UUID, currentSubscription *models.WorkspaceSubscription) error {
	if currentSubscription == nil || currentSubscription.ProviderScheduleID == nil || *currentSubscription.ProviderScheduleID == "" {
		return nil
	}

	if err := s.BillingProvider.ReleaseSubscriptionSchedule(ctx, *currentSubscription.ProviderScheduleID); err != nil {
		return domainerr.Wrap(err, "failed to release pending subscription schedule before direct billing change")
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		return s.SubscriptionRepo.ClearPendingChange(ctx, tx, workspaceID)
	}); err != nil {
		return domainerr.Wrap(err, "failed to clear pending subscription change before direct billing change")
	}

	currentSubscription.ProviderScheduleID = nil
	currentSubscription.PendingPlan = nil
	currentSubscription.PendingSeatQuantity = nil
	currentSubscription.PendingChangeEffectiveAt = nil

	return nil
}
