package subscription

import (
	"GoGORM/internal/domainerr"
	"GoGORM/models"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v84"
	checkoutsession "github.com/stripe/stripe-go/v84/checkout/session"
	"github.com/stripe/stripe-go/v84/webhook"
)

type StripeProvider struct {
	SecretKey     string
	WebhookSecret string
	//PriceByPlan   map[string]models.SubscriptionPlan
}

func NewStripeProvider(secretKey, webhookSecret string, priceByPlan map[string]models.SubscriptionPlan) *StripeProvider {
	return &StripeProvider{
		SecretKey:     secretKey,
		WebhookSecret: webhookSecret,
		//PriceByPlan:   priceByPlan,
	}
}

func (p *StripeProvider) MapPlanToPriceId(plan models.SubscriptionPlan) string {
	switch plan {
	case models.FreePlan:
		return os.Getenv("STRIPE_PRICE_FREE_ID")
	case models.ProPlan:
		return os.Getenv("STRIPE_PRICE_PRO_ID")
	case models.PremiumPlan:
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

		plan, ok := models.ParseSubscriptionPlan(planStr)
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

	default:
		fmt.Println("Received unsupported event type:", event.Type)
		return nil, nil
	}
}
