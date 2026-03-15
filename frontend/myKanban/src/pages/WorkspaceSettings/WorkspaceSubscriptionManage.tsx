import { LabeledButtonPresetA } from "@/components/buttons/labeledButton";
import { ProgressBar } from "@/components/common/progressBar";
import { useWorkspaceSubscriptionBilling } from "@/hooks/useWorkspaceSubscriptionBilling";
import { useDateTimeParser } from "@/hooks/useDateTimeParser";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useWsMembersStore } from "@/stores/wsMembersStore";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { useBoardsStore } from "@/stores/boardsStore";
import { ManagaeMembersAndBoards } from "./ManageMembersAndBoards";

export const WorkspaceSubscriptionManage = () => {

    const workspaceID = useParams().workspaceId as string;
    const subscription = useWorkspaceStore((state) => state.wSubscriptionsById[workspaceID]);
    const cancelWorkspaceSubscription = useWorkspaceStore((state) => state.cancelWorkspaceSubscription);
    const resumeWorkspaceSubscription = useWorkspaceStore((state) => state.resumeWorkspaceSubscription);
    const fetchWorkspaceSubscription = useWorkspaceStore((state) => state.fetchWorkspaceSubscription);
    const [isSubmittingSubscriptionChange, setIsSubmittingSubscriptionChange] = useState(false);

    useEffect(() => {
        fetchWorkspaceSubscription(workspaceID);
    }, [workspaceID]);
    const currentPlan = subscription?.Plan ?? "free";
    const cancelAtPeriodEnd = subscription?.CancelAtPeriodEnd ?? false;
    const pendingPlan = subscription?.PendingPlan;
    const pendingChangeEffectiveAt = subscription?.PendingChangeEffectiveAt ? new Date(subscription.PendingChangeEffectiveAt) : null;
    const expiryDate = subscription?.CurrentPeriodEnd ? new Date(subscription.CurrentPeriodEnd) : null;
    const formattedExpiryDate = expiryDate ? useDateTimeParser().stringifyDatePretty(expiryDate)?.date : "N/A";
    const formattedPendingChangeDate = pendingChangeEffectiveAt ? useDateTimeParser().stringifyDatePretty(pendingChangeEffectiveAt)?.date : "N/A";

    const membersIds = useWsMembersStore(useShallow((state) => state.userIdsByWorkspaceId[workspaceID] ?? []));
    const boardIds = useBoardsStore(useShallow((state) => state.boardIdsByWorkspaceId[workspaceID] ?? []));
    const usedBoards = boardIds.length;
    const usedSeats = membersIds.length;
    const {
        maxBoards,
        availableSeats,
        maxMembers,
        hasUnlimitedMembers,
        nextBillingAmount,
    } = useWorkspaceSubscriptionBilling({
        currentPlan,
        nextPlan: pendingPlan,
        currentMemberCount: usedSeats,
        availableSeats: subscription?.SeatQuantity,
    });
    const hasUnlimitedBoards = maxBoards < 0;
    const totalBoards = hasUnlimitedBoards ? usedBoards : maxBoards;
    let boardsPercentageUsed = totalBoards > 0 ? Math.round((usedBoards / totalBoards) * 100) : 0;
    if (boardsPercentageUsed > 100) boardsPercentageUsed = 100;

    const totalSeats = availableSeats ?? (hasUnlimitedMembers ? usedSeats : maxMembers);
    let percentageUsed = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;
    if (percentageUsed > 100) percentageUsed = 100;

    const isMembersOverLimit = usedSeats > totalSeats;
    const isBoardsOverLimit = !hasUnlimitedBoards && usedBoards > maxBoards;
    const outOfRangeBg = "!bg-yellow-600/70";
    const inRangeBg = "!bg-lime-500/50";
    const outOfRangeText = "text-yellow-400/60";
    const inRangeText = "text-lime-400/50";
    const membersProgressBarColor = isMembersOverLimit ? outOfRangeBg : inRangeBg;
    const boardsProgressBarColor = isBoardsOverLimit ? outOfRangeBg : inRangeBg;
    const progressBarHeight = "!h-2 !rounded-full"
    const canCancelSubscription = Boolean(subscription?.ProviderSubscriptionID) && !cancelAtPeriodEnd;
    const canResumeSubscription = Boolean(subscription?.ProviderSubscriptionID) && cancelAtPeriodEnd;

    const handleCancelSubscription = async () => {
        if (!canCancelSubscription || isSubmittingSubscriptionChange) {
            return;
        }
        try {
            setIsSubmittingSubscriptionChange(true);
            await cancelWorkspaceSubscription(workspaceID);
        } finally {
            setIsSubmittingSubscriptionChange(false);
        }
    };

    const handleResumeSubscription = async () => {
        if (!canResumeSubscription || isSubmittingSubscriptionChange) {
            return;
        }
        try {
            setIsSubmittingSubscriptionChange(true);
            await resumeWorkspaceSubscription(workspaceID);
        } finally {
            setIsSubmittingSubscriptionChange(false);
        }
    };

    const isGoingToDowngrade = pendingPlan && subscription && subscription.Plan !== pendingPlan && subscription.Plan !== "free" && pendingPlan !== "free";
    const isGoingToBeCanceled = cancelAtPeriodEnd && !pendingPlan;
    const resolvedNextDate = isGoingToDowngrade ? formattedPendingChangeDate : formattedExpiryDate;
    const nextBillingInfo = isGoingToDowngrade ? `Your plan will change to ${pendingPlan} on ${resolvedNextDate}.` :
        isGoingToBeCanceled ? `Your subscription will be canceled on ${resolvedNextDate}.` :
            `Your next billing date is on ${resolvedNextDate}.`;


    return (
        <div className="h-[80vh] w-full flex flex-col items-start justify-start gap-4 mt-8">
            <span className="text-sm text-neutral-300">Your current subscription plan details and billing information.</span>
            <div className="flex flex-col w-full items-start justify-start gap-2 scrollbar-hidden overflow-y-auto">

                <div className="h-fit relative w-full rounded-md ">
                    <div className=" relative flex flex-col items-start pe-6 ps-5 py-4 pt-6 gap-4 bg-slate-500/10 
                shadow-md shadow-black/10 overflow-hidden
                border border-neutral-700 rounded-2xl w-full">
                        <div className="absolute inset-0 z-10 rounded-2xl bg-gradient-to-r from-yellow-600/20 via-pink-600/20 to-purple-600/20 blur-lg opacity-50" />
                        <div className="flex flex-col items-start  gap-2 w-full">
                            <ProgressBar
                                containerClassName={`${progressBarHeight}`}
                                percentage={boardsPercentageUsed} barClassName={`${boardsProgressBarColor} ${progressBarHeight}`} />
                            <span className={`text-sm font-medium ${isBoardsOverLimit ? outOfRangeText : inRangeText}`}>
                                {usedBoards} of {hasUnlimitedBoards ? "Unlimited" : totalBoards} boards used ({boardsPercentageUsed}%)
                            </span>
                        </div>

                        <div className="flex flex-col items-start  gap-2 w-full">
                            <ProgressBar
                                containerClassName={`${progressBarHeight}`}
                                percentage={percentageUsed} barClassName={`${membersProgressBarColor} ${progressBarHeight}`} />
                            <span className={`text-sm font-medium ${isMembersOverLimit ? outOfRangeText : inRangeText}`}>
                                {usedSeats} of {totalSeats} seats used ({percentageUsed}%)
                            </span>
                        </div>
                    </div>
                </div>
                <div className="relative flex flex-col h-6 w-full my-5 items-center justify-center">
                    <div className="absolute z-20 h-px w-full place-self-stretch bg-neutral-300/20 " />
                </div>


                <div className="text-sm text-neutral-400">{nextBillingInfo}</div>


                {!isGoingToBeCanceled && <div className="flex flex-row items-center gap-2">
                    <span className="text-sm text-neutral-400">Next billing:</span>
                    <span className="text-sm text-neutral-300">${nextBillingAmount} USD/month</span>
                </div>}
                {false &&
                    <div className="pt-2">
                        <LabeledButtonPresetA
                            label={isSubmittingSubscriptionChange
                                ? (cancelAtPeriodEnd ? "Resuming..." : "Canceling...")
                                : (cancelAtPeriodEnd ? "Resume Subscription" : "Cancel Subscription")}
                            onClick={() => {
                                if (cancelAtPeriodEnd) {
                                    void handleResumeSubscription();
                                    return;
                                }
                                void handleCancelSubscription();
                            }}
                            disabled={isSubmittingSubscriptionChange || (!canCancelSubscription && !canResumeSubscription)}
                            className={`!rounded-xl ${(!canCancelSubscription && !canResumeSubscription) ? "opacity-50" : ""}`}
                        />
                    </div>}
                <ManagaeMembersAndBoards />
            </div>

        </div>
    )
}