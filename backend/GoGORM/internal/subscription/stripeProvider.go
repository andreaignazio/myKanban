package subscription

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/subscriptionplan"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v84"
	billingportalsession "github.com/stripe/stripe-go/v84/billingportal/session"
	checkoutsession "github.com/stripe/stripe-go/v84/checkout/session"
	stripesubscription "github.com/stripe/stripe-go/v84/subscription"
	subscriptionschedule "github.com/stripe/stripe-go/v84/subscriptionschedule"
	"github.com/stripe/stripe-go/v84/webhook"
)

type StripeProvider struct {
	SecretKey     string
	WebhookSecret string
	//PriceByPlan   map[string]subscriptionplan.Plan
}

func NewStripeProvider(secretKey, webhookSecret string, priceByPlan map[string]subscriptionplan.Plan) *StripeProvider {
	return &StripeProvider{
		SecretKey:     secretKey,
		WebhookSecret: webhookSecret,
		//PriceByPlan:   priceByPlan,
	}
}

func (p *StripeProvider) MapPlanToPriceId(plan subscriptionplan.Plan) string {
	switch plan {
	case subscriptionplan.Free:
		return os.Getenv("STRIPE_PRICE_FREE_ID")
	case subscriptionplan.Pro:
		return os.Getenv("STRIPE_PRICE_PRO_ID")
	case subscriptionplan.Premium:
		return os.Getenv("STRIPE_PRICE_PREMIUM_ID")
	default:
		return ""
	}
}

func (p *StripeProvider) CreateCheckoutSession(ctx context.Context, input CreateCheckoutSessionInput) (*CreateCheckoutSessionOutput, error) {

	priceId := p.MapPlanToPriceId(input.PlanCode)
	if priceId == "" {
		return nil, domainerr.ErrMissingPriceID
	}

	if input.SuccessURL == "" || input.CancelURL == "" {
		return nil, domainerr.ErrMissingUrl
	}

	if input.Seats <= 0 {
		return nil, domainerr.New(nil, "Seats must be greater than 0")
	}

	stripe.Key = p.SecretKey

	metadata := map[string]string{
		"workspace_id":  input.WorkspaceID.String(),
		"owner_user_id": input.UserID.String(),
		"plan":          string(input.PlanCode),
		"seats":         fmt.Sprintf("%d", input.Seats),
		"price_id":      priceId,
	}

	params := &stripe.CheckoutSessionParams{
		Mode:       stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		SuccessURL: stripe.String(input.SuccessURL),
		CancelURL:  stripe.String(input.CancelURL),

		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(priceId),
				Quantity: stripe.Int64(int64(input.Seats)),
			},
		},

		Metadata: metadata,

		SubscriptionData: &stripe.CheckoutSessionSubscriptionDataParams{
			Metadata: metadata,
		},

		ClientReferenceID: stripe.String(input.WorkspaceID.String()),
	}

	session, err := checkoutsession.New(params)
	if err != nil {
		return nil, domainerr.New(err, "failed to create checkout session")
	}
	if session == nil {
		return nil, domainerr.New(nil, "received nil session from Stripe")
	}
	output := &CreateCheckoutSessionOutput{
		SessionID:   session.ID,
		CheckoutUrl: session.URL,
	}

	return output, nil
}

func (p *StripeProvider) GetSubscriptionState(ctx context.Context, input GetSubscriptionStateInput) (*BillingWebhookEvent, error) {
	if input.SubscriptionID == "" {
		return nil, domainerr.New(nil, "missing provider subscription ID")
	}

	stripe.Key = p.SecretKey
	stripeSubscription, err := stripesubscription.Get(input.SubscriptionID, nil)
	if err != nil {
		return nil, domainerr.New(err, "failed to retrieve Stripe subscription state")
	}
	if stripeSubscription == nil {
		return nil, domainerr.New(nil, "received nil subscription from Stripe state retrieval")
	}

	eventType := input.EventType
	if eventType == "" {
		eventType = string(CustomerSubscriptionUpdated)
	}
	occurredAt := input.OccurredAt
	if occurredAt.IsZero() {
		occurredAt = time.Now()
	}

	return p.buildSubscriptionStateEvent(eventType, input.EventID, occurredAt, stripeSubscription)
}

