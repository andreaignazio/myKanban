import type { SubscriptionPlan, WorkspaceSubscription } from "@/stores/types"

export type { SubscriptionPlan } from "@/stores/types"

export type RequestSubscriptionCheckout = {
    PlanCode: SubscriptionPlan
    Seats: number
    SuccessUrl: string
    CancelUrl: string
}

export type SubscriptionCheckoutResponse = {
    Action: "checkout" | "updated" | "scheduled"
    CheckoutUrl?: string
    SessionID?: string
    Subscription?: WorkspaceSubscription
}
