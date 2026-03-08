import { LabeledButtonPresetA } from "@/components/buttons/labeledButton";
import { ProgressBar } from "@/components/common/progressBar";
import { useWorkspaceSubscriptionBilling } from "@/hooks/useWorkspaceSubscriptionBilling";
import { useDateTimeParser } from "@/hooks/useDateTimeParser";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useWsMembersStore } from "@/stores/wsMembersStore";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { useBoardsStore } from "@/stores/boardsStore";

export const WorkspaceSubscriptionManage = () => {

    const workspaceID = useParams().workspaceId as string;
    const subscription = useWorkspaceStore((state) => state.wSubscriptionsById[workspaceID]);
    const cancelWorkspaceSubscription = useWorkspaceStore((state) => state.cancelWorkspaceSubscription);
    const resumeWorkspaceSubscription = useWorkspaceStore((state) => state.resumeWorkspaceSubscription);
    const [isSubmittingSubscriptionChange, setIsSubmittingSubscriptionChange] = useState(false);
    const currentPlan = subscription?.Plan ?? "free";
    const status = subscription?.Status ?? "inactive";
    const cancelAtPeriodEnd = subscription?.CancelAtPeriodEnd ?? false;
    const pendingPlan = subscription?.PendingPlan;
    const pendingSeatQuantity = subscription?.PendingSeatQuantity;
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
        shouldUpgrade,
    } = useWorkspaceSubscriptionBilling({
        currentPlan,
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
    const membersProgressBarColor = isMembersOverLimit ? "bg-red-400" : "bg-green-400";
    const boardsProgressBarColor = isBoardsOverLimit ? "bg-red-400" : "bg-green-400";
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



    return (
        <div className="h-full w-full flex flex-col items-start justify-start gap-4 mt-8">
            <span className="text-sm text-neutral-300">Your current subscription plan details and billing information.</span>
            <div className="flex flex-col w-full items-start justify-start gap-2">

                <div className="flex flex-col items-start pe-6 ps-5 py-4 pt-6 gap-4 bg-slate-500/10 
                shadow-md shadow-black/10
                border border-neutral-700 rounded-2xl w-full">
                    <div className="flex flex-col items-start   gap-2 w-full">
                        <ProgressBar
                            containerClassName={`${progressBarHeight}`}
                            percentage={boardsPercentageUsed} barClassName={`${boardsProgressBarColor} ${progressBarHeight}`} />
                        <span className={`text-sm font-medium ${isBoardsOverLimit ? "text-red-400" : "text-green-400"}`}>
                            {usedBoards} of {hasUnlimitedBoards ? "Unlimited" : totalBoards} boards used ({boardsPercentageUsed}%)
                        </span>
                    </div>

                    <div className="flex flex-col items-start  gap-2 w-full">
                        <ProgressBar
                            containerClassName={`${progressBarHeight}`}
                            percentage={percentageUsed} barClassName={`${membersProgressBarColor} ${progressBarHeight}`} />
                        <span className={`text-sm font-medium ${isMembersOverLimit ? "text-red-400" : "text-green-400"}`}>
                            {usedSeats} of {totalSeats} seats used ({percentageUsed}%)
                        </span>
                    </div>
                </div>


                <div className="flex flex-row items-center gap-2">
                    <span className="text-sm text-neutral-400">Status:</span>
                    <span className={`text-sm font-medium ${status === "active" ? "text-green-400" : "text-red-400"}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </div>
                <div className="flex flex-row items-center gap-2">
                    <span className="text-sm text-neutral-400">Cancel at period end:</span>
                    <span className={`text-sm font-medium ${cancelAtPeriodEnd ? "text-amber-300" : "text-neutral-300"}`}>
                        {cancelAtPeriodEnd ? "Yes" : "No"}
                    </span>
                </div>
                <div className="flex flex-row items-center gap-2">
                    <span className="text-sm text-neutral-400">Pending plan:</span>
                    <span className={`text-sm font-medium ${pendingPlan ? "text-amber-300" : "text-neutral-300"}`}>
                        {pendingPlan ? pendingPlan.charAt(0).toUpperCase() + pendingPlan.slice(1) : "None"}
                    </span>
                </div>
                <div className="flex flex-row items-center gap-2">
                    <span className="text-sm text-neutral-400">Pending seats:</span>
                    <span className="text-sm text-neutral-300">{pendingSeatQuantity ?? "None"}</span>
                </div>
                <div className="flex flex-row items-center gap-2">
                    <span className="text-sm text-neutral-400">Pending change effective:</span>
                    <span className="text-sm text-neutral-300">{pendingPlan ? formattedPendingChangeDate : "N/A"}</span>
                </div>
                <div className="flex flex-row items-center gap-2">
                    <span className="text-sm text-neutral-400">Expiry Date:</span>
                    <span className="text-sm text-neutral-300">{formattedExpiryDate}</span>
                </div>
                <div className="flex flex-row items-center gap-2">
                    <span className="text-sm text-neutral-400">Seats:</span>
                    <span className="text-sm text-neutral-300">{hasUnlimitedMembers ? "Unlimited" : totalSeats}</span>
                </div>
                <div className="flex flex-row items-center gap-2">
                    <span className="text-sm text-neutral-400">Next billing:</span>
                    <span className="text-sm text-neutral-300">${nextBillingAmount} USD/month</span>
                </div>
                <div className="flex flex-row items-center gap-2">
                    <span className="text-sm text-neutral-400">Should upgrade:</span>
                    <span className={`text-sm font-medium ${shouldUpgrade ? "text-red-400" : "text-green-400"}`}>
                        {shouldUpgrade ? "Yes" : "No"}
                    </span>
                </div>
                {shouldUpgrade ? (
                    <span className="text-sm text-red-400">
                        Current members exceed the maximum allowed by the {currentPlan} plan.
                    </span>
                ) : null}
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
                </div>
            </div>

        </div>
    )
}