import { forwardRef, useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useBoardsStore } from "@/stores/boardsStore";

import type { Board, UserLite } from "@/stores/types";
import { ChartBarIcon, UsersIcon, } from "@heroicons/react/24/solid";
import { ChevronDownIcon, EnvelopeIcon, StarIcon } from "@heroicons/react/24/outline";
import { usePresenceStore } from "@/stores/presenceStore";
import { BoardActionMenuBtn } from "@/components/modals/BoardActionMenu";
import { BoardShareMenu } from "@/components/modals/BoardShareMenu";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { BoardOfferManager } from "@/components/OffersLists/BoardOfferManager";

import { useBoardActionRegistry } from "@/actionRegistry/boardActionRegistry";
import { boardMemberKey, useBoardMembersStore } from "@/stores/boardMembersStore";
import { useIsOverlayActive } from "@/hooks/useIsOverlayActive";
import { UserRoleBadge } from "../badges/UserRoleBadge";
import { useCurrentBoardRole } from "@/hooks/useCurrentBoardRole";
import { useShareOffersStore } from "@/stores/shareOffersStore";
import { useShallow } from "zustand/shallow";
import { InlineEditableTitle } from "../menuElements/InlineEditableTitle";
import { useInlineTitleEditing } from "@/hooks/useInlineTitleEditing";
import { CardRowMenuBtn } from "../cardMenus/cardRowMenus";

import { BoardMembersDrop } from "../modals/boardMembersDrop";
import { useBoardPresence } from "@/hooks/useBoardPresence";
import { UserAvatarDummy } from "../badges/UserAvatarDummy";




type BoardViewTopBarProps = {
    board: Board | undefined
    backgroundType: "color" | "image" | undefined
}

