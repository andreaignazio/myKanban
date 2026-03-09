import { forwardRef, useRef, useEffect, useMemo, useState } from "react";
import { ListRow } from "../components/ListRow";
import { useBoardDetailStore } from "@/stores/boardDetailStore";
import { Outlet, useParams } from "react-router-dom";
import { useShallow } from "zustand/shallow"
import { useBoardWebSocket } from "@/hooks/ws/useBoardWS";
import { useBoardsStore } from "@/stores/boardsStore";
import { ListAdd } from "@/components/ListAdd";

import type { Board, Card, InboxCard, MoveInboxToListRequest, UserLite } from "@/stores/types";
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
import { DragDropContext, Droppable, type DragStart, type DropResult } from "@hello-pangea/dnd"
import { ListContainer } from "./BoardView/ListContainer";
import { useBoardBackground } from "@/hooks/useBoardBackground";
import { useIsOverlayActive } from "@/hooks/useIsOverlayActive";
import { InboxView } from "./Inbox/InboxView";
import { useSmoothBoardBackground, type BoardBackgroundSpec } from "@/hooks/useSmoothBoardBackground";
import { BoardViewTopBar } from "@/components/BoardView/BoardViewTopBar";

import { BaseBtn } from "@/components/BoardView/BoardViewTopBar";
import { useAuthStore } from "@/stores/auth";

