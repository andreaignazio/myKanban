package subscription

import (
	"GoGORM/internal/server/httperr"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SubscriptionHandler struct {
	Service         *SubscriptionService
	billingProvider BillingProvider
}

func NewSubscriptionHandler(service *SubscriptionService) *SubscriptionHandler {
	var billingProvider BillingProvider
	if service != nil {
		billingProvider = service.BillingProvider
	}
	return &SubscriptionHandler{
		Service:         service,
		billingProvider: billingProvider,
	}
}

func (h *SubscriptionHandler) StartCheckoutForWorkspace(c *gin.Context) {

	ctx := c.Request.Context()
	workspaceIDStr := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "subscription.handler.StartCheckoutForWorkspace")
		return
	}
	userID := c.MustGet("userID").(uuid.UUID)
	var req RequestSubscriptionCheckout
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "subscription.handler.StartCheckoutForWorkspace")
		return
	}
	response, err := h.Service.StartCheckoutForWorkspace(ctx, workspaceID, userID, &req)
	if err != nil {
		httperr.WriteOp(c, err, "subscription.handler.StartCheckoutForWorkspace")
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *SubscriptionHandler) HandleStripeBillingWebhook(c *gin.Context) {
	// Implementation will be added in the next steps

	ctx := c.Request.Context()

	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		httperr.WriteOp(c, err, "subscription.handler.HandleStripeBillingWebhook")
		fmt.Println("Error reading request body:", err)
		return
	}

	signature := c.GetHeader("Stripe-Signature")
	if signature == "" {
		httperr.WriteParamsError(c, nil, "subscription.handler.HandleStripeBillingWebhook: missing Stripe-Signature header")
		fmt.Println("Missing Stripe-Signature header")
		return
	}

	if h.billingProvider == nil {
		httperr.WriteOp(c, errors.New("billing provider not configured"), "subscription.handler.HandleStripeBillingWebhook")
		fmt.Println("Billing provider not configured")
		return
	}

	evt, err := h.billingProvider.VerifyAndParseWebhook(ctx, payload, signature)
	if err != nil {
		httperr.WriteOp(c, err, "subscription.handler.HandleStripeBillingWebhook: failed to verify and parse webhook")
		fmt.Println("Error verifying/parsing webhook:", err)
		return
	}

	if evt == nil {
		fmt.Println("Ignoring webhook event: unsupported or not actionable")
		c.Status(http.StatusOK)
		return
	}

	if h.Service == nil {
		httperr.WriteOp(c, errors.New("subscription service not configured"), "subscription.handler.HandleStripeBillingWebhook")
		fmt.Println("Subscription service not configured")
		return
	}

	if err := h.Service.HandleBillingWebhook(ctx, *evt); err != nil {
		httperr.WriteOp(c, err, "subscription.handler.HandleStripeBillingWebhook: failed to handle billing webhook")
		fmt.Println("Error handling billing webhook:", err)
		return
	}

	c.Status(http.StatusOK)
}
