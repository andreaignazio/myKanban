import { XMarkIcon } from "@heroicons/react/24/solid";
import { LabeledButtonPresetA } from "../buttons/labeledButton";
import { AsyncRequestOverlayGroups } from "../asyncRequestHandlers/asyncRequestOverlayA";
import { useAsyncRequestGroup } from "@/hooks/useAsyncRequestGroup";
import { useEffect, useState, type ReactNode } from "react";
import { getSubscriptionPlanDefinition, isUnlimitedPlanLimit } from "@/domain/plans";
import type { SubscriptionPlan } from "@/stores/types";
import { SubscriptionRequestContent, type SubscriptionRequestType } from "./SubscriptionRequestContent";
import { useDateTimeParser } from "@/hooks/useDateTimeParser";
import { Columns3, Users, ArrowRight, TrendingDown, TrendingUp } from "lucide-react";

type SubscriptionSummaryModalProps = {
    onClose?: () => void;
    onSubmit?: () => void;
    requestType: SubscriptionRequestType;
    targetPlan: SubscriptionPlan;
    currentPlan: SubscriptionPlan;
    memberCount: number;
    boardCount: number;
    nextBillingDate?: Date;
    useDelayedClose?: boolean;
}

export const SubscriptionSummaryModal = ({
    onClose, onSubmit, requestType, targetPlan, currentPlan, memberCount, boardCount, nextBillingDate, useDelayedClose = false
}: SubscriptionSummaryModalProps) => {
    const [shouldCloseAfterSuccess, setShouldCloseAfterSuccess] = useState(false)
    const { isLoading, isSuccessful } = useAsyncRequestGroup(["subscription:cancel", "subscription:checkout", "subscription:resume"])
    const dateParser = useDateTimeParser()

    const planDef = getSubscriptionPlanDefinition(targetPlan)
    const seats = Math.max(memberCount, 1)
    const totalPrice = planDef.pricePerMember * seats
    const formattedBillingDate = nextBillingDate ? dateParser.stringifyDatePretty(nextBillingDate, true)?.date : undefined

    const currentPlanDef = getSubscriptionPlanDefinition(currentPlan)

    const showPriceBreakdown = (requestType === "upgrade" || requestType === "downgrade" || requestType === "reactivate") && targetPlan !== "free"
    const showCancelInfo = requestType === "cancel"
    const showDiff = requestType === "downgrade" || requestType === "cancel"

    useEffect(() => {
        if (!useDelayedClose || !shouldCloseAfterSuccess || isLoading || !isSuccessful) return
        const id = window.setTimeout(() => {
            setShouldCloseAfterSuccess(false)
            onClose?.()
        }, 1500)
        return () => window.clearTimeout(id)
    }, [isLoading, isSuccessful, onClose, shouldCloseAfterSuccess, useDelayedClose])

    useEffect(() => {
        if (!shouldCloseAfterSuccess || isLoading || isSuccessful !== false) return
        setShouldCloseAfterSuccess(false)
    }, [isLoading, isSuccessful, shouldCloseAfterSuccess])

    const handleSubmit = () => {
        if (useDelayedClose) {
            setShouldCloseAfterSuccess(true)
        }
        onSubmit?.()
    }

    const submitLabel =
        requestType === "upgrade" ? `Confirm ${planDef.name}`
            : requestType === "downgrade" ? `Switch to ${planDef.name}`
                : requestType === "cancel" ? "Cancel subscription"
                    : requestType === "resume" ? "Resume subscription"
                        : requestType === "reactivate" ? "Reactivate"
                            : "Confirm"

    const actionLabel =
        requestType === "upgrade" ? `Upgrade to ${planDef.name}`
            : requestType === "downgrade" ? `Downgrade to ${planDef.name}`
                : requestType === "cancel" ? "Cancel your subscription"
                    : requestType === "resume" ? "Resume your subscription"
                        : requestType === "reactivate" ? "Reactivate scheduled change"
                            : ""

    return (
        <div className="relative flex flex-col w-[380px] h-fit p-6 gap-4">
            <AsyncRequestOverlayGroups requestGroups={[{
                requestKey: ["subscription:checkout", "subscription:cancel", "subscription:resume"],
                minLoadingMs: 500, minSuccessMs: 2000, maxErrorMs: 2000, show: ["loading", "success", "error"]
            }]} />

            <XMarkIcon
                onClick={onClose}
                className="h-8 aspect-square p-2 rounded-md absolute top-3 right-3 cursor-pointer text-neutral-400 hover:bg-neutral-300/10"
            />

            {/* Header */}
            <div className="px-1 flex flex-col gap-0.5 pr-8 mb-2">
                <h2 className=" text-xl font-bold text-neutral-200">{planDef.name} Plan</h2>
                <span className="text-xs text-neutral-500">{actionLabel}</span>
            </div>

            {/* Price breakdown */}
            {showPriceBreakdown && (
                <div className="flex flex-col gap-3 rounded-lg bg-zinc-800/60 border border-neutral-700/0 px-4 py-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-400">
                            ${planDef.pricePerMember} × {seats} member{seats !== 1 ? "s" : ""}
                        </span>
                        <span className="text-neutral-300 font-medium">${totalPrice}<span className="text-neutral-500 font-normal">/mo</span></span>
                    </div>
                    <div className="h-px bg-neutral-700/60 w-full" />
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-neutral-200">Next charge</span>
                            {formattedBillingDate && (
                                <span className="text-xs text-neutral-500">on {formattedBillingDate}</span>
                            )}
                        </div>
                        <span className="text-lg font-bold text-neutral-100">${totalPrice}<span className="text-sm font-normal text-neutral-400">/mo</span></span>
                    </div>
                </div>
            )}

            {/* Cancel info */}
            {showCancelInfo && (
                <div className="flex flex-col gap-1 rounded-md bg-neutral-800/60 border border-neutral-700/50 px-4 py-3">
                    <span className="text-sm font-semibold text-neutral-200">Cancels at end of billing period</span>
                    {formattedBillingDate
                        ? <span className="text-xs text-neutral-500">Your plan stays active until {formattedBillingDate}</span>
                        : <span className="text-xs text-neutral-500">Access continues until the end of the current period</span>
                    }
                </div>
            )}

            {/* Features summary */}
            <FeaturesSummary
                showDiff={showDiff}
                currentBoards={currentPlanDef.maxBoards}
                currentMembers={currentPlanDef.maxMembers}
                targetBoards={planDef.maxBoards}
                targetMembers={planDef.maxMembers}
            />

            {/* Overflow warning */}
            <SubscriptionRequestContent
                requestType={requestType}
                targetPlan={targetPlan}
                currentMemberCount={memberCount}
                currentBoardCount={boardCount}
            />

            {/* Disclaimer */}
            {showPriceBreakdown && (
                <p className="text-xs text-neutral-600 leading-5">
                    This is an estimate. The actual charge will reflect the number of active members at renewal.
                </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 w-full pt-1">
                <LabeledButtonPresetA
                    label="Cancel"
                    onClick={onClose ?? (() => { })}
                    className="flex-1 !h-9 !bg-neutral-700/40 hover:!bg-neutral-700/70 text-neutral-300 !font-medium"
                />
                <LabeledButtonPresetA
                    label={submitLabel}
                    onClick={handleSubmit}
                    className="flex-1 !h-9 !bg-[#669df1] hover:!bg-[#74a4ed] !text-neutral-900 !font-semibold"
                />
            </div>
        </div>
    )
}

type FeaturesSummaryProps = {
    showDiff: boolean;
    currentBoards: number;
    currentMembers: number;
    targetBoards: number;
    targetMembers: number;
}

const formatLimit = (val: number): ReactNode =>
    isUnlimitedPlanLimit(val)
        ? <span className="text-base font-normal leading-none">&infin;</span>
        : val

const FeaturesSummary = ({ showDiff, currentBoards, currentMembers, targetBoards, targetMembers }: FeaturesSummaryProps) => {
    const features: { icon: ReactNode; label: string; current: number; target: number }[] = [
        { icon: <Columns3 className="w-4 h-4" />, label: "Max Boards", current: currentBoards, target: targetBoards },
        { icon: <Users className="w-4 h-4" />, label: "Max Members", current: currentMembers, target: targetMembers },
    ]

    return (
        <div className="flex flex-col gap-1 rounded-lg bg-zinc-800/60 px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
                {showDiff
                    ? <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                    : <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                }
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {showDiff ? "What you'll lose" : "What you get"}
                </span>
            </div>
            {features.map((f) => {
                const isLoss = showDiff && (
                    (!isUnlimitedPlanLimit(f.current) && isUnlimitedPlanLimit(f.target)) ? false
                        : isUnlimitedPlanLimit(f.current) && !isUnlimitedPlanLimit(f.target) ? true
                            : f.target < f.current
                )
                return (
                    <div key={f.label} className={`flex items-center justify-between py-1 px-1 rounded-md ${isLoss ? "bg-rose-500/10" : ""}`}>
                        <div className="flex items-center gap-2 text-neutral-400">
                            {f.icon}
                            <span className="text-sm">{f.label}</span>
                        </div>
                        {showDiff ? (
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                                <span className="text-neutral-400">{formatLimit(f.current)}</span>
                                <ArrowRight className="w-3 h-3 text-neutral-600" />
                                <span className={isLoss ? "text-rose-400" : "text-neutral-300"}>{formatLimit(f.target)}</span>
                            </div>
                        ) : (
                            <span className="text-sm font-medium text-emerald-400">{formatLimit(f.target)}</span>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