func (p *StripeProvider) CreateSubscriptionUpdateConfirmationSession(ctx context.Context, input CreateSubscriptionUpdateConfirmationSessionInput) (*CreateCheckoutSessionOutput, error) {
	if input.CustomerID == "" {
		return nil, domainerr.New(nil, "missing provider customer ID")
	}
	if input.SubscriptionID == "" {
		return nil, domainerr.New(nil, "missing provider subscription ID")
	}
	if input.SuccessURL == "" || input.CancelURL == "" {
		return nil, domainerr.ErrMissingUrl
	}
	if input.SeatQuantity <= 0 {
		return nil, domainerr.New(nil, "Seats must be greater than 0")
	}

	priceID := p.MapPlanToPriceId(input.PlanCode)
	if priceID == "" {
		return nil, domainerr.ErrMissingPriceID
	}

	stripe.Key = p.SecretKey
	currentSubscription, err := stripesubscription.Get(input.SubscriptionID, nil)
	if err != nil {
		return nil, domainerr.New(err, "failed to retrieve Stripe subscription before creating hosted upgrade confirmation")
	}
	if currentSubscription == nil || currentSubscription.Items == nil || len(currentSubscription.Items.Data) == 0 || currentSubscription.Items.Data[0] == nil {
		return nil, domainerr.New(nil, "Stripe subscription missing line items")
	}

	item := currentSubscription.Items.Data[0]
	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(input.CustomerID),
		ReturnURL: stripe.String(input.CancelURL),
		FlowData: &stripe.BillingPortalSessionFlowDataParams{
			Type: stripe.String(string(stripe.BillingPortalSessionFlowTypeSubscriptionUpdateConfirm)),
			AfterCompletion: &stripe.BillingPortalSessionFlowDataAfterCompletionParams{
				Type: stripe.String("redirect"),
				Redirect: &stripe.BillingPortalSessionFlowDataAfterCompletionRedirectParams{
					ReturnURL: stripe.String(input.SuccessURL),
				},
			},
			SubscriptionUpdateConfirm: &stripe.BillingPortalSessionFlowDataSubscriptionUpdateConfirmParams{
				Subscription: stripe.String(input.SubscriptionID),
				Items: []*stripe.BillingPortalSessionFlowDataSubscriptionUpdateConfirmItemParams{
					{
						ID:       stripe.String(item.ID),
						Price:    stripe.String(priceID),
						Quantity: stripe.Int64(int64(input.SeatQuantity)),
					},
				},
			},
		},
	}

	portalConfigID := os.Getenv("STRIPE_BILLING_PORTAL_CONFIGURATION_ID")
	if portalConfigID != "" {
		params.Configuration = stripe.String(portalConfigID)
	}

	session, err := billingportalsession.New(params)
	if err != nil {
		return nil, domainerr.New(err, "failed to create Stripe hosted upgrade confirmation session")
	}
	if session == nil {
		return nil, domainerr.New(nil, "received nil billing portal session from Stripe")
	}

	return &CreateCheckoutSessionOutput{
		SessionID:   session.ID,
		CheckoutUrl: session.URL,
	}, nil
}

func (p *StripeProvider) CancelSubscription(ctx context.Context, subscriptionID string) (*BillingWebhookEvent, error) {
	if subscriptionID == "" {
		return nil, domainerr.New(nil, "missing provider subscription ID")
	}

	stripe.Key = p.SecretKey
	updatedSubscription, err := stripesubscription.Update(subscriptionID, &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(true),
	})
	if err != nil {
		return nil, domainerr.New(err, "failed to update Stripe subscription cancellation")
	}
	if updatedSubscription == nil {
		return nil, domainerr.New(nil, "received nil subscription from Stripe cancel update")
	}

	return p.buildSubscriptionStateEvent(string(CustomerSubscriptionUpdated), "", time.Now(), updatedSubscription)
}

func (p *StripeProvider) ResumeSubscription(ctx context.Context, subscriptionID string) (*BillingWebhookEvent, error) {
	if subscriptionID == "" {
		return nil, domainerr.New(nil, "missing provider subscription ID")
	}

	stripe.Key = p.SecretKey
	updatedSubscription, err := stripesubscription.Update(subscriptionID, &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(false),
	})
	if err != nil {
		return nil, domainerr.New(err, "failed to update Stripe subscription resume")
	}
	if updatedSubscription == nil {
		return nil, domainerr.New(nil, "received nil subscription from Stripe resume update")
	}

	return p.buildSubscriptionStateEvent(string(CustomerSubscriptionUpdated), "", time.Now(), updatedSubscription)
}

