import { useMatch, useParams } from "react-router"
import { useShallow } from "zustand/shallow"
import { useAuthStore } from "@/stores/auth"
import { useUiStore } from "@/stores/uiStore"
import { RectangleGroupIcon } from "@heroicons/react/24/solid"
import { SquaresPlusIcon, InboxArrowDownIcon } from "@heroicons/react/24/outline"
import { useWorkspaceStore } from "@/stores/workspaceStore"
import { useWsMembersStore } from "@/stores/wsMembersStore"

import { useOverlayStore } from "@/overlays/overlayStore"

import { useCurrentBoardRole } from "@/hooks/useCurrentBoardRole"

import { UserOfferManager } from "./OffersLists/UserOfferManager"

type TopbarProps = {
    onClick?: () => void;
    isHidden?: boolean;
}

export default function Topbar({ onClick, isHidden }: TopbarProps) {
    const isCardDragging = useUiStore((state) => state.isCardDragging)

    const isListDragging = useUiStore((state) => state.isListDragging)

    const isCard = useMatch("/workspaces/:workspaceId/boards/:boardId/cards/:cardId")
    const isBoard = useMatch("/workspaces/:workspaceId/boards/:boardId") || isCard
    const isWorkspace = useMatch("/workspaces/:workspaceId/*")
    const isMembersView = useMatch("/workspaces/:workspaceId/members/*")

    const context = isBoard ? "board" : isWorkspace ? isMembersView ? "members" : "workspace" : null;

    return (
        <header style={{ height: isHidden ? 0 : undefined, opacity: isHidden ? 0 : 1, transition: "height 1s ease" }}
            className={`${isBoard ? 'h-12' : 'h-14'} bg-main flex items-between justify-between`}>
            <header className="flex items-center px-3">
                {context === "board" && (
                    <BoardHeader />
                )}
                {context === "workspace" && (
                    <WorkspaceHeader />
                )}
            </header>



            {isCardDragging && <div className="ml-4 text-sm text-gray-500">Dragging Card...</div>}
            {isListDragging && <div className="ml-4 text-sm text-gray-500">Dragging List...</div>}


            <UserHeader context={context} />

        </header>
    )
}
import type { OverlayDescriptor } from "@/overlays/overlayStore"
import { useRef } from "react"
import { UserNotificationMenuBtn } from "./modals/UserNotificationMenu"

import { MemberRow } from "./common/MemberRow"
import type { User } from "@/stores/types"
import { useIsOverlayActive } from "@/hooks/useIsOverlayActive"
import { CardRow } from "./CardRow"
import { CardRowMenuBtn } from "./cardMenus/cardRowMenus"

function UserHeader({ context }: { context: string | null }) {
    const user = useAuthStore((state) => state.user)

    const open = useOverlayStore((state) => state.open)
    const close = useOverlayStore((state) => state.close)

    const InboxPanelRef = useRef<HTMLDivElement | null>(null)

    function handleOpenInbox() {
        //console.log("Open inbox")
        const descriptor: OverlayDescriptor = {
            id: "inbox",
            type: "popover",
            render: () => <UserOfferManager ref={InboxPanelRef} />,
            renderType: "virtual",
            panelRef: InboxPanelRef,
            opts: {
                closeOnClickOutside: true,
                lockBackdrop: true,
                closeOnEscape: true,
                closeOnMouseLeave: false
            },
            position: {
                virtual: "viewport-center"
            }
        }
        open(descriptor)
    }

    const inboxMenuId = "user-inbox-menu"
    const notificationMenuId = "user-notification-menu"
    const { isMenuActive: isNotificationMenuActive } = useIsOverlayActive(notificationMenuId)
    const { isMenuActive: isInboxMenuActive } = useIsOverlayActive(inboxMenuId)

    return (
        <div className="flex-1 flex items-center gap-4 justify-end px-5" >
            <div className="flex flex-row gap-1 items-center justify-center">

                <CardRowMenuBtn
                    customId={inboxMenuId}
                    renderType="virtual"
                    menuComponent={
                        ({ onClose, ref }) => <UserOfferManager ref={ref} />
                    }
                    desiredBackdropOpacity={0.5}
                >

                    <div className={`bg-transparent text-gray-300
            hover:bg-neutral-400/20 p-2 rounded cursor-pointer transition-all
            ${isInboxMenuActive ? "!bg-neutral-500/20 " : ""}
            `}
                    >
                        <InboxArrowDownIcon

                            className="w-5 h-" />
                    </div>
                </CardRowMenuBtn>

                <UserNotificationMenuBtn
                    style={{}}
                    overrideClassName={`
                    ${isNotificationMenuActive ? "ring-2 ring-white/80 ring-offset-1 ring-offset-neutral-900/80" : ""}
                    flex items-center 
                h-8 gap-1 px-2 py-1 rounded text-sm 
                font-medium hover:bg-blue-400
                bg-accent !text-neutral-900
                hover:ring-2 hover:ring-white/80 hover:ring-offset-1 hover:ring-offset-neutral-900/80
                
                transition-all 

                text-white transition-all`}
                />
            </div>

            <MemberRow
                rowClassName="!w-fit"
                avatarSize={38}

                showEndRow={false}
                user={user as User} showRole={false} flip={true} />


        </div>
    )
}





