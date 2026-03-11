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



export function WorkspaceMembers() {

    const workspaceID = useParams().workspaceId as string;
    const membersIds = useWsMembersStore(useShallow((state) => state.userIdsByWorkspaceId[workspaceID] ?? []));
    const { isAdminOrOwner } = useCurrentWorkspaceRole(workspaceID ?? null);
    const asideLinks: AsideTabs[] = [
        { id: "members", label: "Members", href: `/workspaces/${workspaceID}/members/`, type: "page" },
        { id: "guests", label: "Guests", href: `/workspaces/${workspaceID}/members/guests/`, type: "page" },
        { id: "links", label: "Links", href: `/workspaces/${workspaceID}/members/links/`, type: "page" },
        { id: "divider1", label: "", type: "divider" },
        { id: "outbox", label: "Outbox", href: `/workspaces/${workspaceID}/members/outbox/`, type: "page" },
        { id: "inbox", label: "Inbox", href: `/workspaces/${workspaceID}/members/inbox/`, type: "page" },

    ]

    const navigate = useNavigate();
    const handleNavigate = (e: React.MouseEvent<HTMLDivElement>, href: string) => {
        e.preventDefault();
        navigate(href);
    }

    const { activeTab } = useSyncTabRouter(asideLinks);


    return (
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
                    <div className="flex flex-row w-full justify-end ">
                        <CardRowMenuBtn
                            renderType="virtual"
                            menuComponent={({ onClose, ref }) => <ShareActionModal ref={ref}
                                actionType="create"
                                onClose={() => onClose()}
                                targetID={workspaceID}
                                targetType="workspace"
                            />}
                        >
                            {isAdminOrOwner && <LabeledButtonPresetA label="Invite Workspace Members" onClick={() => { }}
                                className="w-fit px-4 mb-4 !bg-accent !text-neutral-900" >
                                <UserPlusIcon className="h-4 aspect-square" />
                            </LabeledButtonPresetA>}
                        </CardRowMenuBtn>
                    </div>
                    <Outlet />
                </>
            }

        />
    )
}
