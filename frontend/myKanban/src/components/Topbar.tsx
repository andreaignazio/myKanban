import { useMatch, useNavigate, useParams } from "react-router-dom"
import { useShallow } from "zustand/shallow"
import { useAuthStore } from "@/stores/auth"
import { useUiStore } from "@/stores/uiStore"
import { ChevronRightIcon, InboxArrowDownIcon, RectangleGroupIcon } from "@heroicons/react/24/solid"
import { motion } from "framer-motion"

import { useWorkspaceStore } from "@/stores/workspaceStore"
import { useWsMembersStore } from "@/stores/wsMembersStore"



import { useCurrentBoardRole } from "@/hooks/useCurrentBoardRole"

import { UserOfferManager } from "./OffersLists/UserOfferManager"

type TopbarProps = {
    onClick?: () => void;
    isHidden?: boolean;
}

export default function Topbar({ onClick, isHidden }: TopbarProps) {


    const isCard = useMatch("/workspaces/:workspaceId/boards/:boardId/cards/:cardId")
    const isBoard = useMatch("/workspaces/:workspaceId/boards/:boardId") || isCard
    const isWorkspace = useMatch("/workspaces/:workspaceId/*")
    const isMembersView = useMatch("/workspaces/:workspaceId/members/*")

    let context = isBoard ? "board" : isWorkspace ? isMembersView ? "members" : "workspace" : null;

    // context = "main"
    return (
        <header style={{ height: isHidden ? 0 : undefined, opacity: isHidden ? 0 : 1, transition: "height 1s ease" }}
            className={`${isBoard ? 'h-12' : 'h-14'} bg-main flex items-between justify-between`}>
            <header className="flex items-center px-4 gap-2 h-full">
                {true && (
                    <MainHeader context={context} />
                )}
                <div className="w-px h-6 bg-gray-300/40 rounded self-center" />
                {context === "board2" && (
                    <BoardHeader />
                )}
                {(context === "workspace" || context === "board") && (
                    <WorkspaceHeader context={context} />
                )}

            </header>

            <UserHeader context={context} />

        </header>
    )
}

import { UserNotificationMenuBtn } from "./modals/UserNotificationMenu"

import { MemberRow } from "./common/MemberRow"
import type { User } from "@/stores/types"
import { useIsOverlayActive } from "@/hooks/useIsOverlayActive"

import { CardRowMenuBtn } from "./cardMenus/cardRowMenus"
import { useShareOffersStore } from "@/stores/shareOffersStore"
import { UnreadCounter } from "./common/UnreadCounter"
import { UserActionMenu } from "./modals/UserActionMenu"


