
type SbProps = {
    plan: string | (() => string)
    overrideSubscriptionClass?: string
    style?: React.CSSProperties
}

export function SubscriptionBadge({ plan, overrideSubscriptionClass, style }: SbProps) {
    const resolvedPlan = typeof plan === "function" ? plan() : plan;
    const subscriptionClass = overrideSubscriptionClass || getSubscriptionBadgeClass(resolvedPlan);
    return (
        <span style={style} className={`w-fit flex items-center justify-center rounded-md border px-2 py-1 pb-1.5 max-h-6 text-xs font-medium ${subscriptionClass}`}>
            {resolvedPlan.toUpperCase()}
        </span>
    )
}

function getSubscriptionBadgeClass(plan: string) {
    switch (plan) {
        case "free":
            return "border-gray-500 text-gray-500"
        case "pro":
            return "border-blue-500 text-blue-500"
        case "enterprise":
            return "border-green-500 text-green-500"
        default:
            return "border-gray-500 text-gray-500"
    }
}