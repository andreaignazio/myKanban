import { getSubscriptionPlanDefinition, isUnlimitedPlanLimit } from "@/domain/plans";
import type { SubscriptionPlan } from "@/types/subscriptiontypes";

export type SubscriptionRequestType = "upgrade" | "downgrade" | "cancel" | "resume" | "reactivate";

type SubscriptionRequestContentProps = {
    requestType: SubscriptionRequestType;
    targetPlan?: SubscriptionPlan;
    currentMemberCount?: number;
    currentBoardCount?: number;
}

export const SubscriptionRequestContent = ({ requestType, targetPlan, currentMemberCount = 0, currentBoardCount = 0 }: SubscriptionRequestContentProps) => {
    if ((requestType !== "downgrade" && requestType !== "cancel") || !targetPlan) {
        return null;
    }

    const targetPlanDefinition = getSubscriptionPlanDefinition(targetPlan)
    const hasMemberOverflow = !isUnlimitedPlanLimit(targetPlanDefinition.maxMembers) && currentMemberCount > targetPlanDefinition.maxMembers
    const hasBoardOverflow = !isUnlimitedPlanLimit(targetPlanDefinition.maxBoards) && currentBoardCount > targetPlanDefinition.maxBoards

    if (!hasMemberOverflow && !hasBoardOverflow) {
        return null;
    }

    const hasCombinedOverflow = hasMemberOverflow && hasBoardOverflow

    return (
        <div className="w-full rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm leading-6 text-amber-100">
            {hasCombinedOverflow && (
                <p>
                    At the next renewal, this workspace will exceed the {targetPlanDefinition.name} plan limits for both members and boards. Memberships above the allowed capacity will be suspended, and boards above the allowed capacity will be temporarily locked until the workspace is brought back within plan capacity.
                </p>
            )}
            {hasMemberOverflow && !hasCombinedOverflow && (
                <p>
                    At the next renewal, this workspace will have {currentMemberCount} members while the {targetPlanDefinition.name} plan supports up to {targetPlanDefinition.maxMembers}. Members above the limit will be suspended until the workspace is brought back within plan capacity.
                </p>
            )}
            {hasBoardOverflow && !hasCombinedOverflow && (
                <p>
                    At the next renewal, this workspace will have {currentBoardCount} boards while the {targetPlanDefinition.name} plan supports up to {targetPlanDefinition.maxBoards}. Boards above the limit will be temporarily locked until the workspace is brought back within plan capacity.
                </p>
            )}
            <p className="mt-2 text-amber-200/90">
                You can review and manage affected items from the subscription manage page.
            </p>
        </div>
    )
}