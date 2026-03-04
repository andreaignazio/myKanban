import { UserRow } from "@/components/UserRow";
import { useWsMembersStore } from "@/stores/wsMembersStore";
import { Outlet, useNavigate } from "react-router";
import { use, useEffect, useRef, useState } from "react";
import { useParams } from "react-router"
import { useShallow } from "zustand/shallow";
import { WorkspaceSubRows } from "@/components/sidebar/WorkspaceSubRows";
import { ChevronRight, UserPlusIcon } from "lucide-react";
import { CatalogIcon } from "@/icons/iconCatalog";
import { LabeledButtonPresetA } from "@/components/buttons/labeledButton";
import { CardRowMenuBtn } from "@/components/cardMenus/cardRowMenus";
import { ShareActionModal } from "@/components/modals/ShareActionModal";
import { useCurrentWorkspaceRole } from "@/hooks/useCurrentWorkspaceRole";

type AsideTabs = {
    id: string;
    label: string;
    type: "page" | "divider";
    href?: string;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}


export function WorkspaceMembers() {

    const workspaceID = useParams().workspaceId as string;
    const membersIds = useWsMembersStore(useShallow((state) => state.userIdsByWorkspaceId[workspaceID] ?? []));
    const { isAdminOrOwner, isMember } = useCurrentWorkspaceRole(workspaceID ?? null);

    const [activeTab, setActiveTab] = useState("members");

    useEffect(() => {
        useWsMembersStore.getState().fetchWorkspaceMembers(workspaceID);

    }, [workspaceID, membersIds]);

    const navigate = useNavigate();
    const panelRef = useRef<HTMLDivElement | null>(null)
    const asideLinks: AsideTabs[] = [
        { id: "members", label: "Members", href: `/workspaces/${workspaceID}/members/`, type: "page" },
        { id: "guests", label: "Guests", href: `/workspaces/${workspaceID}/members/guests/`, type: "page" },
        { id: "links", label: "Links", href: `/workspaces/${workspaceID}/members/links/`, type: "page" },
        { id: "divider1", label: "", type: "divider" },
        { id: "outbox", label: "Outbox", href: `/workspaces/${workspaceID}/members/outbox/`, type: "page" },
        { id: "inbox", label: "Inbox", href: `/workspaces/${workspaceID}/members/inbox/`, type: "page" },

    ]

    const handleNavigate = (e: React.MouseEvent<HTMLDivElement>, href: string) => {
        e.preventDefault();
        navigate(href);
    }

    useEffect(() => {
        const currentPath = window.location.pathname;
        const matchedLink = asideLinks.find(link => link.href === currentPath);
        if (matchedLink) {
            setActiveTab(matchedLink.id);
        }
    }, [window.location.pathname]);

    return (
        <>

            <div className="grid grid-cols-[1fr_6fr] gap-4 h-full mt-6">
                <div className=" ms-5 rounded-lg bg-transparent  h-full">
                    <div className="flex flex-row items-center gap-2 mb-12">
                        <span className="text-lg font-bold text-neutral-300">Collaborators</span>
                        <div className="flex items-center justify-center w-8 h-6 rounded-full bg-neutral-400 text-neutral-900 text-sm font-bold">
                            {membersIds.length}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1  ps-3">
                        {asideLinks.map((link) => {
                            if (link.type === "divider") {
                                return <hr key={link.id} className="my-2 border-neutral-700" />
                            }
                            return (
                                <TabRow key={link.id} item={link} activeItemId={activeTab} onClick={(e) => handleNavigate(e, link.href!)} />
                            )
                        }
                        )}
                    </div>
                </div>
                <div className="flex flex-col h-full px-12">
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
                </div>


            </div>
        </>
    )
}

type TabRowProps = {
    item: AsideTabs;
    activeItemId: string | null;
    onClick: (e: React.MouseEvent<HTMLDivElement>, itemId: string) => void;
}

const TabRow = ({ item, activeItemId, onClick }: TabRowProps) => {
    return (
        <div onClick={(e) => onClick(e, item.id)}
            className={`flex items-center rounded-lg w-[180px]
                         gap-2 p-2 flex-row justify-between group transition-all
                          hover:bg-surface cursor-pointer 
                          ${activeItemId === item.id ? "bg-active" : ""}`}>
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-300">{item.label}</span>
            </div>

            <div >
                <ChevronRight className={`h-4 aspect-square text-neutral-400 
                                opacity-0 group-hover:opacity-100`} />
            </div>
        </div>
    )
}