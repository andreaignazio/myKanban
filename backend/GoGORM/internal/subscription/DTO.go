package subscription

import (
	"GoGORM/internal/dto"
	"GoGORM/internal/subscriptionplan"
)

type CreateSubscriptionRequest struct {
	PlanCode subscriptionplan.Plan `json:"planCode" validate:"required,oneof=free pro premium"`
	Seats    int                   `json:"seats" validate:"required,min=1"`
}

type RequestSubscriptionCheckout struct {
	PlanCode   subscriptionplan.Plan `json:"PlanCode"`
	Seats      int                   `json:"Seats"`
	SuccessUrl string                `json:"SuccessUrl"`
	CancelUrl  string                `json:"CancelUrl"`
}

type SubscriptionCheckoutResponse struct {
	Action       string                    `json:"Action"`
	CheckoutUrl  *string                   `json:"CheckoutUrl,omitempty"`
	SessionID    *string                   `json:"SessionID,omitempty"`
	Subscription *dto.SubscriptionResponse `json:"Subscription,omitempty"`
}
