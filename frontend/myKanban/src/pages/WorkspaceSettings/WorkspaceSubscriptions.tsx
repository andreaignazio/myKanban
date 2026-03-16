import { LabeledButtonPresetA } from "@/components/buttons/labeledButton";
import { subscriptionPlans, type SubscriptionPlanDefinition } from "@/domain/plans";
import { useBoardsStore } from "@/stores/boardsStore";
import { useWorkspaceStore } from "@/stores/workspaceStore"
import { useWsMembersStore } from "@/stores/wsMembersStore";
import type { SubscriptionPlan } from "@/types/subscriptiontypes";
import { useParams } from "react-router"
import { useLocation, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react";
import { SubscriptionSuccessModal } from "@/components/modals/SubscriptionSuccessModal";
import { SubscriptionFailedModal } from "@/components/modals/SubscriptionFailedModal";
import { Columns3, Users } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useDateTimeParser } from "@/hooks/useDateTimeParser";
import { useUiStore, type DomainModalData } from "@/stores/uiStore";
import { SubscriptionSummaryModal } from "@/components/modals/SubscriptionSummaryModal";
import type { SubscriptionRequestType } from "@/components/modals/SubscriptionRequestContent"
import { useCurrentWorkspaceRole } from "@/hooks/useCurrentWorkspaceRole";


type SubscriptionFeature = {
    id: string;
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
}

const planRank: Record<SubscriptionPlan, number> = {
    free: 0,
    pro: 1,
    premium: 2,
}


export const WorkspaceSubscriptions = () => {
    const subscriptionUpgrader = useWorkspaceStore(state => state.createUpgradeSubscriptionRequest)
    const subscriptionCanceler = useWorkspaceStore(state => state.cancelWorkspaceSubscription)
    const subscriptionResumer = useWorkspaceStore(state => state.resumeWorkspaceSubscription)
    const setDomainModalOpen = useUiStore(state => state.setDomainModalOpen)
    const workspaceID = useParams().workspaceId || ""
    const { isAdminOrOwner } = useCurrentWorkspaceRole(workspaceID)
    const location = useLocation()
    const navigate = useNavigate()

    useEffect(() => {
        const { subscriptionSuccess, subscriptionFailed } = (location.state ?? {}) as Record<string, boolean>
        if (!subscriptionSuccess && !subscriptionFailed) return
        navigate(location.pathname, { replace: true, state: {} })
        const data: DomainModalData = {
            componentent: (onClose) => subscriptionSuccess
                ? <SubscriptionSuccessModal onClose={onClose} />
                : <SubscriptionFailedModal onClose={onClose} />,
            renderType: "virtual",
            virtual: "viewport-center",
            anchorRef: null,
            theme: "dark",
        }
        setDomainModalOpen(true, data)
    }, [])  // eslint-disable-line react-hooks/exhaustive-deps
    const membersIds = useWsMembersStore(useShallow((state) => state.userIdsByWorkspaceId[workspaceID] ?? []));
    const boardIds = useBoardsStore(useShallow((state) => state.boardIdsByWorkspaceId[workspaceID] ?? []));



    const subscription = useWorkspaceStore((state) => state.wSubscriptionsById[workspaceID]);
    const currentPlan = subscription?.Plan ?? "free";
    const pendingPlan = subscription?.PendingPlan ?? undefined;
    const cancelAtEnd = subscription?.CancelAtPeriodEnd ?? false;
    const resolvedPendingPlan = cancelAtEnd ? "free" : pendingPlan;
    const pendingDate = subscription?.PendingChangeEffectiveAt ? new Date(subscription.PendingChangeEffectiveAt) : undefined;
    const cancelAtEndDate = subscription?.CancelAtPeriodEnd ? new Date(subscription.CurrentPeriodEnd ?? "") : undefined;
    const resolvedDate = cancelAtEnd ? cancelAtEndDate : pendingDate;

    const formattedPendingDate = useDateTimeParser().stringifyDatePretty(resolvedDate)?.date || ""

    const canResume = subscription?.CancelAtPeriodEnd && subscription.Plan !== "free"
    const canReactivate = Boolean(subscription?.PendingPlan) && !canResume
    const executeSubscriptionUpgrade = async (plan: SubscriptionPlan) => {
        if (plan === currentPlan) {
            if (canResume) {
                await subscriptionResumer(workspaceID)
                return
            }
            if (canReactivate) {
                const seats = subscription?.SeatQuantity ?? Math.max(membersIds.length, 1)
                await subscriptionUpgrader(plan, seats, workspaceID)
            }
            return
        }
        if (plan === "free") {
            await subscriptionCanceler(workspaceID)
            return
        }
        const seats = Math.max(membersIds.length, 1)
        await subscriptionUpgrader(plan, seats, workspaceID)

    }

    const getSubscriptionRequestType = (plan: SubscriptionPlan): SubscriptionRequestType => {
        if (plan === currentPlan && canResume) {
            return "resume"
        }

        if (plan === currentPlan && canReactivate) {
            return "reactivate"
        }

        if (plan === "free") {
            return "cancel"
        }

        if (planRank[plan] < planRank[currentPlan]) {
            return "downgrade"
        }

        return "upgrade"
    }

    const handleSubscriptionUpgrade = (plan: SubscriptionPlan) => {
        const requestType = getSubscriptionRequestType(plan)
        const nextBillingDate = subscription?.CurrentPeriodEnd ? new Date(subscription.CurrentPeriodEnd) : undefined

        const data: DomainModalData = {
            componentent: (closeDomainModal) => (
                <SubscriptionSummaryModal
                    useDelayedClose={true}
                    onClose={closeDomainModal}
                    onSubmit={() => void executeSubscriptionUpgrade(plan)}
                    requestType={requestType}
                    targetPlan={plan}
                    currentPlan={currentPlan}
                    memberCount={membersIds.length}
                    boardCount={boardIds.length}
                    nextBillingDate={nextBillingDate}
                />
            ),
            renderType: "virtual",
            virtual: "viewport-center",
            anchorRef: null,
            theme: "dark",
        }

        setDomainModalOpen(true, data)
    }


    return (

        <div className="h-[80vh]  w-full flex flex-col items-start justify-start gap-4 mt-8">
            {false && (<span className="text-sm text-neutral-400 mt-6">
                This is the current workspace settings page.
                Here you can view and edit your current workspace settings.
            </span>)}



            {<SubscriptionUpgradeSection subscriptionTypes={subscriptionPlans} onUpgrade={handleSubscriptionUpgrade} currentPlan={currentPlan}
                canResume={canResume}
                canReactivate={canReactivate}
                resolvedPendingPlan={resolvedPendingPlan}
                pendingDate={formattedPendingDate}
                isAdminOrOwner={isAdminOrOwner}
            />}

        </div>

    )
}

