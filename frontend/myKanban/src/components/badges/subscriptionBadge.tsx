
type SbProps = {
    plan: string | (() => string)
    overrideSubscriptionClass?: string
    className?: string
    style?: React.CSSProperties
    showNextPlan?: boolean
    nextPlan?: string
    nextDate?: string
    showBg?: boolean
}

export function SubscriptionBadge({ plan, nextPlan, nextDate, overrideSubscriptionClass, style, className, showNextPlan, showBg }: SbProps) {
    const resolvedPlan = typeof plan === "function" ? plan() : plan;
    const subscriptionClass = overrideSubscriptionClass || getSubscriptionBadgeClass(resolvedPlan, showBg);
    return (
        <span style={style} className={`w-fit flex items-center justify-center
         rounded-md border px-2 py-1 pb-1.5 max-h-6 text-xs font-medium ${subscriptionClass} ${className || ""}`}>
            {resolvedPlan.toUpperCase()}
            {showNextPlan && nextPlan && (

                <span className="ml-2 text-gray-400">→ {nextPlan.toUpperCase()}</span>

            )}
        </span>
    )
}

function getSubscriptionBadgeClass(plan: string, showBg: boolean = false): string {
    switch (plan) {
        case "free":
            if (showBg) {
                return "border-gray-500 bg-gray-500/20 text-gray-500"
            }
            return "border-gray-500 text-gray-500"
        case "pro":
            if (showBg) {
                return "border-blue-500 bg-blue-500/20 text-blue-500"
            }
            return "border-blue-500 text-blue-500"
        case "premium":
            if (showBg) {
                return "border-teal-500 bg-teal-500/20 text-teal-500"
            }
            return "border-teal-500 text-teal-500"
        default:
            return "border-gray-500 text-gray-500"
    }
}