function BoardHeader() {
    const { boardId } = useParams<{ boardId: string }>()
    const { workspaceId } = useParams<{ workspaceId: string }>()
    const toggleSidebarHidden = useUiStore((state) => state.toggleSidebarHidden)
    const workspace = useWorkspaceStore(
        useShallow((state) => (workspaceId ? state.workspacesById[workspaceId] : undefined))
    )
    return (
        <div className="flex flex-row items-center justify-center gap-2">
            <RectangleGroupIcon
                onClick={() => toggleSidebarHidden()}
                className="w-6 h-6 text-gray-900 bg-neutral-300 rounded-lg p-1" />
            <h1 className="font-semibold text-[13px]">{workspace?.Name}</h1>
            <UserRoleBadge contextID={boardId as string} contextType="board" className="opacity-70 translate-y-0.5 scale-90" />
        </div>
    )
}

function WorkspaceHeader() {
    const { workspaceId } = useParams<{ workspaceId: string }>()
    const workspace = useWorkspaceStore(
        useShallow((state) => (workspaceId ? state.workspacesById[workspaceId] : undefined))
    )
    const toggleSidebarHidden = useUiStore((state) => state.toggleSidebarHidden)
    return (
        <div className="flex flex-row items-center justify-center gap-2">
            <SquaresPlusIcon
                onClick={() => toggleSidebarHidden()}
                className="w-6 h-6 text-gray-500 bg-neutral-300 rounded-lg p-1" />
            <h1 className="font-semibold text-lg">{workspace?.Name}</h1>
            <UserRoleBadge contextID={workspaceId as string} contextType="workspace" />
        </div>
    )
}

type UserRoleBadgeProps = {
    contextID: string;
    contextType: "board" | "workspace";
    className?: string;
    size?: "sm" | "md" | "lg";
}

function UserRoleBadge({ contextID, contextType, className, size = "md" }: UserRoleBadgeProps) {
    const userId = useAuthStore(useShallow((state) => state.userID))
    const { role: boardRole } = useCurrentBoardRole(contextType === "board" ? contextID : undefined)
    const workspaceRole = useWsMembersStore(
        useShallow((state) => userId ? state.userWorkspacesByWorkspaceId[contextID]?.[userId]?.Role : undefined)
    )
    const role = contextType === "board" ? boardRole : workspaceRole;
    const roleBadgeClass = getRoleBadgeClass(role as Role);

    return (
        <div className={className}>
            <span className={`w-fit flex items-center justify-center rounded-full border px-2 py-1 pb-1.5 max-h-6 text-xs font-medium ${roleBadgeClass}`}>
                {role}
            </span>
        </div>
    )
}


type Role = "owner" | "admin" | "member" | "viewer" | undefined;

function getRoleBadgeClass(role: Role) {
    switch (role) {
        case "owner":
            return "border-amber-500/40 bg-amber-500/15 text-amber-200";
        case "admin":
            return "border-sky-500/40 bg-sky-500/15 text-sky-200";
        case "member":
            return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
        case "viewer":
            return "border-slate-500/40 bg-slate-500/15 text-slate-200";
        default:
            return "border-border/40 bg-surface/40 text-text";
    }
}
