import { LabeledButtonPresetA, LabeledButtonPresetBSubmit } from "@/components/buttons/labeledButton";
import { useWorkspaceStore } from "@/stores/workspaceStore"
import type { SubscriptionPlan } from "@/types/subscriptiontypes";
import { useParams } from "react-router"
import { UserPagesWrapper } from "../User/userPagesWrapper";
import { useState } from "react";
import { Columns3, Users } from "lucide-react";


type SubscriptionType = {
    id: SubscriptionPlan;
    name: string;
    description?: string;
    descriptionStrong?: string;

    maxBoards: number;
    maxMembers: number;
    price?: number;
}

type SubscriptionFeature = {
    id: string;
    icon: React.ReactNode;
    label: string;
    value: string | number | boolean;
}


export const WorkspaceSubscriptions = () => {
    const subscriptionUpgrader = useWorkspaceStore(state => state.createUpgradeSubscriptionRequest)
    const workspaceID = useParams().workspaceId || ""
    const handleSubscriptionUpgrade = (plan: SubscriptionPlan) => {
        return subscriptionUpgrader(plan, 5, workspaceID)
    }

    const subscriptionTypes: SubscriptionType[] = [
        {
            id: "free", name: "Free", maxBoards: 10, maxMembers: 10, price: 0,
            description: "Organize your day and keep moving forward",
            descriptionStrong: "Start simple. Stay on track."
        },
        {
            id: "pro", name: "Pro", maxBoards: 15, maxMembers: 15, price: 10,
            description: "Bring your team together and get more done",
            descriptionStrong: "Add focus. Get more done."
        },
        {
            id: "premium", name: "Premium", maxBoards: -1, maxMembers: -1, price: 20,
            description: "Optimize your workflow and with unlimited features and priority support",
            descriptionStrong: "Unlock your full potential."
        },
    ]
    return (
        <UserPagesWrapper Title="Workspace Settings">
            <div className="flex flex-col gap-2 h-screen">
                <span className="text-sm text-neutral-400 mt-6">
                    This is the current workspace settings page.
                    Here you can view and edit your current workspace settings.
                </span>
                {/* <LabeledButtonPresetBSubmit label="Upgrade Subscription"
             onClick={() => { handleSubscriptionUpgrade() }} />*/}


                <SubscriptionUpgradeSection subscriptionTypes={subscriptionTypes} onUpgrade={handleSubscriptionUpgrade} />
            </div>
        </UserPagesWrapper>
    )
}

type SubscriptionUpgradeSectionProps = {
    subscriptionTypes: SubscriptionType[];
    onUpgrade: (plan: SubscriptionPlan) => Promise<void>;
}
const SubscriptionUpgradeSection = ({ subscriptionTypes, onUpgrade }: SubscriptionUpgradeSectionProps) => {
    const [activeSubscription, setActiveSubscription] = useState<string>("free")

    return (
        <div className="flex h-full flex-row gap-4">
            {
                subscriptionTypes.map((type) => (
                    <SubscriptionSection key={type.id} subscriptionType={type}
                        setActiveTab={setActiveSubscription} activeTab={activeSubscription} onUpgrade={onUpgrade} />
                ))

            }
        </div>
    )
}

type SubscriptionSectionProps = {
    subscriptionType: SubscriptionType;
    setActiveTab?: (tab: string) => void;
    activeTab?: string;
    onUpgrade: (plan: SubscriptionPlan) => Promise<void>;
}
const SubscriptionSection = ({ subscriptionType, setActiveTab, activeTab, onUpgrade }: SubscriptionSectionProps) => {
    const { name, maxBoards, maxMembers, price } = subscriptionType
    const isActive = activeTab === subscriptionType.id

    const priceTag = name === "Free" ? "Free forever" : "/per member"
    const isFree = name === "Free"
    const iconClass = "w-6 h-6";

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

    return (

        <div
            onClick={() => setActiveTab && setActiveTab(subscriptionType.id)}
            className={` relative flex flex-col gap-2 w-[550px] rounded-md p-4 pt-6 pb-8 h-fit
            ${isActive ? "bg-slate-500/20 ring ring-[#ad5bdc]" : "bg-slate-500/10"}`}>
            <div className="relative flex flex-col h-60">
                <div className="text-center h-28">
                    <div className="text-xl text-center font-bold mb-3">{name}</div>
                    <span className="text-sm font-semibold tracking-tight">{subscriptionType.descriptionStrong}</span>
                    <div className="text-xs font-light text-neutral-400">{subscriptionType.description}</div>
                </div>

                <div className="  flex flex-col items-center mt-4">
                    <span className="text-2xl font-bold">${price} USD</span>
                    <span className="text-xs font-normal text-neutral-400">{priceTag}</span>
                </div>
                {isFree ? null : <LabeledButtonPresetA
                    label="Upgrade"
                    disabled={!isActive}
                    className={`w-fit self-center mt-2 !font-medium 
                        ${isActive
                            ? "!bg-[#669df1] hover:!bg-[#74a4ed] text-neutral-900"
                            : "!bg-neutral-400/20  text-neutral-400 cursor-default"}`}
                    onClick={() => { void onUpgrade(subscriptionType.id) }} />}
                <div className="h-px bg-neutral-400/20 w-full absolute bottom-0 left-0" />
            </div>

            <div className="flex flex-col mt-3 gap-3">
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
    )
}