func (p *StripeProvider) ReleaseSubscriptionSchedule(ctx context.Context, scheduleID string) error {
	if scheduleID == "" {
		return nil
	}

	stripe.Key = p.SecretKey
	_, err := subscriptionschedule.Release(scheduleID, nil)
	if err != nil {
		return domainerr.New(err, "failed to release Stripe subscription schedule")
	}

	return nil
}

func (p *StripeProvider) ScheduleSubscriptionPlanChange(ctx context.Context, input ScheduleSubscriptionPlanChangeInput) (*ScheduleSubscriptionPlanChangeOutput, error) {
	if input.SubscriptionID == "" {
		return nil, domainerr.New(nil, "missing provider subscription ID")
	}
	if input.TargetSeatQuantity <= 0 {
		return nil, domainerr.New(nil, "target seat quantity must be greater than 0")
	}

	targetPriceID := p.MapPlanToPriceId(input.TargetPlanCode)
	if targetPriceID == "" {
		return nil, domainerr.ErrMissingPriceID
	}

	stripe.Key = p.SecretKey
	schedule, err := subscriptionschedule.New(&stripe.SubscriptionScheduleParams{
		FromSubscription: stripe.String(input.SubscriptionID),
	})
	if err != nil {
		return nil, domainerr.New(err, "failed to create Stripe subscription schedule")
	}
	if schedule == nil {
		return nil, domainerr.New(nil, "received nil subscription schedule from Stripe")
	}

	currentPhase, err := activeSchedulePhase(schedule)
	if err != nil {
		return nil, err
	}
	if len(currentPhase.Items) == 0 || currentPhase.Items[0] == nil || currentPhase.Items[0].Price == nil || currentPhase.Items[0].Price.ID == "" {
		return nil, domainerr.New(nil, "Stripe schedule missing current phase item price")
	}

	currentPriceID := currentPhase.Items[0].Price.ID
	if input.CurrentPriceID != "" {
		currentPriceID = input.CurrentPriceID
	}

	baseMetadata := make(map[string]string, len(input.Metadata))
	for key, value := range input.Metadata {
		baseMetadata[key] = value
	}

	updatedSchedule, err := subscriptionschedule.Update(schedule.ID, &stripe.SubscriptionScheduleParams{
		EndBehavior: stripe.String(string(stripe.SubscriptionScheduleEndBehaviorRelease)),
		Phases: []*stripe.SubscriptionSchedulePhaseParams{
			{
				StartDate: stripe.Int64(currentPhase.StartDate),
				EndDate:   stripe.Int64(currentPhase.EndDate),
				Items: []*stripe.SubscriptionSchedulePhaseItemParams{
					{
						Price:    stripe.String(currentPriceID),
						Quantity: stripe.Int64(int64(input.CurrentSeatQuantity)),
					},
				},
				Metadata: subscriptionMetadata(baseMetadata, input.WorkspaceID, input.CurrentPlanCode, input.CurrentSeatQuantity, currentPriceID),
			},
			{
				StartDate: stripe.Int64(currentPhase.EndDate),
				Items: []*stripe.SubscriptionSchedulePhaseItemParams{
					{
						Price:    stripe.String(targetPriceID),
						Quantity: stripe.Int64(int64(input.TargetSeatQuantity)),
					},
				},
				Metadata:          subscriptionMetadata(baseMetadata, input.WorkspaceID, input.TargetPlanCode, input.TargetSeatQuantity, targetPriceID),
				ProrationBehavior: stripe.String(string(stripe.SubscriptionSchedulePhaseProrationBehaviorNone)),
			},
		},
	})
	if err != nil {
		return nil, domainerr.New(err, "failed to update Stripe subscription schedule phases")
	}
	if updatedSchedule == nil {
		return nil, domainerr.New(nil, "received nil subscription schedule after update")
	}

	return &ScheduleSubscriptionPlanChangeOutput{
		ScheduleID:  updatedSchedule.ID,
		EffectiveAt: time.Unix(currentPhase.EndDate, 0),
	}, nil
}

