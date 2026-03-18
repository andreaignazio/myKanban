import { useBoardDetailStore } from "@/stores/boardDetailStore"
import { useListsStore } from "@/stores/listsStore"
import { CardRow } from "./CardRow"

import { useShallow } from "zustand/shallow"
import { useEffect, useRef, useState } from "react"

import { ListRowFooter } from "./ListRowFooter"
import { ListActionsMenu } from "./modals/ListActionsMenu"
import { InlineEditableTitle } from "./menuElements/InlineEditableTitle"
import { useListActionRegistry } from "@/actionRegistry/listActionRegistry"
import type { List } from "@/stores/types"
import { ListMirrorMenuV2 } from "./listMenus/ListMirrorMenuV2"

import { Draggable, Droppable } from "@hello-pangea/dnd"
import { EllipsisIcon, EyeIcon, Lock, LockOpen } from "lucide-react"
import { IconButtonAsync } from "./buttons/IconButtonAsync"
import { CardRowMenuBtn } from "./cardMenus/cardRowMenus"
import { useOverlayStore } from "@/overlays/overlayStore"
import { useUserWatchStore } from "@/stores/userWatchStore"
import { useListTheme } from "@/hooks/useListTheme"
import { useListEditableContext } from "@/hooks/useListEditableContext"
import { useAsyncKey } from "@/stores/asyncRequestStore"
import { useAsyncRequest } from "@/hooks/useAsyncRequest"
import { AnimatePresence, motion } from "motion/react"
import { flushSync } from "react-dom"
import { LIST_CONTAINER_BOTTOM_PADDING } from "@/pages/BoardView/ListContainer"
import { useInlineTitleEditing } from "@/hooks/useInlineTitleEditing"

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
    const { canEditList, isReadonly, isRootBoardList, accessMode } = useListEditableContext({ boardID, boardListID })

    // All hooks must be called before any early return (Rules of Hooks)
    const { listColor, listTextColor, hasListTheme } = useListTheme(list, accessMode)
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
                                            isReadonly={!canEditList}
                                        />
                                    </div>

                                    <Droppable droppableId={boardListID} type="card" isDropDisabled={!canEditList || alreadyContainsDraggedCard || isCardDropDisabled}>
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
                                                                    isDragDisabled={!canEditList}
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
                                        <ListRowFooter boardID={boardID} listID={listID} isReadonly={!canEditList} />
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



    const [isMenuActive, setIsMenuActive] = useState(false)
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





    const handleWatchListToggle = async () => {
        if (listWatch) {
            await setListWatched(listID, !isListWatched)
            return
        }

        await addListWatch(boardID, listID)
    }

    const persistTitleChange = (newTitle: string) => listActions.setListTitle(boardID, listID, newTitle)

    const { title,
        setTitle,
        titleFocused,
        setTitleFocused,
        titleInputRef,
        handleOnBlurTitle } = useInlineTitleEditing(persistTitleChange, list.Title)



    const ellipsisHoverBg = hasListTheme ? hexToRgba(listTextColor, 0.18) : "#404040"
    const ellipsisActiveBg = hasListTheme ? hexToRgba(listTextColor, 0.3) : "#d4d4d4"
    const ellipsisBg = isMenuActive ? ellipsisActiveBg : isEllipsisHovered ? ellipsisHoverBg : "transparent"
    const ellipsisColor = isMenuActive ? "#000000" : listTextColor

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
        <div className="w-full flex flex-row items-center justify-between h-8 mb-2">

            <InlineEditableTitle
                ref={titleInputRef}
                title={title}
                setTitle={setTitle}
                setTitleFocused={setTitleFocused}
                handleOnBlurTitle={handleOnBlurTitle}
                titleFocused={titleFocused}
                isReadonly={isReadonly}
                isDisabled={false}
                className="!h-9 !font-medium !text-[16px] !w-[108px] rounded-lg"
                inputClassName="!max-w-[108px]"
                onPointerDownCapture={onTitlePointerDownCapture}
                onPointerMove={onTitlePointerMove}
                onPointerUp={onTitlePointerUp}
                onPointerCancel={onTitlePointerCancel}

            />
            <div className="flex flex-row items-center h-8 justify-end gap-1 min-w-0 ">
                <CardRowMenuBtn
                    customId={mirrorMenuId}
                    menuComponent={({ ref, onClose }) => (
                        <ListMirrorMenuV2
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
                    <span className="inline-flex items-center gap-1 rounded-full border border-neutral-600 px-2 py-0.5 text-[10px] font-semibold text-neutral-300 hover:bg-neutral-700/40 transition-colors">
                        {showRootBadge ? "ROOT" : "MIRROR"}
                        {list.ExternalAccess === "restricted"
                            ? <Lock size={10} className="text-red-400 shrink-0 -translate-y-px" />
                            : <LockOpen size={10} className="text-green-400 shrink-0 -translate-y-px" />
                        }
                    </span>
                </CardRowMenuBtn>


                <div
                    onClick={(e) => {
                        e.stopPropagation()
                        void handleWatchListToggle()
                    }}
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    className={`h-full flex items-center justify-center cursor-pointer
            ${isListWatched ? "opacity-100" : "opacity-0 group-hover/list-header:opacity-100"}`}
                >
                    <IconButtonAsync
                        asyncKey={[useAsyncKey("watch:patch:list", listID), useAsyncKey("watch:add:list", listID)]}
                        icon={EyeIcon}
                        size={16}
                        idleColorClass={isListWatched ? "text-neutral-300" : "text-neutral-400"}
                        className="px-2 py-1 rounded-md hover:bg-white/10 pointer-events-none"
                    />
                </div>


                <CardRowMenuBtn
                    customId={menuId}
                    menuComponent={({ ref, onClose }) => <ListActionsMenu listID={listID} ref={ref} onClose={onClose} overlayId={menuId} />}
                    desiredBackdropOpacity={0.0}
                    placement="bottom-start"
                >
                    <div
                        onMouseEnter={() => setIsEllipsisHovered(true)}
                        onMouseLeave={() => setIsEllipsisHovered(false)}
                        style={{ backgroundColor: ellipsisBg, color: ellipsisColor }}
                        className={`h-8 rounded-md px-2 bg-transparent 
            cursor-pointer transition-colors duration-150
            flex items-center justify-center`}>

                        <EllipsisIcon className="w-4 h-4 " />
                    </div>
                </CardRowMenuBtn>
            </div>


        </div>
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
