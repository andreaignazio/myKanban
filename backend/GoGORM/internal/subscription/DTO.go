package subscription

import "GoGORM/models"

type CreateSubscriptionRequest struct {
	PlanCode models.SubscriptionPlan `json:"planCode" validate:"required,oneof=free pro premium"`
	Seats    int                     `json:"seats" validate:"required,min=1"`
}

type RequestSubscriptionCheckout struct {
	PlanCode   models.SubscriptionPlan `json:"PlanCode"`
	Seats      int                     `json:"Seats"`
	SuccessUrl string                  `json:"SuccessUrl"`
	CancelUrl  string                  `json:"CancelUrl"`
}

type SubscriptionCheckoutResponse struct {
	CheckoutUrl string `json:"CheckoutUrl"`
	SessionID   string `json:"SessionID"`
}
