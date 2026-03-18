import { useRef, useEffect, useMemo, useState } from "react";
import { useBoardDetailStore } from "@/stores/boardDetailStore";
import { Outlet, useParams } from "react-router-dom";
import { useShallow } from "zustand/shallow"
import { useBoardsStore } from "@/stores/boardsStore";
import { useAsyncRequestStore, useAsyncKey } from "@/stores/asyncRequestStore";
import { useCardsStore } from "@/stores/cardsStore";

import type { InboxCard, MoveInboxToListRequest } from "@/stores/types";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { CardDetailMenu } from "@/components/modals/CardDetailMenu";

import { useNavigate, useLocation } from "react-router-dom";
import { FloatingTabSelector, type TabType } from "@/components/menuElements/floatingTabSelector";
import { Calendar, Columns3Icon, TableColumnsSplit, WalletCardsIcon } from "lucide-react";
import type { CardContext, CardRouteState } from "@/domain/cardContext";
import { SwitchBoardsModal } from "@/components/modals/switchBoards";
import { useUserInboxStore } from "@/stores/userInboxStore";
import { DragDropContext, type DragStart, type DropResult } from "@hello-pangea/dnd"
import { ListContainer } from "./BoardView/ListContainer";
import { useBoardBackground } from "@/hooks/useBoardBackground";
import { InboxView } from "./Inbox/InboxView";
import { BoardBackgroundTransition, type BoardBackgroundSpec } from "@/components/BoardView/BoardBackgroundTransition";
import { BoardViewTopBar } from "@/components/BoardView/BoardViewTopBar";

import { BaseBtn } from "@/components/BoardView/BoardViewTopBar";
import { useAuthStore } from "@/stores/auth";

export { BaseBtn }


const EMPTY_LIST_IDS: string[] = []
const INBOX_MIN_WIDTH = 200
const INBOX_MAX_WIDTH = 640
const INBOX_DEFAULT_WIDTH = 320


