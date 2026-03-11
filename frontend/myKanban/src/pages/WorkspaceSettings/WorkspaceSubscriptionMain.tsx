import { SubscriptionBadge } from "@/components/badges/subscriptionBadge";
import type { AsideTabs } from "@/components/workspacePages/asideTabs"
import { SettingsPageWrapper } from "@/components/workspacePages/SettingsPageWrapper"
import { useSyncTabRouter } from "@/hooks/useSyncTabRouter";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { Building2 } from "lucide-react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { UserPagesWrapper } from "../User/userPagesWrapper";

export const WorkspaceSubscriptionMain = () => {
    const workspaceID = useParams().workspaceId as string;
    const subscription = useWorkspaceStore((state) => state.wSubscriptionsById[workspaceID]);
    const currentPlan = subscription?.Plan ?? "free";
    const pendingPlan = subscription?.PendingPlan ?? undefined;

    const cancelAtEnd = subscription?.CancelAtPeriodEnd ?? false;
    const resolvedPendingPlan = cancelAtEnd ? "free" : pendingPlan;

    const { activeTab } = useSyncTabRouter(asideTabs(workspaceID));

    const navigate = useNavigate();
    const handleNavigate = (e: React.MouseEvent<HTMLDivElement>, href: string) => {
        e.preventDefault();
        navigate(href);
    }

    const links = asideTabs(workspaceID)
    const isGoingToCancel = subscription?.CancelAtPeriodEnd ?? false;

    const status = isGoingToCancel ? "pending_cancel" : subscription?.Status ?? "inactive";

    return (

        <SettingsPageWrapper
            widthAside={"200px"}

            asideLinks={links}
            activeTab={activeTab}
            handleNavigate={handleNavigate}
            asideHeader={
                <>
                    <span className="text-lg font-bold text-neutral-300">Plan</span>
                    <SubscriptionBadge className="shadow-md shadow-black/10"
                        plan={currentPlan} showNextPlan={!!resolvedPendingPlan} nextPlan={resolvedPendingPlan} showBg={true} />

                </>
            }

            mainHeader={
                <UserPagesWrapper DoNotShowTitle className="h-full !mt-0" maxWidth="950px">
                    <div className="flex flex-col items-start justify-start gap-4 mt-20">
                        <div className="flex flex-row items-center justify-center gap-2">
                            <Building2 className="h-5 w-5 -translate-y-[2px] text-neutral-400" />
                            <div className="text-lg font-bold text-neutral-300"> Subscriptions</div>
                            <StatusBadge status={status} />
                        </div>
                    </div>
                    <Outlet />
                </UserPagesWrapper>

            }
        />

    )

}

function asideTabs(workspaceID: string): AsideTabs[] {
    return [
        { id: "manage", label: "Manage Subscription", href: `/workspaces/${workspaceID}/settings/subscription`, type: "page" },
        { id: "upgrade", label: "Upgrade Plan", href: `/workspaces/${workspaceID}/settings/subscription/upgrade`, type: "page" },
    ]
}

const StatusBadge = ({ status }: { status: string }) => {
    let color = "bg-green-500";
    switch (status) {
        case "active":
            color = "bg-green-500";
            break;
        case "canceled":
            color = "bg-red-500";
            break;
        case "past_due":
            color = "bg-yellow-500";
            break;
        case "trialing":
            color = "bg-blue-500";
            break;
        default:
            color = "bg-gray-500";
            break;
    }

    const resolvedLabel = status === "pending_cancel" ? "Pending cancellation" : status.charAt(0).toUpperCase() + status.slice(1);

    return (
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${color} text-white`}>
            {resolvedLabel}
        </div>
    );
}