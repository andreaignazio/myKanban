import { forwardRef, useRef, useEffect, useState } from "react";
import { useBoardsStore } from "@/stores/boardsStore";

import type { Board, UserLite } from "@/stores/types";
import { ChartBarIcon, FunnelIcon, UsersIcon, } from "@heroicons/react/24/solid";
import { ChevronDownIcon, EnvelopeIcon, StarIcon } from "@heroicons/react/24/outline";
import { usePresenceStore } from "@/stores/presenceStore";
import { BoardActionMenuBtn } from "@/components/modals/BoardActionMenu";
import { BoardShareMenu } from "@/components/modals/BoardShareMenu";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { BoardOfferManager } from "@/components/OffersLists/BoardOfferManager";

import { useBoardActionRegistry } from "@/actionRegistry/boardActionRegistry";
import { useBoardMembersStore } from "@/stores/boardMembersStore";
import { useIsOverlayActive } from "@/hooks/useIsOverlayActive";




type BoardViewTopBarProps = {
    board: Board | undefined
    backgroundType: "color" | "image" | undefined
}

export const BoardViewTopBar = ({ board, backgroundType }: BoardViewTopBarProps) => {
    const openOverlay = useOverlayStore((state) => state.open)
    const boardOffersPanelRef = useRef<HTMLDivElement | null>(null)
    const boardMembersCount = useBoardMembersStore((state) => (board?.ID ? (state.membersIdsByBoardId[board.ID]?.length ?? 0) : 0))
    const boardActions = useBoardActionRegistry()
    const isStarred = useBoardsStore((state) => (board?.ID ? !!state.userBoardsById[board.ID]?.Props?.Starred : false))

    function handleOpenBoardOffers() {
        const id = "board-offers"
        const descriptor: OverlayDescriptor = {
            id,
            type: "popover",
            render: () => <BoardOfferManager ref={boardOffersPanelRef} />,
            renderType: "virtual",
            panelRef: boardOffersPanelRef,
            opts: {
                closeOnClickOutside: true,
                lockBackdrop: true,
                closeOnEscape: true,
                closeOnMouseLeave: false,
            },
            position: {
                virtual: "viewport-center"
            }
        }
        openOverlay(descriptor)
    }
    const boardActionMenuId = "board-action-menu"
    const { isMenuActive: isBoardActionsMenuActive } = useIsOverlayActive(boardActionMenuId)

    return (
        <div className="flex shrink-0 text-white bg-black/20 
        backdrop-blur-md
         h-[60px] w-full items-center justify-between gap-2 px-4 ">
            <div className="flex items-center gap-2">
                <span className="text-mb font-manrope font-extrabold tracking-normal text-inherit">{board?.Name}</span>
                <BaseBtn
                    className="!text-inherit"
                >
                    <>
                        <ChartBarIcon className="w-4 h-4 !text-inherit " />
                        <ChevronDownIcon className="w-3 h-3 !text-inherit" />
                    </>
                </BaseBtn>
            </div>
            <div>
                <BoardPresenceBadge boardId={board?.ID ?? ""} />
            </div>
            <div className="flex items-end">
                <BaseBtn
                    className="!text-inherit"
                >
                    <FunnelIcon className="w-4 h-4 " />
                </BaseBtn>
                <BaseBtn
                    className="!text-inherit"
                    onClick={() => {
                        if (!board?.ID) return;
                        void boardActions.setBoardStarred(board.ID, !isStarred);
                    }}>
                    <StarIcon className={`w-4 h-4 ${isStarred ? "text-yellow-500" : ""}`} fill={isStarred ? "currentColor" : "none"} />
                </BaseBtn>
                <BaseBtn className="relative !text-inherit">
                    <UsersIcon className="w-4 h-4 !text-inherit" />
                    <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold leading-none text-white">
                        {boardMembersCount}
                    </span>
                </BaseBtn>
                <BaseBtn onClick={handleOpenBoardOffers} className="!text-inherit">
                    <EnvelopeIcon className="w-4 h-4 !text-inherit" />
                </BaseBtn>
                <BoardShareMenu
                    className="!bg-slate-50 !text-slate-900 !font-semibold"
                />

                <BoardActionMenuBtn
                    customId={boardActionMenuId}
                    active={isBoardActionsMenuActive}
                    className="!text-inherit"
                />
            </div>
        </div>
    )
}

type BoardPresenceBadgeProps = {
    boardId: string
}

export const BoardPresenceBadge = ({ boardId }: BoardPresenceBadgeProps) => {
    const getConnectedUsers = usePresenceStore((state) => state.getUsersForBoard)
    const [connectedUsers, setConnectedUsers] = useState<UserLite[]>([])
    const counter = usePresenceStore((state) => state.OpCounter)

    useEffect(() => {
        // console.log("Updating connected users for board", boardId)
        setConnectedUsers(getConnectedUsers(boardId))
    }, [boardId, getConnectedUsers, counter])

    return (
        <div className="flex items-center gap-2">
            {connectedUsers.map((user) => (
                <div key={user.ID} className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">
                    {user.Name[0]}
                </div>
            ))}
        </div>
    )
}


type BaseBtnProp = {
    children?: React.ReactNode
    className?: string
    label?: string
    labelClassName?: string
    onClick?: () => void
    active?: boolean
}
export const BaseBtn = forwardRef<HTMLButtonElement, BaseBtnProp>(({ children, className, label, labelClassName, onClick, active }, ref) => {
    return (
        <button ref={ref} onClick={onClick} className={`flex items-center h-8 gap-1 px-2 py-1 rounded text-sm font-medium
         hover:bg-gray-200 text-gray-700 transition-all ${active ? "bg-gray-200" : ""} ${className}`}>
            {children}
            {label && <span className={labelClassName}>{label}</span>}
        </button>
    )
})