export { BaseBtn }


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


    // const boardId = useParams().boardId as string
    const boardListIds = useBoardDetailStore(useShallow((state) => (
        boardId ? state.boardListIdsByBoardId[boardId] ?? EMPTY_LIST_IDS : EMPTY_LIST_IDS
    )))
    const uniqueBoardListIds = Array.from(new Set(boardListIds))
    const setBoardListIds = useBoardDetailStore((state) => state.setBoardListIdsByBoardId)
    const setListCardIds = useBoardDetailStore((state) => state.setListCardIdsByListId)
    const getListCardIds = useBoardDetailStore((state) => state.getListCardIds)
    const getListIdForBoardListId = useBoardDetailStore((state) => state.getListIdForBoardListId)
    const getCardIdForListCardId = useBoardDetailStore((state) => state.getCardIdForListCardId)
    const persistMoveList = useBoardDetailStore((state) => state.persistMoveList)
    const persistMoveCard = useBoardDetailStore((state) => state.persistMoveCardInBoard)
    const moveInboxCard = useUserInboxStore((state) => state.moveInboxCard)
    const moveInboxCardToBoard = useUserInboxStore((state) => state.moveInboxCardToListInBoard)
    const mirrorCardToInbox = useUserInboxStore((state) => state.mirrorCardToInbox)
    const getInboxCardByRootCardID = useUserInboxStore((state) => state.getInboxCardByRootCardID)
    const inboxCardsById = useUserInboxStore((state) => state.inboxCardsById)
    const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
    const [draggedRootListCardId, setDraggedRootListCardId] = useState<string | null>(null)
    const [draggedSourceBoardListId, setDraggedSourceBoardListId] = useState<string | null>(null)

    function handleDragStart(start: DragStart) {
        if (start.draggableId.startsWith("inbox:")) {
            setDraggedCardId(start.draggableId.split(":")[1] ?? null)
            setDraggedRootListCardId(null)
            setDraggedSourceBoardListId(null)
            return
        }

        setDraggedCardId(getCardIdForListCardId(start.draggableId))
        const draggedListCard = listcardById[start.draggableId]
        setDraggedRootListCardId(draggedListCard?.RootID ?? draggedListCard?.ID ?? null)
        setDraggedSourceBoardListId(start.source.droppableId)
    }

    const inboxCardIds = useUserInboxStore(useShallow((state) => state.inboxCardsIds))
    const setInboxCardIds = useUserInboxStore((state) => state.setInboxCardIds)
    const mergeInboxCardEntities = useUserInboxStore((state) => state.mergeInboxCardEntities)
    const currentUserId = useAuthStore(useShallow((state) => state.userID)) ?? ""
    const listcardById = useBoardDetailStore((state) => state.listCardById)

    function handleDragEnd(result: DropResult) {

        setDraggedCardId(null)
        setDraggedRootListCardId(null)
        setDraggedSourceBoardListId(null)


        const { destination, source, draggableId, type } = result

        if (!destination) return
        if (destination.droppableId === source.droppableId && destination.index === source.index) return

        if (destination.droppableId === "inbox") {
            if (draggableId.startsWith("inbox:")) {
                const movedInboxCardId = inboxCardIds[source.index]
                if (!movedInboxCardId) return

                const actualCardId = draggableId.split(":")[1]
                const reorderedInboxCardIds = [...inboxCardIds]
                reorderedInboxCardIds.splice(source.index, 1)
                reorderedInboxCardIds.splice(destination.index, 0, movedInboxCardId)
                setInboxCardIds(reorderedInboxCardIds)

                const beforeInboxCardId = destination.index < reorderedInboxCardIds.length - 1
                    ? reorderedInboxCardIds[destination.index + 1]
                    : null

                void moveInboxCard(
                    actualCardId,
                    {
                        BeforeID: beforeInboxCardId,
                        InsertAt: beforeInboxCardId ? null : "end",
                    },
                    inboxCardIds,
                )
                return
            }
            const movedListCardId = draggableId
            const movedListCard = listcardById[movedListCardId]
            if (!movedListCard) return

            const rootListCardId = movedListCard.RootID ?? movedListCard.ID
            if (getInboxCardByRootCardID(rootListCardId)) {
                return
            }

            const optimisticListCardId = `optimistic-inbox-${movedListCard.ID}`
            const beforeId = destination.index < inboxCardIds.length
                ? inboxCardIds[destination.index]
                : null
            const newInboxCard: InboxCard = {
                ID: optimisticListCardId,
                UserID: currentUserId,
                CardID: movedListCard?.CardID ?? "",
                Position: "",
                CreatedAt: new Date().toISOString(),
                UpdatedAt: new Date().toISOString(),
                DeletedAt: null,
                RootListCardID: rootListCardId,
                SourceBoardID: boardId ?? "",
                Mirrors: []
            }
            mergeInboxCardEntities([newInboxCard])
            const newInboxCardIds = Array.from(inboxCardIds)
            newInboxCardIds.splice(destination.index, 0, optimisticListCardId)
            setInboxCardIds(newInboxCardIds)
            void mirrorCardToInbox(
                boardId ?? "",
                movedListCard.CardID,
                {
                    BeforeID: beforeId,
                    InsertAt: beforeId ? null : "end",
                },
                optimisticListCardId,
                inboxCardIds,
            )
            return
        }




        if (draggableId.startsWith("inbox:")) {
            if (!workspaceId || !boardId) return
            const actualCardId = draggableId.split(":")[1]
            const destinationListId = getListIdForBoardListId(destination.droppableId)
            if (!destinationListId) return
            const destinationListCardIds = getListCardIds(destinationListId)
            const optimisticListCardId = `optimistic-inbox-${actualCardId}`
            const optimisticRootListCardId = Object.values(inboxCardsById).find((inboxCard) => inboxCard.CardID === actualCardId)?.RootListCardID
            const optimisticNow = new Date().toISOString()
            useBoardDetailStore.getState().mergeListCardsPatch({
                [optimisticListCardId]: {
                    ID: optimisticListCardId,
                    CardID: actualCardId,
                    ListID: destinationListId,
                    Position: "",
                    CreatedAt: optimisticNow,
                    UpdatedAt: optimisticNow,
                    DeletedAt: null,
                    RootID: optimisticRootListCardId || optimisticListCardId,
                }
            })
            const optimisticDestinationListCardIds = [...destinationListCardIds]
            optimisticDestinationListCardIds.splice(destination.index, 0, optimisticListCardId)
            setListCardIds(destinationListId, optimisticDestinationListCardIds)
            const beforeListCardId = destination.index < destinationListCardIds.length
                ? destinationListCardIds[destination.index]
                : null
            const beforeId = beforeListCardId ? getCardIdForListCardId(beforeListCardId) : null
            const requst: MoveInboxToListRequest = {
                InsertAt: beforeId ? null : "end",
                BeforeID: beforeId,
            }
            moveInboxCardToBoard(actualCardId, workspaceId, boardId, destinationListId, requst, optimisticListCardId, destinationListCardIds)
            return
        }

        if (type === "list") {

            if (!workspaceId || !boardId) return
            const newBoardListIds = Array.from(boardListIds)
            newBoardListIds.splice(source.index, 1)
            newBoardListIds.splice(destination.index, 0, draggableId)
            setBoardListIds(boardId, newBoardListIds)
            //We need to get the id of the list that is after the moved list in the new order so that 
            // the server can correctly compute the new position of the moved list. If the moved list is now the last one, we pass null as the id of the list after it.
            let beforeId = destination.index < newBoardListIds.length - 1 ? newBoardListIds[destination.index + 1] : null
            persistMoveList(boardId, draggableId, beforeId)
        }
        else if (type === "card") {
            const sourceListId = getListIdForBoardListId(source.droppableId)
            const destinationListId = getListIdForBoardListId(destination.droppableId)
            if (!sourceListId || !destinationListId) return

            const sourceListCardIds = getListCardIds(sourceListId)
            const destinationListCardIds = getListCardIds(destinationListId)
            const movedListCardId = draggableId

            // Moving within the same list
            if (sourceListId === destinationListId) {
                const newListCardIds = Array.from(sourceListCardIds)
                newListCardIds.splice(source.index, 1)
                newListCardIds.splice(destination.index, 0, movedListCardId)
                setListCardIds(sourceListId, newListCardIds)
                let beforeId = destination.index < newListCardIds.length - 1 ? newListCardIds[destination.index + 1] : null
                // const cardId = cardIdForListCardId(movedListCardId) ?? ""
                persistMoveCard(movedListCardId, destinationListId, sourceListId, beforeId)

            }
            // Moving to a different list
            else {
                const newDestinationListCardIds = Array.from(destinationListCardIds)
                //Check if alreay there
                if (newDestinationListCardIds.map(id => getCardIdForListCardId(id)).includes(getCardIdForListCardId(movedListCardId) ?? "")) {
                    return
                }

                const newSourceListCardIds = Array.from(sourceListCardIds)
                newSourceListCardIds.splice(source.index, 1)
                setListCardIds(sourceListId, newSourceListCardIds)


                newDestinationListCardIds.splice(destination.index, 0, movedListCardId)
                setListCardIds(destinationListId, newDestinationListCardIds)
                let beforeId = destination.index < newDestinationListCardIds.length - 1 ? newDestinationListCardIds[destination.index + 1] : null
                //const cardId = cardIdForListCardId(movedListCardId) ?? ""
                console.log("movedListCardId", movedListCardId, "sourceListId", sourceListId, "destinationListId", destinationListId, "beforeId", beforeId)
                persistMoveCard(movedListCardId, destinationListId, sourceListId, beforeId)
            }
        }
    }

    return (
        <>
            <div className="absolute inset-0 -z-20 bg-menusec" />
            <div className="flex flex-row gap-3 h-full w-full overflow-hidden ">

                <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <div className={`h-[calc(100vh-120px)] min-h-0 relative flex-shrink-0  transition-all 
                ${activeFloatingTab === "Inbox" ? "w-80" : "w-0"}
                 bg-transparent overflow-hidden
                 `}>

                        <InboxView draggedRootListCardId={draggedRootListCardId}></InboxView>

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

                                    <ListContainer draggedCardId={draggedCardId} draggedSourceBoardListId={draggedSourceBoardListId} />

                                </div>

                            </div>
                        </div>
                    )}
                </DragDropContext>

                <Outlet />
            </div>
            <div className="absolute bottom-0 flex flex-row w-full  py-4 items-center justify-center ">
                <FloatingTabSelector activeTab={activeFloatingTab} setActiveTab={setActiveFloatingTab} tabs={floatingTabs} />
            </div>
        </>

    )

}






