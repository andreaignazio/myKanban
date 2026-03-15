import { useBoardDetailStore } from "@/stores/boardDetailStore"
import { useListsStore } from "@/stores/listsStore"
import { CardRow } from "./CardRow"
import { api } from "@/api/api"

import { useShallow } from "zustand/shallow"
import { useEffect, useRef, useState } from "react"

import { ListRowFooter } from "./ListRowFooter"
import { ActionMenuWrapper, ListActionsMenu, MoveListTab } from "./modals/ListActionsMenu"
import { useNavigate, useParams } from "react-router-dom"
import { InlineEditableTitle } from "./menuElements/InlineEditableTitle"
import { useListActionRegistry } from "@/actionRegistry/listActionRegistry"
import type { BoardListAccessMode, BoardListMirrorsResponse, List, MirrorBoardListRequest } from "@/stores/types"
import type { RefObject } from "react"
import { CustomDropDown, type MenuItem } from "./menuElements/CustomDropDown"

import { Draggable, Droppable } from "@hello-pangea/dnd"
import { LabeledButtonPresetB } from "./buttons/labeledButton"
import { EllipsisIcon, EyeIcon } from "lucide-react"
import { CardRowMenuBtn } from "./cardMenus/cardRowMenus"
import { useOverlayStore } from "@/overlays/overlayStore"
import { useUserWatchStore } from "@/stores/userWatchStore"
import { useListTheme } from "@/hooks/useListTheme"
import { useAsyncKey } from "@/stores/asyncRequestStore"
import { useAsyncRequest } from "@/hooks/useAsyncRequest"
import { AnimatePresence, motion } from "motion/react"
import { flushSync } from "react-dom"
import { LIST_CONTAINER_BOTTOM_PADDING } from "@/pages/BoardView/ListContainer"

type ListRowProps = {
    boardID: string
    boardListID: string
    index: number
    draggedCardId?: string | null
    draggedSourceBoardListId?: string | null
    isDragDisabled?: boolean
    isCardDropDisabled?: boolean
}

