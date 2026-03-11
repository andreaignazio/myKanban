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
import { UserAvatar } from "./badges/UserAvatar"

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
    function handleCloseInbox() {
        close("inbox")
    }

    return (
        <div className="flex-1 flex items-center gap-4 justify-end px-5" >
            <InboxArrowDownIcon
                onClick={handleOpenInbox}
                className="w-5 h-5 text-gray-500" />
            <SquaresPlusIcon
                onClick={handleCloseInbox}
                className="w-5 h-5 text-gray-500" />
            <UserNotificationMenuBtn />
            <div className="flex flex-col gap-0 items-end">
                <p className="font-semibold text-text">{user?.Name}</p>
                {context !== "board" && (<p className="text-xs text-text-text/70">@{user?.Username === "" ? "username" : user?.Username}</p>)}
            </div>
            <UserAvatar user={user ?? undefined} />


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