type SubscriptionUpgradeSectionProps = {
    subscriptionTypes: SubscriptionPlanDefinition[];
    onUpgrade: (plan: SubscriptionPlan) => void;
    currentPlan: SubscriptionPlan;
    resolvedPendingPlan?: SubscriptionPlan;
    pendingDate?: string;
    canResume?: boolean;
    canReactivate?: boolean;
    isAdminOrOwner?: boolean;
}
const SubscriptionUpgradeSection = ({ subscriptionTypes, onUpgrade, currentPlan, resolvedPendingPlan, pendingDate, canResume, canReactivate, isAdminOrOwner }: SubscriptionUpgradeSectionProps) => {
    const [activeSubscription, setActiveSubscription] = useState<string>(currentPlan)

    useEffect(() => {
        setActiveSubscription(currentPlan)
    }, [currentPlan])

    return (
        <div className="w-full h-full scrollbar-hidden overflow-x-auto pt-4 pb-2 px-2">
            <div className="grid grid-cols-[repeat(3,minmax(240px,1fr))] w-full gap-0 place-content-start">
                {

                    subscriptionTypes.map((type) => (

                        <SubscriptionSection key={type.id} subscriptionType={type} isCurrent={type.id === currentPlan}
                            isPending={type.id === resolvedPendingPlan} pendingDate={pendingDate}
                            setActiveTab={setActiveSubscription} activeTab={activeSubscription} onUpgrade={onUpgrade} canResume={canResume} canReactivate={canReactivate} currentPlan={currentPlan} isAdminOrOwner={isAdminOrOwner} />

                    ))

                }
            </div>
        </div>
    )
}

