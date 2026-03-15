import { useWsMembersStore } from "@/stores/wsMembersStore";
import { Outlet, useNavigate } from "react-router";
import { useParams } from "react-router"
import { useShallow } from "zustand/shallow";
import { UserPlusIcon } from "lucide-react";
import { LabeledButtonPresetA } from "@/components/buttons/labeledButton";
import { CardRowMenuBtn } from "@/components/cardMenus/cardRowMenus";
import { ShareActionModal } from "@/components/modals/ShareActionModal";
import { useCurrentWorkspaceRole } from "@/hooks/useCurrentWorkspaceRole";
import { type AsideTabs } from "@/components/workspacePages/asideTabs";
import { SettingsPageWrapper } from "@/components/workspacePages/SettingsPageWrapper";
import { useSyncTabRouter } from "@/hooks/useSyncTabRouter";
import { useState, useEffect } from "react";
import { Switcher } from "@/components/OffersLists/OfferManagerShell";
import { WorkspacePageHeader } from "@/components/workspacePages/WorkspacePageHeader";



export function WorkspaceMembers() {

    const workspaceID = useParams().workspaceId as string;
    const membersIds = useWsMembersStore(useShallow((state) => state.userIdsByWorkspaceId[workspaceID] ?? []));
    const { isAdminOrOwner } = useCurrentWorkspaceRole(workspaceID ?? null);
    const asideLinks: AsideTabs[] = [
        {
            id: "members", label: "Members", href: `/workspaces/${workspaceID}/members/`, type: "page",
            pageTitle: "Workspace members",
            pageDescription: "Members can view and join all Workspace visible boards and create new boards in the Workspace. Guests can only access specific boards they have been invited to. They cannot create new boards in the Workspace.",
            pageIconId: "briefCase"
        },
        {
            id: "guests", label: "Guests", href: `/workspaces/${workspaceID}/members/guests/`, type: "page",
            pageTitle: "Workspace guests",
            pageDescription: "Guests can only access specific boards they have been invited to. They cannot create new boards in the Workspace.",
            pageIconId: "eye"
        },
        {
            id: "links", label: "Links", href: `/workspaces/${workspaceID}/members/links/`, type: "page",
            pageTitle: "Public Links",
            pageDescription: "Shareable links let anyone with the URL join this workspace — no invitation required. Each link can be scoped to a specific role and optionally set to expire. Revoke a link at any time to block future access.",
            pageIconId: "link"
        },
        { id: "divider1", label: "", type: "divider" },
        {
            id: "outbox", label: "Outbox", href: `/workspaces/${workspaceID}/members/outbox/`, type: "page",
            pageTitle: "Outbox",
            pageDescription: "Workspace join invitations sent to other users.",
            pageIconId: "letterSent"
        },
        {
            id: "inbox", label: "Inbox", href: `/workspaces/${workspaceID}/members/inbox/`, type: "page",
            pageTitle: "Inbox",
            pageDescription: "Workspace access requests received from users.",
            pageIconId: "letterReceived"
        },

    ]

    const navigate = useNavigate();
    const handleNavigate = (e: React.MouseEvent<HTMLDivElement>, href: string) => {
        e.preventDefault();
        navigate(href);
    }

    const { activeTab } = useSyncTabRouter(asideLinks);
    const [showOnlyFiltered, setShowOnlyFiltered] = useState(false);

    useEffect(() => { setShowOnlyFiltered(false); }, [activeTab]);

    const showSwitcher = activeTab === "links" || activeTab === "outbox" || activeTab === "inbox";
    const switcherLabel = activeTab === "links" ? "Show only active" : "Show only pending";

    const getTabData = (id: string) => {
        const tab = asideLinks.find(t => t.id === id);
        return tab;
    }


    return (
        <div className="h-screen w-full overflow-hidden">
            <SettingsPageWrapper

                asideLinks={asideLinks}
                activeTab={activeTab}
                handleNavigate={handleNavigate}
                asideHeader=
                {<>
                    <span className="text-lg font-bold text-neutral-300">Collaborators</span>
                    <div className="flex items-center justify-center w-8 h-6 rounded-full bg-neutral-400 text-neutral-900 text-sm font-bold">
                        {membersIds.length}
                    </div>
                </>}
                mainHeader={
                    <>
                        <div className="flex flex-row w-full justify-between items-center flex-shrink-0">
                            <div className="flex items-center gap-3 ps-6">
                                {showSwitcher && (
                                    <>
                                        <span className="text-sm text-gray-400 whitespace-nowrap">{switcherLabel}</span>
                                        <Switcher isOn={showOnlyFiltered} onToggle={() => setShowOnlyFiltered(v => !v)} />
                                    </>
                                )}
                            </div>
                            {isAdminOrOwner && <CardRowMenuBtn
                                renderType="virtual"
                                menuComponent={({ onClose, ref }) => <ShareActionModal ref={ref}
                                    actionType="create"
                                    onClose={() => onClose()}
                                    targetID={workspaceID}
                                    targetType="workspace"
                                />}
                            >
                                <LabeledButtonPresetA label="Invite Workspace Members" onClick={() => { }}
                                    className="w-fit px-4 mb-4 !bg-accent !text-neutral-900" >
                                    <UserPlusIcon className="h-4 aspect-square" />
                                </LabeledButtonPresetA>
                            </CardRowMenuBtn>}
                        </div>
                        <div className="flex flex-col h-full p-6 scrollbar-hidden">
                            <WorkspacePageHeader title={getTabData(activeTab)?.pageTitle ?? ""}
                                description={getTabData(activeTab)?.pageDescription ?? ""}
                                iconId={getTabData(activeTab)?.pageIconId ?? "default"} />
                            <Outlet context={{ showOnlyFiltered }} />
                        </div>
                    </>
                }

            />
        </div>
    )
}