export const BoardViewTopBar = ({ board, backgroundType }: BoardViewTopBarProps) => {
    const openOverlay = useOverlayStore((state) => state.open)
    const triggerOverlayUpdate = useOverlayStore((state) => state.triggerUpdate)
    const boardOffersPanelRef = useRef<HTMLDivElement | null>(null)
    const boardMembersCount = useBoardMembersStore((state) => (board?.ID ? (state.membersIdsByBoardId[board.ID]?.length ?? 0) : 0))
    const boardActions = useBoardActionRegistry()
    const isStarred = useBoardsStore((state) => (board?.ID ? !!state.userBoardsById[board.ID]?.Props?.Starred : false))
    const membersById = useBoardMembersStore(state => state.membersById)
    const boardMembersIds = useBoardMembersStore(useShallow((state) => (board?.ID ? state.membersIdsByBoardId[board.ID ?? ""] ?? [] : [])))
    const members = boardMembersIds.map(id => {
        const key = boardMemberKey(board?.ID ?? "", id)
        return (
            membersById[key]
        )
    })

    const { connectedUsers, presenceByUserId } = useBoardPresence(board?.ID ?? "", members)

    useEffect(() => {
        triggerOverlayUpdate()
    }, [connectedUsers, triggerOverlayUpdate])

    const { role, isViewer } = useCurrentBoardRole(board?.ID ?? "")

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

    const membersActionMenuId = "members-action-menu"
    const { isMenuActive: isMembersActionsMenuActive } = useIsOverlayActive(membersActionMenuId)





    const pendingOfferCount = useShareOffersStore(useShallow((state) => state.getBoardPendingIncomingRequests(board?.ID ?? "")))

    const persistTitleChange = (newTitle: string) => {
        if (!board?.ID) return;
        void boardActions.updateBoardTitle(board.ID, newTitle)
    }

    const { title,
        setTitle,
        titleFocused,
        setTitleFocused,
        titleInputRef,
        handleOnBlurTitle } = useInlineTitleEditing(persistTitleChange, board?.Name ?? "")


    const onTitlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isViewer) return;
        if (!titleFocused) {
            e.preventDefault()
            titleInputRef.current?.focus()
            setTitleFocused(true)
        }
    }
    const topBarRef = useRef<HTMLDivElement>(null)
    const [shouldHideElements, setShouldHideElements] = useState(false)
    const [shouldHidePresence, setShouldHidePresence] = useState(false)

    useEffect(() => {
        const topBar = topBarRef.current
        if (topBar) {
            const observer = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    const width = entry.contentRect.width
                    console.log("Top bar width:", width)
                    if (width < 600) {
                        setShouldHideElements(true)
                    } else {
                        setShouldHideElements(false)
                    }
                    if (width < 400) {
                        setShouldHidePresence(true)
                    } else {
                        setShouldHidePresence(false)
                    }
                }
            })

            observer.observe(topBar)

            return () => {
                observer.disconnect()
            }
        }
    }, [])


    return (
        <div
            ref={topBarRef}
            className="flex shrink-0 text-white bg-black/20 
        backdrop-blur-md
         h-[60px] w-full items-center justify-between gap-2 px-4 ">
            <div className="flex flex-row items-center gap-2">

                <InlineEditableTitle
                    ref={titleInputRef}
                    title={title}
                    setTitle={setTitle}
                    setTitleFocused={setTitleFocused}
                    handleOnBlurTitle={handleOnBlurTitle}
                    titleFocused={titleFocused}
                    isReadonly={isViewer}
                    isDisabled={isViewer}
                    onPointerDownCapture={onTitlePointerDown}
                    className="!h-9 z-20 !w-fit !max-w-[200px] e !font-manrope !font-extrabold !tracking-normal !text-inherit !text-md rounded-lg"
                />
                <BaseBtn
                    className="!text-inherit"
                    disabled={true}
                >
                    <>
                        <ChartBarIcon className="w-4 h-4 !text-inherit " />
                        <ChevronDownIcon className="w-3 h-3 !text-inherit" />
                    </>
                </BaseBtn>
                <div className={`${shouldHideElements ? "hidden" : "flex"}`}>
                    <UserRoleBadge className="opacity-90 !shadow-lg shadow-smoke-900/50"
                        solidBg={true} shadow={true} role={role} />
                </div>

            </div>

            <div className={`${shouldHidePresence ? "hidden" : "flex"}`}>
                <CardRowMenuBtn
                    desiredBackdropOpacity={0.1}
                    offset={[8, 0]}
                    menuComponent={({ onClose, ref }) => (
                        <BoardMembersDrop onClose={onClose} ref={ref} members={members} presenceByUserId={presenceByUserId} initialFilter="online" />
                    )}
                >
                    <BoardPresenceBadge boardId={board?.ID ?? ""} />
                </CardRowMenuBtn>
            </div>


            <div className="flex items-end">
                <div className={`${shouldHideElements ? "hidden" : "flex"}`}>
                    <BaseBtn
                        className="!text-inherit  hover:!text-zinc-900"
                        onClick={() => {
                            if (!board?.ID) return;
                            void boardActions.setBoardStarred(board.ID, !isStarred);
                        }}>
                        <StarIcon className={`w-4 h-4 ${isStarred ? "text-yellow-500" : ""}`} fill={isStarred ? "currentColor" : "none"} />
                    </BaseBtn>
                    <CardRowMenuBtn
                        customId={membersActionMenuId}
                        offset={[8, 0]}
                        desiredBackdropOpacity={0.1}
                        menuComponent={({ onClose, ref }) => <BoardMembersDrop onClose={onClose} ref={ref} members={members} presenceByUserId={presenceByUserId} />}
                    >
                        <BaseBtn
                            active={isMembersActionsMenuActive}
                            className={`relative ${isMembersActionsMenuActive ? "!text-zinc-900" : "!text-inherit"} hover:!text-zinc-900`}>
                            <UsersIcon className="w-4 h-4 !text-inherit" />

                            <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 z-50
                     items-center justify-center rounded-full bg-blue-500 px-1 text-[10px]
                      font-semibold leading-none text-white">
                                {boardMembersCount}
                            </span>
                        </BaseBtn>
                    </CardRowMenuBtn>

                    <BaseBtn onClick={handleOpenBoardOffers} className="relative !text-inherit  hover:!text-zinc-900">
                        <EnvelopeIcon className="w-4 h-4 !text-inherit" />
                        {pendingOfferCount > 0 && <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold leading-none text-white">
                            {pendingOfferCount > 9 ? "9+" : pendingOfferCount}
                        </span>}
                    </BaseBtn>

                    <BoardShareMenu
                        className="!bg-slate-50 !text-slate-900 !font-semibold"
                    />
                </div>


                <BoardActionMenuBtn
                    customId={boardActionMenuId}
                    active={isBoardActionsMenuActive}
                    className={`${isBoardActionsMenuActive ? "!text-zinc-900" : "!text-inherit"} hover:!text-zinc-900`}
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
    const moreThan3 = connectedUsers.length > 3
    const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number; index: number } | null>(null)

    useEffect(() => {
        setConnectedUsers(getConnectedUsers(boardId))
    }, [boardId, getConnectedUsers, counter])

    const ringClass = "shadow-smoke-900/50 shadow-lg ring-2 ring-zinc-300/50 ring-offset-zinc-200 ring-offset-1"

    return (
        <div className="flex items-center gap-[-4px] group ">
            {connectedUsers.slice(0, 3).map((user, index) => (
                <div
                    key={user.ID}
                    style={{ zIndex: tooltip?.index === index ? 30 : index * 2 }}
                    className={`-ms-3 group-hover:ms-2
                        transition-all duration-300 ease-in-out
                        relative `}
                    onMouseEnter={(e) => {
                        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                        setTooltip({ name: user.Name, x: rect.left + rect.width / 2, y: rect.top, index })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                >
                    <UserAvatarDummy
                        user={user}
                        size={28}
                        disableHoverEffect={true}
                        className={ringClass + " !cursor-pointer"}

                    />
                </div>
            ))}
            {tooltip && createPortal(
                <div
                    style={{ position: "fixed", left: tooltip.x, top: tooltip.y, transform: "translate(-50%, calc(-100% - 8px))", zIndex: 2000 }}
                    className="pointer-events-none"
                >
                    <div className="px-2 py-1 rounded-md bg-neutral-800/95 text-neutral-100 text-xs font-medium whitespace-nowrap shadow-lg border border-neutral-700/50">
                        {tooltip.name}
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-800/95" />
                </div>,
                document.body
            )}
            {moreThan3 && <div className={`${ringClass}  group-hover:ms-2
                        transition-all duration-300 ease-in-out
                cursor-pointer
            z-20 -ms-3 flex items-center justify-center w-7 h-7 rounded-full bg-sky-500 text-white text-xs font-semibold`}>
                +{connectedUsers.length - 3}
            </div>}
        </div>
    )
}


type BaseBtnProp = {
    children?: React.ReactNode
    className?: string
    overrideClassName?: string
    label?: string
    labelClassName?: string
    onClick?: () => void
    active?: boolean
    style?: React.CSSProperties
    disabled?: boolean
}
export const BaseBtn = forwardRef<HTMLButtonElement, BaseBtnProp>(({ style, children, className, overrideClassName, label, labelClassName, onClick, active, disabled }, ref) => {
    return (
        <button ref={ref} onClick={onClick}
            style={style}
            className=

            {overrideClassName ?? `
                transition-all duration-300 ease-in-out
                flex items-center h-8 gap-1 px-2 py-1 rounded text-sm font-medium
                ${disabled ? "cursor-default opacity-50" : "cursor-pointer hover:bg-gray-200"}
           text-gray-700 transition-all ${active ? "bg-gray-200" : ""} ${className}`}
            disabled={disabled}
        >
            {children}
            {label && <span className={labelClassName}>{label}</span>}
        </button>
    )
})