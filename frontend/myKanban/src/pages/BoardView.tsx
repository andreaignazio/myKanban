import { forwardRef, useRef, useEffect, useMemo, useState } from "react";
import { ListRow } from "../components/ListRow";
import { useBoardDetailStore } from "@/stores/boardDetailStore";
import { Outlet, useParams } from "react-router-dom";
import { useShallow } from "zustand/shallow"
import { useBoardWebSocket } from "@/hooks/ws/useBoardWS";
import { useBoardsStore } from "@/stores/boardsStore";
import { ListAdd } from "@/components/ListAdd";

import type { Board, Card, UserLite } from "@/stores/types";
import { ChartBarIcon, FunnelIcon, UsersIcon, } from "@heroicons/react/24/solid";
import { ChevronDownIcon, EnvelopeIcon, StarIcon } from "@heroicons/react/24/outline";
import { usePresenceStore } from "@/stores/presenceStore";
import { BoardActionMenuBtn } from "@/components/modals/BoardActionMenu";
import { BoardShareMenu } from "@/components/modals/BoardShareMenu";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { CardDetailMenu } from "@/components/modals/CardDetailMenu";
import { BoardOfferManager } from "@/components/OffersLists/BoardOfferManager";

import { useNavigate, useLocation, type Location } from "react-router-dom";
import { FloatingTabSelector, type TabType } from "@/components/menuElements/floatingTabSelector";
import { Calendar, Columns3Icon, Inbox, List, TableColumnsSplit, WalletCardsIcon } from "lucide-react";
import { CardRow, type CardRouteState } from "@/components/CardRow";
import { SwitchBoardsModal } from "@/components/modals/switchBoards";
import { useUserInboxStore } from "@/stores/userInboxStore";
import { CardRowInbox } from "@/components/cardRowInbox";
import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry";
import { useBoardActionRegistry } from "@/actionRegistry/boardActionRegistry";
import { CustomInput, type CustomInputHandle } from "@/components/menuElements/CustomInput";
import { LabeledButtonPresetBSubmit } from "@/components/buttons/labeledButton/LabeledButtonPresetBSubmit";
import { LabeledButtonPresetB } from "@/components/buttons/labeledButton";
import { useBoardMembersStore } from "@/stores/boardMembersStore";
import { DragDropContext, Droppable } from "@hello-pangea/dnd"
import { ListContainer } from "./BoardView/ListContainer";
import { useBoardBackground } from "@/hooks/useBoardBackground";
import { useIsOverlayActive } from "@/hooks/useIsOverlayActive";
import { InboxView } from "./Inbox/InboxView";
import { useSmoothBoardBackground, type BoardBackgroundSpec } from "@/hooks/useSmoothBoardBackground";


const EMPTY_LIST_IDS: string[] = []

const PADDING_X = 8

function BoardBackgroundLayer({ spec }: { spec: BoardBackgroundSpec }) {
    if (spec.kind === "color") {
        return (
            <div
                className={`absolute inset-0 ${spec.className}`.trim()}
                style={!spec.className ? { backgroundColor: spec.colorToken ?? "#0f172a" } : undefined}
            />
        )
    }

    return (
        <div
            className="absolute inset-0 bg-center bg-cover"
            style={{ backgroundImage: `url('${spec.url}')` }}
        />
    )
}

function BoardBackgroundTransition({ target }: { target: BoardBackgroundSpec }) {
    const { activeBackground, incomingBackground, incomingVisible } = useSmoothBoardBackground(target, {
        transitionMs: 320,
        frameDelayMs: 16,
    })

    return (
        <div className="absolute inset-0 -z-10 pointer-events-none">
            <div className="absolute inset-0 opacity-100 transition-opacity duration-300 ease-out">
                <BoardBackgroundLayer spec={activeBackground} />
            </div>
            {incomingBackground && (
                <div className={`absolute inset-0 transition-opacity duration-300 ease-out ${incomingVisible ? "opacity-100" : "opacity-0"}`}>
                    <BoardBackgroundLayer spec={incomingBackground} />
                </div>
            )}
        </div>
    )
}

