package subscription

import (
	"GoGORM/internal/dto"
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
		fmt.Println("Invalid workspace ID:", err)
		return
	}
	userID := c.MustGet("userID").(uuid.UUID)
	var req RequestSubscriptionCheckout
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteParamsError(c, err, "subscription.handler.StartCheckoutForWorkspace")
		fmt.Println("Invalid request body:", err)
		return
	}
	response, err := h.Service.StartCheckoutForWorkspace(ctx, workspaceID, userID, &req)
	if err != nil {
		httperr.WriteOp(c, err, "subscription.handler.StartCheckoutForWorkspace")
		fmt.Println("Error starting checkout for workspace:", err)
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *SubscriptionHandler) CancelWorkspaceSubscription(c *gin.Context) {
	ctx := c.Request.Context()
	workspaceIDStr := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "subscription.handler.CancelWorkspaceSubscription")
		return
	}
	userID := c.MustGet("userID").(uuid.UUID)

	if h.Service == nil {
		httperr.WriteOp(c, errors.New("subscription service not configured"), "subscription.handler.CancelWorkspaceSubscription")
		return
	}

	if err := h.Service.CancelWorkspaceSubscription(ctx, workspaceID, userID); err != nil {
		httperr.WriteOp(c, err, "subscription.handler.CancelWorkspaceSubscription")
		return
	}

	subscription, err := h.Service.SubscriptionRepo.GetWorkspaceSubscription(ctx, workspaceID)
	if err != nil {
		httperr.WriteOp(c, err, "subscription.handler.CancelWorkspaceSubscription: fetch updated subscription")
		return
	}
	if subscription == nil {
		c.Status(http.StatusNoContent)
		return
	}

	c.JSON(http.StatusOK, dto.WorkspaceSubscriptionToResponse(subscription))
}

func (h *SubscriptionHandler) ResumeWorkspaceSubscription(c *gin.Context) {
	ctx := c.Request.Context()
	workspaceIDStr := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "subscription.handler.ResumeWorkspaceSubscription")
		return
	}
	userID := c.MustGet("userID").(uuid.UUID)

	if h.Service == nil {
		httperr.WriteOp(c, errors.New("subscription service not configured"), "subscription.handler.ResumeWorkspaceSubscription")
		return
	}

	if err := h.Service.ResumeWorkspaceSubscription(ctx, workspaceID, userID); err != nil {
		httperr.WriteOp(c, err, "subscription.handler.ResumeWorkspaceSubscription")
		return
	}

	subscription, err := h.Service.SubscriptionRepo.GetWorkspaceSubscription(ctx, workspaceID)
	if err != nil {
		httperr.WriteOp(c, err, "subscription.handler.ResumeWorkspaceSubscription: fetch updated subscription")
		return
	}
	if subscription == nil {
		c.Status(http.StatusNoContent)
		return
	}

	c.JSON(http.StatusOK, dto.WorkspaceSubscriptionToResponse(subscription))
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
	fmt.Printf("Processed Stripe webhook: type=%s event_id=%s workspace_id=%s subscription_id=%s\n",
		evt.EventType,
		evt.EventID,
		evt.WorkspaceID,
		evt.ProviderSubscriptionSnapshot.SubscriptionID,
	)

	c.Status(http.StatusOK)
}
