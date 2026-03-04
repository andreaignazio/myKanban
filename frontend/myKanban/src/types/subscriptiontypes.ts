

export type RequestSubscriptionCheckout = {
    PlanCode: SubscriptionPlan
    Seats: number
    SuccessUrl: string
    CancelUrl: string
}

export type SubscriptionCheckoutResponse = {
    CheckoutUrl: string
    SessionID: string
}

export type SubscriptionPlan = "free" | "pro" | "premium"
