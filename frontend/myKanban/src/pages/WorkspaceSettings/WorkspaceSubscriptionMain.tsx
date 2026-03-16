import { SubscriptionBadge } from "@/components/badges/subscriptionBadge";
import type { AsideTabs } from "@/components/workspacePages/asideTabs"
import { SettingsPageWrapper } from "@/components/workspacePages/SettingsPageWrapper"
import { useSyncTabRouter } from "@/hooks/useSyncTabRouter";
import { useWorkspaceStore } from "@/stores/workspaceStore";

import { Outlet, useNavigate, useParams } from "react-router-dom";

import { WorkspacePageHeader } from "@/components/workspacePages/WorkspacePageHeader";

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
    //const isGoingToCancel = subscription?.CancelAtPeriodEnd ?? false;

    //const status = isGoingToCancel ? "pending_cancel" : subscription?.Status ?? "inactive";

    const getTabData = (tabId: string | null): AsideTabs | undefined => {
        return links.find(link => link.id === tabId);
    }

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

            mainHeader={<>
                <div className="flex flex-col h-full p-6 overflow-hidden scrollbar-hidden">
                    <WorkspacePageHeader title={getTabData(activeTab)?.pageTitle ?? ""}
                        description={getTabData(activeTab)?.pageDescription ?? ""}
                        iconId={getTabData(activeTab)?.pageIconId ?? "default"} />
                    <Outlet />
                </div>

            </>


            }
        />

    )

}

function asideTabs(workspaceID: string): AsideTabs[] {
    return [
        {
            id: "manage", label: "Manage Subscription", href: `/workspaces/${workspaceID}/settings/subscription`, type: "page",
            pageTitle: "Manage Subscription",
            pageDescription: "View your current subscription details, manage your billing information, and see your billing history.",
            pageIconId: "subscription"
        },
        {
            id: "upgrade", label: "Upgrade Plan", href: `/workspaces/${workspaceID}/settings/subscription/upgrade`, type: "page",
            pageTitle: "Upgrade Plan",
            pageDescription: "Upgrade your current subscription plan to access additional features and benefits.",
            pageIconId: "upgrade"
        },
    ]
}

/*const StatusBadge = ({ status }: { status: string }) => {
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
}*/