type SubscriptionSectionProps = {
    subscriptionType: SubscriptionPlanDefinition;
    setActiveTab?: (tab: string) => void;
    activeTab?: string;
    onUpgrade: (plan: SubscriptionPlan) => void;

    isCurrent?: boolean;
    isPending?: boolean;
    pendingDate?: string;
    canResume?: boolean;
    canReactivate?: boolean;
    currentPlan: SubscriptionPlan;
    isAdminOrOwner?: boolean;
}
const SubscriptionSection = ({ subscriptionType, setActiveTab, activeTab, onUpgrade, isCurrent, isPending, pendingDate, canResume, canReactivate, currentPlan, isAdminOrOwner }: SubscriptionSectionProps) => {
    const { name, maxBoards, maxMembers, pricePerMember } = subscriptionType
    const isActive = activeTab === subscriptionType.id

    const priceTag = name === "Free" ? "Free forever" : "/per member"
    const isFree = name === "Free"
    const iconClass = "w-6 h-6";
    const isDowngrade = !isCurrent && !isPending && !isFree && planRank[subscriptionType.id] < planRank[currentPlan]

    const resolvedButtonState = isCurrent ? pendingDate ? canResume ? "resume" : "reactivate" : "current" : isPending ? "pending" : isFree ? "free" : isDowngrade ? "downgrade" : "upgrade"
    const capitalizedResolvedButtonState = resolvedButtonState.charAt(0).toUpperCase() + resolvedButtonState.slice(1)

    const unlimitedSymbol = <span className="text-xl -translate-y-0.5 font-normal">&infin;</span>

    const features: SubscriptionFeature[] = [
        {
            id: "boards", icon: <Columns3 className={iconClass} />, label: "Max Boards",
            value: maxBoards === -1 ? unlimitedSymbol : maxBoards
        },
        {
            id: "members", icon: <Users className={iconClass} />, label: "Max Members",
            value: maxMembers === -1 ? unlimitedSymbol : maxMembers
        },
    ]

    const resolvedClickable = isAdminOrOwner && (!isPending || canResume)
    const canReactivateCurrentPlan = Boolean(isCurrent && canReactivate)

    const resolvedDisable = !isAdminOrOwner || (!isActive || isPending || (isCurrent && (!canResume && !canReactivateCurrentPlan)))

    return (
        < div className=" relative h-full min-w-[200px] group
         col-span-1 flex flex-col gap-3     " >
            <div className="px-1 flex flex-col gap-3">
                <div
                    style={{ zIndex: 10 }}
                    className={`bg-main  rounded-md overflow-hidden
                    ${isActive ? "ring ring-[#ad5bdc]" : ""}
                    ${isCurrent && (!canResume && !canReactivateCurrentPlan) ? "ring-2 ring-[#669df1]" : ""}`}>
                    <div
                        onClick={() => {
                            if (!resolvedClickable) return
                            setActiveTab && setActiveTab(subscriptionType.id)
                        }}

                        className={` 
                    transition-all duration-300 ease-in-out relative
                     ${resolvedClickable
                                ? "cursor-pointer hover:bg-slate-500/20 hover:shadow-lg hover:shadow-black/30 "
                                : "cursor-default"}
                    relative flex flex-col rounded-md p-4 pt-6 pb-8 h-fit
                    
            ${isActive ? "bg-slate-500/20" : "bg-slate-500/10"}
            `}

                    >
                        <div

                            className="flex flex-col h-60">
                            <div className="text-center h-28">
                                <div className="text-xl text-center font-bold mb-3">{name}</div>
                                <span className="text-sm font-semibold tracking-tight">{subscriptionType.descriptionStrong}</span>
                                <div className="text-xs font-light text-neutral-400">{subscriptionType.description}</div>
                            </div>

                            <div className="  flex flex-col items-center mt-4">
                                <span className="text-2xl font-bold">${pricePerMember} USD</span>
                                <span className="text-xs font-normal text-neutral-400">{priceTag}</span>
                            </div>
                            {<LabeledButtonPresetA
                                label={capitalizedResolvedButtonState}
                                disabled={resolvedDisable}
                                className={` self-center mt-2 !font-medium !min-w-20
                        ${!resolvedDisable
                                        ? "!bg-[#669df1] hover:!bg-[#74a4ed] text-neutral-900"
                                        : "!bg-neutral-400/20  text-neutral-400 cursor-default"}`}
                                onClick={() => { void onUpgrade(subscriptionType.id) }} />}
                            <div className="h-px bg-neutral-400/20 w-full absolute bottom-0 left-0" />
                        </div>

                        <div

                            className="flex flex-col mt-3 gap-3">
                            {features.map((feature) => (
                                <div key={feature.id} className="grid grid-cols-[1fr_30px] gap-3 items-center h-8">
                                    <div className="col-span-1 flex items-center gap-2">
                                        {feature.icon}
                                        <span className="text-sm font-medium">{feature.label}: </span>
                                    </div>
                                    <span className="text-sm font-normal flex items-center text-neutral-400">{feature.value}</span>
                                </div>
                            ))}

                        </div>

                    </div>
                </div>
            </div>
            {isPending && pendingDate && (
                <div className="absolute  w-full h-full flex items-center justify-center">
                    <div
                        style={{ zIndex: 0 }}
                        className="-z-0 bg-yellow-500/50 rounded-md absolute h-[90px] w-[92%] -bottom-2 group-hover:-bottom-12 group-hover:bg-amber-500/80 
                        flex flex-col items-center justify-end pb-2
                        transition-all duration-300 ease-in-out" >
                        <span className="text-sm text-neutral-800 font-medium bottom-2 ">Plan change on:</span>
                        <span className="text-sm text-neutral-900/90 font-bold bottom-2 ">{pendingDate}</span>
                    </div>
                </div>
            )}
            {false && pendingDate && <PendingTag pendingDate={pendingDate} />}
        </div>
    )
}

const PendingTag = ({ pendingDate }: { pendingDate?: string }) => {

    return (
        <div

            className={` relative flex flex-col gap-2 rounded-md p-4 py-4 h-fit bg-slate-500/10
        
            `}

        >

            <span className="text-sm font-medium flex items-center gap-2 ">
                <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                Pending Change:
            </span>
            <span className="text-sm font-normal flex items-center text-neutral-400">{pendingDate}</span>
        </div>
    )
}