export default function BoardView() {


    ///const boardListIdsByBoardId = useBoardDetailStore((state) => state.boardListIdsByBoardId)


    const { boardId, workspaceId, cardId } = useParams<{ workspaceId: string; boardId: string; cardId?: string }>()
    const setCurrentBoardId = useBoardDetailStore((state) => state.setCurrentBoardId)
    const board = useBoardsStore(useShallow((state) => boardId ? state.boardsById[boardId] : undefined))

    useEffect(() => {
        if (!boardId) {
            setCurrentBoardId(null)
            return
        }

        setCurrentBoardId(boardId)

        void useBoardDetailStore.getState().getBoardDetailPatch(boardId)

        return () => {
            setCurrentBoardId(null)
        }
    }, [boardId, setCurrentBoardId])

    // Re-hydrate user-board relation when the store has been cleared (e.g. Vite HMR reloads the
    // boardsStore module). The main effect above won't re-run because boardId hasn't changed, so
    // userBoardsById[boardId] stays empty and useCurrentBoardRole returns undefined until we
    // explicitly re-fetch. Guard against double-fetching with the in-flight loading check.
    const hasUserRelation = useBoardsStore((state) => !!boardId && !!state.userBoardsById[boardId])
    useEffect(() => {
        if (!boardId || hasUserRelation) return
        const detailKey = useAsyncKey("board:read:detail", boardId)
        if (useAsyncRequestStore.getState().getRequestState(detailKey)?.isLoading) return
        void useBoardDetailStore.getState().getBoardDetailPatch(boardId)
    }, [boardId, hasUserRelation])


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
    const routeCardContext = routeState?.cardContext

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
        const cardContext: CardContext = routeCardContext?.cardId === activeCardId
            ? routeCardContext
            : {
                cardId: activeCardId,
                sourceListId: "",
                source: "board",
                openedFrom: "direct-url",
            }

        const descriptor: OverlayDescriptor = {
            id: cardMenuId,
            render: () => <CardDetailMenu ref={cardDetailMenuRef}
                cardContext={cardContext}
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

    const floatingTabs: { id: string; label: string, icon?: React.ReactNode, type?: TabType, onClick?: () => void, disabled?: boolean }[] = [
        { id: "Inbox", label: "Inbox", icon: <WalletCardsIcon className="w-4 h-4" /> },
        { id: "Planner", label: "Planner", icon: <Calendar className="w-4 h-4" />, disabled: true },
        { id: "Board", label: "Board", icon: <Columns3Icon className="w-4 h-4" /> },
        { id: "divider1", label: "", type: "divider" },
        { id: "SwitchBoard", label: "Switch Board", type: "action", icon: <TableColumnsSplit className="w-4 h-4" />, onClick: () => handleOpenSwitchMenu() },
    ]
    const [activePanels, setActivePanels] = useState<string[]>([])
    const isInboxActive = activePanels.includes("Inbox")

    function handleTabToggle(tabId: string) {
        if (tabId === "Board") {
            // Board = show only board, collapse all panels
            setActivePanels([])
            return
        }
        setActivePanels(prev =>
            prev.includes(tabId) ? prev.filter(id => id !== tabId) : [...prev, tabId]
        )
    }

    const [inboxWidth, setInboxWidth] = useState(() => {
        const stored = localStorage.getItem("inboxPanelWidth")
        return stored ? Math.min(INBOX_MAX_WIDTH, Math.max(INBOX_MIN_WIDTH, parseInt(stored, 10))) : INBOX_DEFAULT_WIDTH
    })
    const [isResizingInbox, setIsResizingInbox] = useState(false)

    function handleInboxResizeStart(e: React.PointerEvent<HTMLDivElement>) {
        e.preventDefault()
        setIsResizingInbox(true)
        const startX = e.clientX
        const startWidth = inboxWidth
        let lastWidth = startWidth
        document.body.style.cursor = "col-resize"
        document.body.style.userSelect = "none"

        const onPointerMove = (e: PointerEvent) => {
            lastWidth = Math.min(INBOX_MAX_WIDTH, Math.max(INBOX_MIN_WIDTH, startWidth + (e.clientX - startX)))
            setInboxWidth(lastWidth)
        }
        const onPointerUp = () => {
            setIsResizingInbox(false)
            document.body.style.cursor = ""
            document.body.style.userSelect = ""
            localStorage.setItem("inboxPanelWidth", String(lastWidth))
            document.removeEventListener("pointermove", onPointerMove)
            document.removeEventListener("pointerup", onPointerUp)
        }
        document.addEventListener("pointermove", onPointerMove)
        document.addEventListener("pointerup", onPointerUp)
    }


    // const boardId = useParams().boardId as string
    const boardListIds = useBoardDetailStore(useShallow((state) => (
        boardId ? state.boardListIdsByBoardId[boardId] ?? EMPTY_LIST_IDS : EMPTY_LIST_IDS
    )))
    const setBoardListIds = useBoardDetailStore((state) => state.setBoardListIdsByBoardId)
    const setListCardIds = useBoardDetailStore((state) => state.setListCardIdsByListId)
    const getListCardIds = useBoardDetailStore((state) => state.getListCardIds)
    const getListIdForBoardListId = useBoardDetailStore((state) => state.getListIdForBoardListId)
    const getCardIdForListCardId = useBoardDetailStore((state) => state.getCardIdForListCardId)
    const persistMoveList = useBoardDetailStore((state) => state.persistMoveList)
    const persistMoveCard = useBoardDetailStore((state) => state.persistMoveCardInBoard)
    const boardListById = useBoardDetailStore((state) => state.boardListById)
    const insertTempCopyCardPlaceholder = useBoardDetailStore((state) => state.insertTempCopyCardPlaceholder)
    const removeCopyPlaceholder = useBoardDetailStore((state) => state.removeCopyPlaceholder)
    const copyCardToList = useCardsStore((state) => state.copyCardToList)
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
                Pos: "",
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
            const previousBoardListIds = Array.from(boardListIds)
            const newBoardListIds = Array.from(boardListIds)
            newBoardListIds.splice(source.index, 1)
            newBoardListIds.splice(destination.index, 0, draggableId)
            setBoardListIds(boardId, newBoardListIds)
            //We need to get the id of the list that is after the moved list in the new order so that 
            // the server can correctly compute the new position of the moved list. If the moved list is now the last one, we pass null as the id of the list after it.
            let beforeId = destination.index < newBoardListIds.length - 1 ? newBoardListIds[destination.index + 1] : null
            persistMoveList(boardId, draggableId, beforeId, previousBoardListIds)
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
                persistMoveCard(movedListCardId, destinationListId, sourceListId, beforeId, sourceListCardIds, sourceListCardIds)

            }
            // Moving to a different list
            else {
                const newDestinationListCardIds = Array.from(destinationListCardIds)
                //Check if alreay there
                if (newDestinationListCardIds.map(id => getCardIdForListCardId(id)).includes(getCardIdForListCardId(movedListCardId) ?? "")) {
                    return
                }

                const isSourceReadonly = boardListById[source.droppableId]?.AccessMode === "readonly"

                if (isSourceReadonly) {
                    // Copy branch: insert optimistic placeholder, swap on WS event
                    const movedListCard = listcardById[movedListCardId]
                    if (!movedListCard || !boardId) return
                    const correlationID = crypto.randomUUID()
                    insertTempCopyCardPlaceholder(correlationID, movedListCard.CardID, destinationListId, destination.index)
                    const beforeCardId = destination.index < destinationListCardIds.length
                        ? getCardIdForListCardId(destinationListCardIds[destination.index]) ?? null
                        : null
                    copyCardToList(
                        boardId,
                        movedListCard.CardID,
                        {
                            TargetListID: destinationListId,
                            TargetBoardID: boardId,
                            BeforeID: beforeCardId,
                            InsertAt: beforeCardId ? null : "end",
                            KeepComments: true,
                            KeepMembers: true,
                            KeepLabels: true,
                            KeepChecklists: true,
                        },
                        correlationID,
                        () => removeCopyPlaceholder(correlationID),
                    )
                    // Safety net: remove placeholder if WS event never arrives
                    setTimeout(() => removeCopyPlaceholder(correlationID), 10_000)
                    return
                }

                const newSourceListCardIds = Array.from(sourceListCardIds)
                newSourceListCardIds.splice(source.index, 1)
                setListCardIds(sourceListId, newSourceListCardIds)


                newDestinationListCardIds.splice(destination.index, 0, movedListCardId)
                setListCardIds(destinationListId, newDestinationListCardIds)
                let beforeId = destination.index < newDestinationListCardIds.length - 1 ? newDestinationListCardIds[destination.index + 1] : null
                persistMoveCard(movedListCardId, destinationListId, sourceListId, beforeId, sourceListCardIds, destinationListCardIds)
            }
        }
    }

    return (
        <>
            <div className="absolute inset-0 -z-20 bg-main" />
            <div className=" relative flex flex-row gap-0 h-full w-[100vw] ">

                <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <div
                        style={{
                            paddingBottom: isInboxActive ? 40 : 0,
                            width: isInboxActive ? inboxWidth : 0,
                        }}
                        className={`min-h-0 relative flex-shrink-0 bg-transparent
                            ${isInboxActive ? "mx-2 me-[9px] overflow-visible" : "mx-0 overflow-hidden"}
                            ${!isResizingInbox ? "transition-[width,margin,padding] duration-200" : ""}`}>

                        <InboxView draggedRootListCardId={draggedRootListCardId} />

                        {isInboxActive && (
                            <div
                                onPointerDown={handleInboxResizeStart}
                                className="absolute top-0 -right-[12px] w-4 h-full cursor-col-resize z-20 flex items-center justify-center group"
                            >
                                <div className={`w-[2px] rounded-full transition-all duration-150
                                    ${isResizingInbox
                                        ? "h-24 bg-neutral-300/60"
                                        : "h-10 bg-neutral-600/30 group-hover:h-20 group-hover:bg-neutral-400/60"}`}
                                />
                            </div>
                        )}
                    </div>
                    {boardId && (

                        <div
                            className={` flex flex-col items-start justify-start h-full min-h-0 flex-1 transition-all 
                                 
                                ${isInboxActive ? "pe-2" : ""} 
                                 relative pb-2 overflow-hidden`}
                        >
                            <div
                                style={{ borderRadius: isInboxActive ? 20 : 0, width: isInboxActive ? "calc(100% - 8px)" : "100%", height: isInboxActive ? "calc(100% - 40px)" : "100%", }}
                                className={`${isInboxActive ? "opacity-100" : "opacity-0"} transition-opacity duration-300 bg-transparent
                                absolute inset-0 z-50  border border-gray-300/50 pointer-events-none antialiased `} />
                            <div
                                className=" flex h-fit min-h-0 w-full flex-col overflow-hidden  "
                                style={{ borderRadius: isInboxActive ? "20px 20px 0px 0" : 0, overflow: "hidden" }}
                            >
                                <BoardViewTopBar board={board} backgroundType={backgroundType} />
                            </div>
                            <div
                                style={{
                                    height: isInboxActive ? "calc(100% - 40px)" : "100%", width: isInboxActive ? "calc(100% - 8px)" : "100%",
                                    paddingBottom: isInboxActive ? 40 : 0, borderRadius: isInboxActive ? 20 : 0, overflow: "hidden"
                                }}
                                className={`absolute inset-0 transition-all w-full min-h-0 pointer-events-none   `}>
                                <BoardBackgroundTransition target={targetBackground} />
                            </div>

                            <div
                                style={{ paddingTop: 0, paddingBottom: 0, }}
                                className={`
                               
                                flex-1 min-h-0 w-full ps-0 pe-0 scrollbar-hidden `}>

                                <ListContainer draggedCardId={draggedCardId} draggedSourceBoardListId={draggedSourceBoardListId} />

                            </div>


                        </div>





                    )}
                </DragDropContext >

                <Outlet />
            </div >
            <div className="absolute bottom-0 flex flex-row w-full  py-4 items-center justify-center ">
                <FloatingTabSelector
                    activeTabs={["Board", ...activePanels]}
                    onTabToggle={handleTabToggle}
                    tabs={floatingTabs}
                />
            </div>
        </>

    )

}