export default function BoardView() {


    ///const boardListIdsByBoardId = useBoardDetailStore((state) => state.boardListIdsByBoardId)


    const { boardId, workspaceId, cardId } = useParams<{ workspaceId: string; boardId: string; cardId?: string }>()
    const setCurrentBoardId = useBoardDetailStore((state) => state.setCurrentBoardId)
    const board = useBoardsStore(useShallow((state) => boardId ? state.boardsById[boardId] : undefined))

    useEffect(() => {
        // console.log("BoardView: boardId changed to", boardId)
        if (boardId) {
            (async () => {
                await useBoardDetailStore.getState().getBoardDetailPatch(boardId)

                setCurrentBoardId(boardId)
            })()
        }
    }, [boardId, setCurrentBoardId])


    const { backgroundType, backgroundColorToken, backgroundColorClassName, resolvedBackgroundUrl } = useBoardBackground({ board })
    const targetBackground = useMemo<BoardBackgroundSpec>(() => {
        if (backgroundType === "color" && backgroundColorToken) {
            return {
                kind: "color",
                className: backgroundColorClassName,
                colorToken: backgroundColorToken,
            }
        }

        return {
            kind: "image",
            url: resolvedBackgroundUrl,
        }
    }, [backgroundType, backgroundColorToken, backgroundColorClassName, resolvedBackgroundUrl])


    //useBoardWebSocket(workspaceId ?? "", boardId ?? null)

    const navigate = useNavigate()
    const location = useLocation()
    const openOverlay = useOverlayStore((state) => state.open);
    const closeMenu = useOverlayStore((state) => state.close);


    const cardMenuId = "cardDetailMenu";
    const boardRoute = `/workspaces/${workspaceId}/boards/${boardId}`
    const routeState = location.state as CardRouteState | null
    const sourceListId = routeState?.sourceListId

    function navigateToBoardOrBack() {
        const backgroundLocation = routeState?.backgroundLocation
        if (backgroundLocation) {
            const backgroundPath = `${backgroundLocation.pathname}${backgroundLocation.search}${backgroundLocation.hash}`
            const isBoardBackground = backgroundLocation.pathname.startsWith(`/workspaces/${workspaceId}/boards/`)
            if (isBoardBackground) {
                navigate(backgroundPath, { replace: true, state: backgroundLocation.state })
                return
            }
        }
        navigate(boardRoute, { replace: true })
    }

    function closeCardDetailMenu() {
        closeMenu(cardMenuId)
    }

    function requestCloseCardDetailMenu() {
        closeCardDetailMenu()
        navigateToBoardOrBack()
    }


    const cardDetailMenuRef = useRef<HTMLDivElement>(null)
    function handleOpenCardDetailMenu(activeCardId: string) {
        // console.log("Opening card detail menu for cardId", activeCardId);

        const descriptor: OverlayDescriptor = {
            id: cardMenuId,
            render: () => <CardDetailMenu ref={cardDetailMenuRef}
                cardId={activeCardId} listId={sourceListId}
                onClose={() => requestCloseCardDetailMenu()}
            />,
            panelRef: cardDetailMenuRef,
            type: "modal",
            renderType: "virtual",
            exclusiveGroup: "card-detail-modal",
            opts: {
                closeOnMouseLeave: false,
                closeOnClickOutside: true,
                closeOnEscape: true,
                lockBackdrop: true,
            },
            position: {
                virtual: "viewport-center"
            }
        }
        openOverlay(descriptor);

    }
    const isCardDetailMenuOpen = useOverlayStore((state) => state.isActive(cardMenuId))
    const wasCardDetailMenuOpenRef = useRef(false)

    useEffect(() => {
        const wasOpen = wasCardDetailMenuOpenRef.current

        if (!cardId) {
            if (isCardDetailMenuOpen) {
                closeCardDetailMenu()
            }
            wasCardDetailMenuOpenRef.current = false
            return
        }

        if (!isCardDetailMenuOpen) {
            if (wasOpen) {
                navigateToBoardOrBack()
            } else {
                handleOpenCardDetailMenu(cardId)
            }
        }

        wasCardDetailMenuOpenRef.current = isCardDetailMenuOpen
    }, [cardId, isCardDetailMenuOpen, location.key])



    const openSwitchMenu = useOverlayStore((state) => state.open)
    const closeSwitchMenu = useOverlayStore((state) => state.close);
    const shareActionModalRef = useRef<HTMLDivElement | null>(null);


    function handleOpenSwitchMenu() {
        // console.log("Opening switch menu");
        const id = "switchBoardMenu";
        const descriptor: OverlayDescriptor = {
            id: id,
            render: () => <SwitchBoardsModal ref={shareActionModalRef} onClose={() => closeSwitchMenu(id)} />,
            panelRef: shareActionModalRef,
            type: "modal",
            renderType: "virtual",
            exclusiveGroup: "board-view-modals",
            opts: {
                closeOnMouseLeave: false,
                closeOnClickOutside: true,
                closeOnEscape: true,
                lockBackdrop: true,
            },
            position: {
                virtual: "viewport-center"
            }
        }
        openSwitchMenu(descriptor);

    }

    const floatingTabs: { id: string; label: string, icon?: React.ReactNode, type?: TabType, onClick?: () => void }[] = [
        { id: "Inbox", label: "Inbox", icon: <WalletCardsIcon className="w-4 h-4" /> },
        { id: "Planner", label: "Planner", icon: <Calendar className="w-4 h-4" /> },
        { id: "Board", label: "Board", icon: <Columns3Icon className="w-4 h-4" /> },
        { id: "divider1", label: "", type: "divider" },
        { id: "SwitchBoard", label: "Switch Board", icon: <TableColumnsSplit className="w-4 h-4" />, onClick: () => handleOpenSwitchMenu() },
    ]
    const [activeFloatingTab, setActiveFloatingTab] = useState("Board")
    const isInboxActive = activeFloatingTab === "Inbox"

    const paddingBottom = isInboxActive ? "pb-[70px]" : "pb-[70px]"

    const bottomPX = "90px"
    return (
        <>
            <div className="absolute inset-0 -z-20 bg-menusec" />
            <div className="flex flex-row gap-3 h-full w-full overflow-hidden ">
                <div className={`h-[calc(100vh-120px)] min-h-0 relative flex-shrink-0  transition-all 
                ${activeFloatingTab === "Inbox" ? "w-80" : "w-0"}
                 bg-transparent overflow-hidden
                 `

                }>

                    <InboxView></InboxView>


                </div>
                {boardId && (
                    <div className={`flex-shrink-0 h-full transition-all 
                    ${isInboxActive ? ` rounded-2xl overflow-hidden` : ""} w-full`}>
                        <div className={`relative w-full h-full min-h-0 flex flex-col`}>
                            <div className={`absolute inset-0 transition-all ${isInboxActive ? `bottom-[${bottomPX}]` : ""} `}>
                                <BoardBackgroundTransition target={targetBackground} />
                            </div>

                            <BoardViewTopBar board={board} backgroundType={backgroundType} />

                            <div className={`flex flex-1 min-h-0 w-full ps-4 py-0 ${paddingBottom} overflow-hidden scrollbar-hidden`}>

                                <ListContainer />

                            </div>

                        </div>
                    </div>
                )}

                <Outlet />
            </div>
            <div className="absolute bottom-0 flex flex-row w-full  py-4 items-center justify-center ">
                <FloatingTabSelector activeTab={activeFloatingTab} setActiveTab={setActiveFloatingTab} tabs={floatingTabs} />
            </div>
        </>

    )

}




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

