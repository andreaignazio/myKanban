import {
    calculateSubscriptionNextBillingAmount,
    getSubscriptionMaxBoards,
    getSubscriptionMaxMembers,
    getSubscriptionPlanDefinition,
    isUnlimitedPlanLimit,
} from "@/domain/plans";
import type { SubscriptionPlan } from "@/stores/types";

type UseWorkspaceSubscriptionBillingArgs = {
    currentPlan?: SubscriptionPlan | null;
    currentMemberCount: number;
    availableSeats?: number | null;
}

export function useWorkspaceSubscriptionBilling({
    currentPlan = "free",
    currentMemberCount,
    availableSeats = null,
}: UseWorkspaceSubscriptionBillingArgs) {
    const resolvedPlan: SubscriptionPlan = currentPlan ?? "free";
    const normalizedMemberCount = Math.max(currentMemberCount, 0);
    const planDefinition = getSubscriptionPlanDefinition(resolvedPlan);
    const maxBoards = getSubscriptionMaxBoards(resolvedPlan);
    const maxMembers = getSubscriptionMaxMembers(resolvedPlan);
    const hasUnlimitedMembers = isUnlimitedPlanLimit(maxMembers);
    const nextBillingAmount = calculateSubscriptionNextBillingAmount(resolvedPlan, normalizedMemberCount);
    const shouldUpgrade = !hasUnlimitedMembers && normalizedMemberCount > maxMembers;
    const normalizedAvailableSeats = typeof availableSeats === "number" ? Math.max(availableSeats, 0) : null;

    return {
        currentPlan: resolvedPlan,
        currentMemberCount: normalizedMemberCount,
        availableSeats: normalizedAvailableSeats,
        planDefinition,
        maxBoards,
        maxMembers,
        hasUnlimitedMembers,
        nextBillingAmount,
        shouldUpgrade,
    };
}