func (p *StripeProvider) VerifyAndParseWebhook(ctx context.Context, rawBody []byte, signatureHeader string) (*BillingWebhookEvent, error) {

	//verify signature
	event, err := webhook.ConstructEvent(rawBody, signatureHeader, p.WebhookSecret)
	if err != nil {
		return nil, domainerr.Wrap(err, "failed to construct webhook event")
	}

	//parse event
	switch event.Type {
	case "checkout.session.completed":

		var checkoutSession stripe.CheckoutSession

		if err := json.Unmarshal(event.Data.Raw, &checkoutSession); err != nil {
			return nil, domainerr.Wrap(err, "failed to unmarshal checkout session from webhook event")
		}

		workspaceIDStr := checkoutSession.Metadata["workspace_id"]
		planStr := checkoutSession.Metadata["plan"]
		seatsStr := checkoutSession.Metadata["seats"]

		workspaceID, err := uuid.Parse(workspaceIDStr)
		if err != nil {
			return nil, domainerr.Wrap(err, "invalid workspace_id in webhook event metadata")
		}

		plan, ok := subscriptionplan.Parse(planStr)
		if !ok {
			return nil, domainerr.Wrap(fmt.Errorf("invalid plan: %s", planStr), "invalid plan in webhook event metadata")
		}

		seats := 1
		if seatsStr != "" {
			if n, err := strconv.Atoi(seatsStr); err == nil && n > 0 {
				seats = n
			}
		}

		priceID := checkoutSession.Metadata["price_id"]

		if checkoutSession.Subscription != nil && checkoutSession.Subscription.ID != "" {
			return p.GetSubscriptionState(ctx, GetSubscriptionStateInput{
				WorkspaceID:    workspaceID,
				SubscriptionID: checkoutSession.Subscription.ID,
				EventType:      string(event.Type),
				EventID:        event.ID,
				OccurredAt:     time.Unix(event.Created, 0),
			})
		}

		snapshot := ProviderSubscriptionSnapshot{
			CheckoutSessionID: checkoutSession.ID,
			CustomerID:        stripe.StringValue(&checkoutSession.Customer.ID),
			SubscriptionID:    stripe.StringValue(&checkoutSession.Subscription.ID),

			SeatQuantity: seats,
			PlanCode:     plan,
			PriceID:      priceID,

			Status: BillingStatusActive,
		}
		out := &BillingWebhookEvent{
			Provider:  "stripe",
			EventID:   event.ID,
			EventType: string(event.Type),

			OccurredAt:                   time.Unix(event.Created, 0),
			WorkspaceID:                  workspaceID,
			ProviderSubscriptionSnapshot: snapshot,
		}
		return out, nil

	case "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted":
		var stripeSubscription stripe.Subscription

		if err := json.Unmarshal(event.Data.Raw, &stripeSubscription); err != nil {
			return nil, domainerr.Wrap(err, "failed to unmarshal subscription from webhook event")
		}

		return p.buildSubscriptionStateEvent(string(event.Type), event.ID, time.Unix(event.Created, 0), &stripeSubscription)

	default:
		fmt.Println("Received unsupported event type:", event.Type)
		return nil, nil
	}
}

func (p *StripeProvider) mapPriceIDToPlan(priceID string) (subscriptionplan.Plan, bool) {
	if priceID == "" {
		return "", false
	}
	if id := os.Getenv("STRIPE_PRICE_FREE_ID"); id != "" && priceID == id {
		return subscriptionplan.Free, true
	}
	if id := os.Getenv("STRIPE_PRICE_PRO_ID"); id != "" && priceID == id {
		return subscriptionplan.Pro, true
	}
	if id := os.Getenv("STRIPE_PRICE_PREMIUM_ID"); id != "" && priceID == id {
		return subscriptionplan.Premium, true
	}
	return "", false
}