function UserHeader({ context }: { context: string | null }) {
    const user = useAuthStore((state) => state.user)
    //const [compactMenu, setCompactMenu] = useState(false)

    const iconSizeClass = context === "board" ? "w-4 h-4" : "w-5 h-5"

    const inboxMenuId = "user-inbox-menu"
    const notificationMenuId = "user-notification-menu"
    const { isMenuActive: isNotificationMenuActive } = useIsOverlayActive(notificationMenuId)
    const { isMenuActive: isInboxMenuActive } = useIsOverlayActive(inboxMenuId)
    const pendingInvitesCount = useShareOffersStore((state) => state.getPendingIncomingUserInvitesCount())

    return (
        <motion.div layout className="flex-1
        flex items-center gap-4 justify-end px-5" >
            <motion.div layout className=" 
            flex flex-row gap-2 items-center justify-center">

                <CardRowMenuBtn
                    customId={inboxMenuId}
                    renderType="virtual"
                    exclusiveGroup="user-topbar-modal"
                    menuComponent={
                        ({ onClose, ref }) => <UserOfferManager ref={ref} onClose={onClose} />
                    }
                    desiredBackdropOpacity={0.5}
                >

                    <div className={`relative bg-transparent text-gray-400 items-center justify-center flex aspect-square
            hover:bg-neutral-400/20 rounded cursor-pointer transition-all
            ${isInboxMenuActive ? "!bg-neutral-500/20 " : ""}
            ${context === "board" ? "h-7" : "h-8"} 
            `}
                    >
                        <InboxArrowDownIcon className={iconSizeClass} />
                        <UnreadCounter count={pendingInvitesCount} />
                    </div>
                </CardRowMenuBtn>

                <UserNotificationMenuBtn
                    style={{}}
                    iconClassName={iconSizeClass}
                    overrideClassName={` relative
                    ${isNotificationMenuActive ? "ring-2 ring-white/80 ring-offset-1 ring-offset-neutral-900/80" : ""}
                    ${context === "board" ? "h-7" : "h-8"} 
                    flex items-center justify-center 
                 gap-1 aspect-square  rounded text-sm 
                font-medium hover:bg-blue-400
                bg-accent !text-neutral-900
                hover:ring-2 hover:ring-white/80 hover:ring-offset-1 hover:ring-offset-neutral-900/80
                
                transition-all 

                text-white transition-all`}
                />
            </motion.div>

            <CardRowMenuBtn
                customId="user-menu"
                renderType="anchored"
                exclusiveGroup="user-topbar-modal"
                menuComponent={
                    ({ onClose, ref }) => <UserActionMenu ref={ref} onClose={onClose} />
                }
                desiredBackdropOpacity={0.5}
            >
                <MemberRow
                    onClickCapture={() => { }}
                    compact={context === "board"}
                    rowClassName="!w-fit "
                    avatarSize={context === "board" ? 32 : 38}
                    showEndRow={false}
                    user={user as User} showRole={false} flip={true}
                    showRowHoverEffect={true}
                    cursorDefault={false}
                />
            </CardRowMenuBtn>


        </motion.div>
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

function WorkspaceHeader({ context }: { context: string | null }) {
    const { workspaceId } = useParams<{ workspaceId: string }>()
    const workspace = useWorkspaceStore(
        useShallow((state) => (workspaceId ? state.workspacesById[workspaceId] : undefined))
    )

    return (
        <div className="flex flex-col text-xs items-start justify-center gap-0 h-full">

            <h1 className="font-medium text-sm">{workspace?.Name}</h1>
            <UserRoleBadge className={`${context === "workspace" ? "opacity-70 translate-y-0.5 scale-90" : "opacity-0 h-0"}`}
                contextID={workspaceId as string} contextType="workspace" />
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
    const formattedRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : "No Role"

    return (
        <div className={className}>
            <div className={`w-fit flex items-center justify-center rounded-md  py-[1px] px-2 text-[8px] border-none 
             border ${roleBadgeClass}`}>


                {formattedRole}
            </div>
        </div>
    )
}


type Role = "owner" | "admin" | "member" | "viewer" | undefined;

function getRoleBadgeClass(role: Role) {
    switch (role) {
        case "owner":
            return "border-amber-500/40 bg-fuchsia-700/20 text-fuchsia-200";
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

type MainHeaderProps = {
    context: string | null;
}
const MainHeader = ({ context }: MainHeaderProps) => {

    const toggleSidebarHidden = useUiStore((state) => state.toggleSidebarHidden)
    const navigate = useNavigate()
    const { workspaceId } = useParams<{ workspaceId: string }>()

    const handleClick = () => {
        if (context === "board") {
            navigate(workspaceId ? `/workspaces/${workspaceId}/boards` : "/workspaces")

        }
        else {
            toggleSidebarHidden()

        }
    }

    const logo = (className?: string) => {
        return (
            <div className={`w-12 h-6 flex-row flex items-center justify-center ${className}`}>
                <span className="text-sm font-light text-gray-300">My</span>
                <span className="text-[18px] font-bold text-gray-300">K.</span>
            </div>
        )
    }



    return (
        <div onClick={handleClick}
            className="flex flex-row items-center justify-center gap-0">
            <div className="group w-14
            transition-all ease-in-out duration-300 flex flex-row items-center justify-center
            hover:bg-gray-500 px-2 py-1 bg-gray-500/20 rounded-md cursor-pointer ">
                {logo(
                    `transition-all duration-300 ease-in-out group-hover:opacity-0 group-hover:w-0 opacity-100`
                )}
                <ChevronRightIcon className={`w-0 group-hover:opacity-100 opacity-0 group-hover:w-4 hover:scale-105
                     text-gray-300 transition-all ${context === "board" ? "rotate-90" : ""}`} />
            </div>


        </div>
    )

}
