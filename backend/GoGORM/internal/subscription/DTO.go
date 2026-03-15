package subscription

import (
	"GoGORM/internal/dto"
	"GoGORM/internal/subscriptionplan"

	"github.com/google/uuid"
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

type MemberSuspensionState struct {
	UserID           uuid.UUID `json:"UserID"`
	IsSuspended      bool      `json:"IsSuspended"`
	IsPendingSuspend bool      `json:"IsPendingSuspend"`
}

type BoardSuspensionState struct {
	BoardID          uuid.UUID `json:"BoardID"`
	IsSuspended      bool      `json:"IsSuspended"`
	IsPendingSuspend bool      `json:"IsPendingSuspend"`
}

type SubscriptionReconcileResponse struct {
	Subscription dto.SubscriptionResponse `json:"Subscription"`
	MemberStates []MemberSuspensionState  `json:"MemberStates"`
	BoardStates  []BoardSuspensionState   `json:"BoardStates"`
}

type ReplaceWorkspaceBoardSuspensionSelectionRequest struct {
	MarkedBoardIDs   []uuid.UUID `json:"MarkedBoardIDs"`
	UnmarkedBoardIDs []uuid.UUID `json:"UnmarkedBoardIDs"`
}

type ReplaceWorkspaceMemberSuspensionSelectionRequest struct {
	MarkedUserIDs   []uuid.UUID `json:"MarkedUserIDs"`
	UnmarkedUserIDs []uuid.UUID `json:"UnmarkedUserIDs"`
}