func (p *StripeProvider) buildSubscriptionStateEvent(eventType string, eventID string, occurredAt time.Time, stripeSubscription *stripe.Subscription) (*BillingWebhookEvent, error) {
	if stripeSubscription == nil {
		return nil, domainerr.New(nil, "missing subscription in webhook event")
	}

	workspaceIDStr := stripeSubscription.Metadata["workspace_id"]
	if workspaceIDStr == "" {
		return nil, domainerr.New(nil, "missing workspace_id in subscription webhook metadata")
	}

	workspaceID, err := uuid.Parse(workspaceIDStr)
	if err != nil {
		return nil, domainerr.Wrap(err, "invalid workspace_id in subscription webhook metadata")
	}

	planStr := stripeSubscription.Metadata["plan"]
	plan, ok := subscriptionplan.Parse(planStr)
	if !ok {
		return nil, domainerr.Wrap(fmt.Errorf("invalid plan: %s", planStr), "invalid plan in subscription webhook metadata")
	}

	seatQuantity := 1
	priceID := stripeSubscription.Metadata["price_id"]
	var currentPeriodStart *time.Time
	var currentPeriodEnd *time.Time
	if stripeSubscription.Items != nil && len(stripeSubscription.Items.Data) > 0 && stripeSubscription.Items.Data[0] != nil {
		item := stripeSubscription.Items.Data[0]
		if item.Quantity > 0 {
			seatQuantity = int(item.Quantity)
		}
		if item.Price != nil && item.Price.ID != "" {
			priceID = item.Price.ID
		}
		currentPeriodStart = stripeUnixPtr(item.CurrentPeriodStart)
		currentPeriodEnd = stripeUnixPtr(item.CurrentPeriodEnd)
	}
	// If the price on the subscription item maps to a known plan, use it.
	// This handles upgrades via the Billing Portal, which updates the price
	// on the subscription item but does NOT update the subscription metadata.
	if derivedPlan, ok := p.mapPriceIDToPlan(priceID); ok {
		plan = derivedPlan
	}

	snapshot := ProviderSubscriptionSnapshot{
		CustomerID:         stripeCustomerID(stripeSubscription.Customer),
		SubscriptionID:     stripeSubscription.ID,
		SeatQuantity:       seatQuantity,
		PlanCode:           plan,
		Status:             normalizeStripeSubscriptionStatus(stripeSubscription.Status),
		PriceID:            priceID,
		CancelAtPeriodEnd:  stripeSubscription.CancelAtPeriodEnd,
		CurrentPeriodStart: currentPeriodStart,
		CurrentPeriodEnd:   currentPeriodEnd,
	}

	return &BillingWebhookEvent{
		Provider:                     "stripe",
		EventID:                      eventID,
		EventType:                    eventType,
		OccurredAt:                   occurredAt,
		WorkspaceID:                  workspaceID,
		ProviderSubscriptionSnapshot: snapshot,
	}, nil
}

func stripeUnixPtr(value int64) *time.Time {
	if value <= 0 {
		return nil
	}
	timeValue := time.Unix(value, 0)
	return &timeValue
}

func stripeCustomerID(customer *stripe.Customer) string {
	if customer == nil {
		return ""
	}
	return customer.ID
}

func normalizeStripeSubscriptionStatus(status stripe.SubscriptionStatus) BillingStatus {
	switch status {
	case stripe.SubscriptionStatusTrialing:
		return BillingStatusTrialing
	case stripe.SubscriptionStatusPastDue:
		return BillingStatusPastDue
	case stripe.SubscriptionStatusCanceled:
		return BillingStatusCanceled
	case stripe.SubscriptionStatusIncomplete:
		return BillingStatusIncomplete
	case stripe.SubscriptionStatusActive:
		return BillingStatusActive
	default:
		return BillingStatus(status)
	}
}

func activeSchedulePhase(schedule *stripe.SubscriptionSchedule) (*stripe.SubscriptionSchedulePhase, error) {
	if schedule == nil {
		return nil, domainerr.New(nil, "missing Stripe subscription schedule")
	}
	if schedule.CurrentPhase != nil {
		for _, phase := range schedule.Phases {
			if phase == nil {
				continue
			}
			if phase.StartDate == schedule.CurrentPhase.StartDate && phase.EndDate == schedule.CurrentPhase.EndDate {
				return phase, nil
			}
		}
	}
	if len(schedule.Phases) == 0 || schedule.Phases[0] == nil {
		return nil, domainerr.New(nil, "Stripe subscription schedule missing phases")
	}
	return schedule.Phases[0], nil
}

func subscriptionMetadata(base map[string]string, workspaceID uuid.UUID, plan subscriptionplan.Plan, seats int, priceID string) map[string]string {
	metadata := make(map[string]string, len(base)+4)
	for key, value := range base {
		metadata[key] = value
	}
	metadata["workspace_id"] = workspaceID.String()
	metadata["plan"] = string(plan)
	metadata["seats"] = fmt.Sprintf("%d", seats)
	metadata["price_id"] = priceID
	return metadata
}