export function ListRow({ boardID: boardID, boardListID: boardListID, index: index, draggedCardId = null, draggedSourceBoardListId = null, isDragDisabled = false, isCardDropDisabled = false }: ListRowProps) {
    const boardList = useBoardDetailStore((state) => state.boardListById[boardListID])
    const listID = boardList?.ListID ?? ""
    const list = useListsStore(state => state.listsById[listID])
    const listCardIds = useBoardDetailStore(useShallow((state) => state.listCardIdsByListId[listID] ?? []))
    const getCardIdForListCardId = useBoardDetailStore((state) => state.getCardIdForListCardId)
    const isRootBoardList = !!boardList && boardList.ID === boardList.RootID
    const accessMode = boardList?.AccessMode === "readonly" ? "readonly" : "editable"

    // All hooks must be called before any early return (Rules of Hooks)
    const { listColor, listTextColor, hasListTheme, isReadonly } = useListTheme(list, accessMode)
    const stack = useOverlayStore(useShallow((state) => state.stack))
    const [isCardEditing, setIsCardEditing] = useState(false)
    const cardEditMenuIdPrefix = `card-edit-menu-${boardListID}`
    useEffect(() => {
        const isEditMenuOpen = stack.some((overlay) => overlay.id.startsWith(cardEditMenuIdPrefix))
        setIsCardEditing(isEditMenuOpen)
    }, [stack, cardEditMenuIdPrefix])

    const [windowHeight, setWindowHeight] = useState(() => window.innerHeight)
    useEffect(() => {
        const onResize = () => setWindowHeight(window.innerHeight)
        window.addEventListener("resize", onResize)
        return () => window.removeEventListener("resize", onResize)
    }, [])

    const footerRef = useRef<HTMLDivElement>(null)
    const [footerHeight, setFooterHeight] = useState(0)
    useEffect(() => {
        const el = footerRef.current
        if (!el) return
        const ro = new ResizeObserver(() => flushSync(() => setFooterHeight(el.offsetHeight)))
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    // chrome = topbar(48) + boardTopBar(60) + containerPads(80) + listPadding(17) + listHeader(48) + safety(16) = 269
    const maxCardsAreaHeight = Math.max(60, windowHeight - LIST_CONTAINER_BOTTOM_PADDING - footerHeight)

    const cardsMeasureRef = useRef<HTMLDivElement>(null)
    const [cardsNatHeight, setCardsNatHeight] = useState(0)
    useEffect(() => {
        const el = cardsMeasureRef.current
        if (!el) return
        const ro = new ResizeObserver(() => {
            setCardsNatHeight(el.offsetHeight)
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    const cardsAreaHeight = Math.min(cardsNatHeight, maxCardsAreaHeight)

    const key = useAsyncKey("list:create", boardListID)
    let { isLoading } = useAsyncRequest(key)


    if (!boardList || !listID) return null

    const isDragSourceList = draggedSourceBoardListId === boardListID
    const alreadyContainsDraggedCard = !!draggedCardId && !isDragSourceList && listCardIds.some((listCardId) => getCardIdForListCardId(listCardId) === draggedCardId)




    //const isCardEditing = true
    const duration = .5
    return (
        <AnimatePresence
            initial={true}
            mode="popLayout">
            <motion.div

                transition={isLoading ? { duration: duration, ease: "easeOut" } : { duration: 0.0 }}
                initial={isLoading ? { opacity: 0, scale: 1, y: 20 } : { opacity: 1, scale: 1 }}
                animate={isLoading ? { opacity: 1, scale: 1, y: 0, transition: { duration: duration, ease: "easeOut" } } : { opacity: 1, scale: 1, y: 0, transition: { duration: 0.0 } }}
                exit={isLoading ? { opacity: 0, scale: 1, y: 20, transition: { duration: duration, ease: "easeOut" } } : { opacity: 1, scale: 1, y: 0, transition: { duration: 0.0 } }}
            >

                <Draggable draggableId={boardListID} index={index} isDragDisabled={isDragDisabled}>


                    {(provided) => (
                        <div
                            {...provided.draggableProps}
                            ref={provided.innerRef}
                            className={`relative self-start min-h-0 max-h-full w-[280px] mr-4`}
                            style={{
                                ...provided.draggableProps.style,
                                color: listTextColor,
                            }}>

                            <div className={`relative group/readonly min-h-0 max-h-full w-full
                            ${isReadonly
                                    ? `border-2 border-fuchsia-400/50 pt-1 hover:pt-6 ${isCardEditing ? "pt-6" : ""}  bg-fuchsia-500/50`
                                    : " "}
                                transition-all ease-in-out duration-300
                                rounded-xl  `}
                            >

                                {isReadonly && (
                                    <div className={`pointer-events-none absolute top-1 left-2 text-xs
                                    ${isCardEditing ? "opacity-40" : "opacity-0"} transition-opacity duration-200 group-hover/readonly:opacity-40`}
                                    >
                                        READONLY
                                    </div>
                                )}

                                <div
                                    {...provided.dragHandleProps}

                                    className={` relative w-full bg-[#101204] min-h-0 
                                     flex flex-col
                                    rounded-xl p-2 pt-[9px] shadow-md shadow-black/60 
                                    ${!isRootBoardList ? "ring-4 ring-neutral-300/55" : ""}`}
                                    style={{
                                        ...(listColor ? { backgroundColor: listColor } : {}),
                                        color: listTextColor,
                                    }}
                                >

                                    <div className="relative h-10 group/list-header">
                                        <ListHeader
                                            boardListID={boardListID}
                                            listID={listID}
                                            list={list}
                                            boardID={boardID}
                                            listTextColor={listTextColor}
                                            hasListTheme={hasListTheme}
                                            showRootBadge={isRootBoardList}
                                            isReadonly={isReadonly}
                                        />
                                    </div>

                                    <Droppable droppableId={boardListID} type="card" isDropDisabled={isReadonly || alreadyContainsDraggedCard || isCardDropDisabled}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className="scrollbar-hidden"
                                                style={{ height: cardsAreaHeight, overflowY: cardsNatHeight >= (maxCardsAreaHeight) ? "auto" : "hidden" }}>

                                                <div ref={cardsMeasureRef} className="flex flex-col pt-1 pb-1">
                                                    {listCardIds && (
                                                        listCardIds.map((listCardID, cardIndex) => {
                                                            return (
                                                                <CardRow
                                                                    key={listCardID}
                                                                    index={cardIndex}
                                                                    isDragDisabled={false}
                                                                    editMenuPrefix={cardEditMenuIdPrefix}
                                                                    boardID={boardID} listId={listID} listCardID={listCardID} />

                                                            )
                                                        }))}
                                                    {provided.placeholder}
                                                </div>
                                            </div>
                                        )}
                                    </Droppable>
                                    <div className="shrink-0 pt-1" ref={footerRef}>
                                        <ListRowFooter boardID={boardID} listID={listID} isReadonly={isReadonly} />
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                </Draggable>
            </motion.div>
        </AnimatePresence>


    )
}

type ListHeaderProps = {
    list: List,
    listID: string,
    boardID: string,
    boardListID: string,
    listTextColor: string,
    hasListTheme: boolean,
    showRootBadge: boolean,
    isReadonly?: boolean,
}


const ListHeader = ({
    list,
    listID,
    boardID,
    boardListID,
    listTextColor,
    hasListTheme,
    showRootBadge,
    isReadonly = false,
}: ListHeaderProps) => {
    const isListWatched = useUserWatchStore(useShallow((state) => state.isListWatched(listID)))
    const listWatch = useUserWatchStore((state) => state.listWatchByListId[listID])
    const addListWatch = useUserWatchStore((state) => state.addListWatch)
    const setListWatched = useUserWatchStore((state) => state.patchListWatchActive)


    const listActions = useListActionRegistry()
    const [titleFocused, setTitleFocused] = useState(false)
    const [title, setTitle] = useState(list?.Title || "Untitled List")
    const [isMenuActive, setIsMenuActive] = useState(false)
    const [isEyeHovered, setIsEyeHovered] = useState(false)
    const [isEllipsisHovered, setIsEllipsisHovered] = useState(false)



    const isOverlayActive = useOverlayStore((state) => state.isActive)
    const stack = useOverlayStore(useShallow((state) => state.stack))
    const menuId = "list-actions-menu " + listID
    const mirrorMenuId = `list-mirror-menu-${boardListID}`
    useEffect(() => {
        if (!isOverlayActive(menuId)) {
            setIsMenuActive(false)
        } else {
            setIsMenuActive(true)
        }
    }, [isOverlayActive, isMenuActive, stack])



    useEffect(() => {
        setTitle(list?.Title || "Untitled List")
    }, [list?.Title])

    const handleWatchListToggle = async () => {
        if (listWatch) {
            await setListWatched(listID, !isListWatched)
            return
        }

        await addListWatch(boardID, listID)
    }


    const titleInputRef = useRef<HTMLInputElement>(null)
    const handleOnBlurTitle = () => {
        setTitleFocused(false);
        const currentTitle = titleInputRef.current?.value || "Untitled List";
        // console.log("Current Title:", currentTitle)
        // console.log("Original Title:", list?.Title)
        if (currentTitle !== list?.Title) {
            listActions.setListTitle(boardID, listID, currentTitle)
            //  cardActions.setCardTitle(boardID, listID, currentTitle)
        }
    }

    const ellipsisHoverBg = hasListTheme ? hexToRgba(listTextColor, 0.18) : "#404040"
    const ellipsisActiveBg = hasListTheme ? hexToRgba(listTextColor, 0.3) : "#d4d4d4"
    const ellipsisBg = isMenuActive ? ellipsisActiveBg : isEllipsisHovered ? ellipsisHoverBg : "transparent"
    const ellipsisColor = isMenuActive ? "#000000" : listTextColor
    const eyeBg = isEyeHovered ? ellipsisHoverBg : "transparent"

    const pointerStartRef = useRef<{ x: number; y: number } | null>(null)

    const onTitlePointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
        pointerStartRef.current = { x: e.clientX, y: e.clientY }
    }
    const onTitlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    }
    const onTitlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        const start = pointerStartRef.current
        if (!start) return
        const deltaX = Math.abs(e.clientX - start.x)
        const deltaY = Math.abs(e.clientY - start.y)
        const focusDragThreshold = 6
        if (deltaX > focusDragThreshold || deltaY > focusDragThreshold) {
            pointerStartRef.current = null
            return
        }
        pointerStartRef.current = null
        if (isReadonly) return
        setTitleFocused(true)
        requestAnimationFrame(() => {
            titleInputRef.current?.focus()
            titleInputRef.current?.select()
        })
        //titleInputRef.current?.focus()
    }
    const onTitlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    }


    return (
        <div className="w-full flex flex-row justify-between h-8 mb-2">
            <div className="flex items-center gap-2 min-w-0 mr-1">
                <InlineEditableTitle
                    ref={titleInputRef}
                    title={title}
                    setTitle={setTitle}
                    setTitleFocused={setTitleFocused}
                    handleOnBlurTitle={handleOnBlurTitle}
                    titleFocused={titleFocused}
                    isReadonly={isReadonly}
                    isDisabled={false}
                    className="!h-9  !font-medium !text-[16px] rounded-lg"
                    onPointerDownCapture={onTitlePointerDownCapture}
                    onPointerMove={onTitlePointerMove}
                    onPointerUp={onTitlePointerUp}
                    onPointerCancel={onTitlePointerCancel}

                />

                {showRootBadge && (
                    <CardRowMenuBtn
                        customId={mirrorMenuId}
                        menuComponent={({ ref, onClose }) => (
                            <ListMirrorMenu
                                boardID={boardID}
                                listID={listID}
                                boardListID={boardListID}
                                isRootBoardList={showRootBadge}
                                onClose={onClose}
                                ref={ref}
                            />
                        )}
                        desiredBackdropOpacity={0}
                        placement="bottom-start"
                    >
                        <span className="inline-flex items-center rounded-full border border-neutral-600 px-2 py-0.5 text-[10px] font-semibold text-neutral-300 hover:bg-neutral-700/40 transition-colors">
                            ROOT
                        </span>
                    </CardRowMenuBtn>
                )}
                {!showRootBadge && (
                    <CardRowMenuBtn
                        customId={mirrorMenuId}
                        menuComponent={({ ref, onClose }) => (
                            <ListMirrorMenu
                                boardID={boardID}
                                listID={listID}
                                boardListID={boardListID}
                                isRootBoardList={showRootBadge}
                                onClose={onClose}
                                ref={ref}
                            />
                        )}
                        desiredBackdropOpacity={0}
                        placement="bottom-start"
                    >
                        <span className="inline-flex items-center rounded-full border border-neutral-600 px-2 py-0.5 text-[10px] font-semibold text-neutral-300 hover:bg-neutral-700/40 transition-colors">
                            MIRROR
                        </span>
                    </CardRowMenuBtn>
                )}
            </div>

            <LabeledButtonPresetB label=""
                onClick={() => { }}
                onClickCapture={(e) => {
                    e.stopPropagation()
                    void handleWatchListToggle()
                }}
                onPointerDownCapture={(e) => e.stopPropagation()}
                style={{ backgroundColor: eyeBg }}
                className={`h-full rounded-md px-2 bg-transparent !m-0 
            cursor-pointer transition-colors duration-150
            flex items-center justify-center  !gap-0
            ${isListWatched ? "opacity-100" : "opacity-0 group-hover/list-header:opacity-100"} `}>

                <div
                    className="w-full h-full flex items-center justify-center"
                    onMouseEnter={() => setIsEyeHovered(true)}
                    onMouseLeave={() => setIsEyeHovered(false)}
                >
                    <EyeIcon className="w-4 h-4" />
                </div>
            </LabeledButtonPresetB>


            <CardRowMenuBtn
                customId={menuId}
                menuComponent={({ ref, onClose }) => <ListActionsMenu listID={listID} ref={ref} onClose={onClose} />}
                desiredBackdropOpacity={0.0}
                placement="bottom-start"
            >
                <div
                    onMouseEnter={() => setIsEllipsisHovered(true)}
                    onMouseLeave={() => setIsEllipsisHovered(false)}
                    style={{ backgroundColor: ellipsisBg, color: ellipsisColor }}
                    className={`h-full rounded-md px-2 bg-transparent 
            cursor-pointer transition-colors duration-150
            flex items-center justify-center`}>

                    <EllipsisIcon className="w-4 h-4 " />
                </div>
            </CardRowMenuBtn>



        </div>
    )
}

type ListMirrorMenuProps = {
    boardID: string;
    listID: string;
    boardListID: string;
    isRootBoardList: boolean;
    onClose: () => void;
    ref: RefObject<HTMLDivElement | null>;
}

const ListMirrorMenu = ({ boardID, listID, boardListID, isRootBoardList, onClose, ref }: ListMirrorMenuProps) => {
    const navigate = useNavigate()
    const workspaceId = useParams().workspaceId as string
    const listActions = useListActionRegistry()
    const [activeTab, setActiveTab] = useState<"instances" | "createMirror">("instances")
    const [isLoading, setIsLoading] = useState(false)
    const [updatingAccessModeByBoardListID, setUpdatingAccessModeByBoardListID] = useState<Record<string, boolean>>({})
    const [data, setData] = useState<BoardListMirrorsResponse | null>(null)

    const accessModeItems: MenuItem[] = [
        { id: "editable", label: "Editable" },
        { id: "readonly", label: "Readonly" },
    ]

    const fetchMirrors = async () => {
        setIsLoading(true)
        try {
            const response = await api.get<BoardListMirrorsResponse>(`/boards/${boardID}/boardlists/${boardListID}/mirrors`)
            setData(response.data)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        void fetchMirrors()
    }, [boardID, boardListID])

    const handleMirrorSubmit = async (payload: MirrorBoardListRequest) => {
        await listActions.mirrorBoardList(boardID, listID, payload)
        setActiveTab("instances")
        await fetchMirrors()
    }

    const handleSetMirrorAccessMode = async (targetBoardID: string, targetListID: string, targetBoardListID: string, accessMode: BoardListAccessMode) => {
        setUpdatingAccessModeByBoardListID((prev) => ({ ...prev, [targetBoardListID]: true }))
        try {
            await listActions.setListAccessMode(targetBoardID, targetListID, accessMode)
            setData((prev) => {
                if (!prev) return prev
                return {
                    ...prev,
                    Items: prev.Items.map((item) =>
                        item.BoardList.ID === targetBoardListID
                            ? { ...item, BoardList: { ...item.BoardList, AccessMode: accessMode } }
                            : item
                    )
                }
            })
            await fetchMirrors()
        } finally {
            setUpdatingAccessModeByBoardListID((prev) => ({ ...prev, [targetBoardListID]: false }))
        }
    }

    return (
        <ActionMenuWrapper
            ref={ref}
            onBack={activeTab === "createMirror" ? () => setActiveTab("instances") : undefined}
            width={330}
            Title={activeTab === "instances" ? "Mirror Menu" : "Create Mirror"}
            onClose={onClose}
        >
            {activeTab === "instances" && (
                <div className="px-3 py-2 flex flex-col gap-2 max-h-[320px] overflow-y-auto scrollbar-hidden">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-neutral-400">
                            {isRootBoardList ? "Root list instances" : "Mirror list instances"}
                        </span>
                        <button
                            className="w-6 h-6 rounded-md border border-neutral-600 text-neutral-300 hover:bg-neutral-700/40"
                            onClick={() => setActiveTab("createMirror")}
                            title="Create mirror"
                        >
                            +
                        </button>
                    </div>
                    {isLoading && <span className="text-sm text-neutral-400">Loading...</span>}
                    {!isLoading && (data?.Items?.length ?? 0) === 0 && (
                        <span className="text-sm text-neutral-400">No mirror instances found.</span>
                    )}
                    {!isLoading && data?.Items?.map((item) => {
                        const isCurrentBoard = item.Board.ID === boardID
                        const itemAccessMode: BoardListAccessMode = item.BoardList.AccessMode === "readonly" ? "readonly" : "editable"
                        const isUpdating = updatingAccessModeByBoardListID[item.BoardList.ID] === true
                        return (
                            <div
                                key={item.BoardList.ID}
                                className="w-full px-2 py-2 rounded-md hover:bg-neutral-700/40 transition-colors"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <button
                                        className="text-sm text-neutral-200 truncate text-left"
                                        onClick={() => {
                                            if (!isCurrentBoard) {
                                                navigate(`/workspaces/${workspaceId}/boards/${item.Board.ID}`)
                                            }
                                            onClose()
                                        }}
                                    >
                                        {item.Board.Name}
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {item.IsRoot && <span className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-600 text-neutral-300">ROOT</span>}
                                        {!item.IsRoot && <span className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-600 text-neutral-300">MIRROR</span>}
                                        {isCurrentBoard && <span className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-600 text-neutral-300">CURRENT</span>}
                                    </div>
                                </div>

                                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                    <CustomDropDown
                                        btnId={`mirror-access-mode-${item.BoardList.ID}`}
                                        items={accessModeItems}
                                        activeId={itemAccessMode}
                                        onClick={(id) => {
                                            if (id !== "readonly" && id !== "editable") return
                                            void handleSetMirrorAccessMode(item.Board.ID, item.BoardList.ListID, item.BoardList.ID, id)
                                        }}
                                        showChevron={true}
                                        className="!h-9"
                                        chevronClassName="w-4 h-4"
                                        isLocked={isUpdating}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {activeTab === "createMirror" && (
                <div className="text-neutral-300 h-[235px] transition-all duration-200">
                    <MoveListTab
                        sourceBoardID={boardID}
                        sourceListID={listID}
                        submitLabel="Mirror"
                        mode="mirror"
                        onSubmit={(payload) => handleMirrorSubmit(payload as MirrorBoardListRequest).then(() => onClose())}
                    />
                </div>
            )}
        </ActionMenuWrapper>
    )
}

const hexToRgba = (hex: string, alpha: number) => {
    const normalized = hex.replace("#", "")
    if (normalized.length !== 6) {
        return `rgba(255,255,255,${alpha})`
    }

    const red = Number.parseInt(normalized.slice(0, 2), 16)
    const green = Number.parseInt(normalized.slice(2, 4), 16)
    const blue = Number.parseInt(normalized.slice(4, 6), 16)

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
