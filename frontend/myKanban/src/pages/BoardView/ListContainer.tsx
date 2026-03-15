import { ListAdd } from "@/components/ListAdd"
import { ListRow } from "@/components/ListRow"
import { useBoardDetailStore } from "@/stores/boardDetailStore"
import { useParams } from "react-router"
import { useShallow } from "zustand/shallow"
import { AnimatePresence, motion } from "framer-motion"
import { useAsyncKey } from "@/stores/asyncRequestStore"
import { useAsyncRequest } from "@/hooks/useAsyncRequest"
import { useBoardsStore } from "@/stores/boardsStore"

import { Droppable } from "@hello-pangea/dnd"
import { useEffect, useState } from "react"

const EMPTY_LIST_IDS: string[] = []
const SKELETON_CARD_COUNTS = [3, 4, 2]

type ListContainerProps = {
    draggedCardId?: string | null
    draggedSourceBoardListId?: string | null
}

export const ListContainer = ({ draggedCardId = null, draggedSourceBoardListId = null }: ListContainerProps) => {
    const boardId = useParams().boardId as string
    const boardListIds = useBoardDetailStore(useShallow((state) => (
        boardId ? state.boardListIdsByBoardId[boardId] ?? EMPTY_LIST_IDS : EMPTY_LIST_IDS
    )))
    const uniqueBoardListIds = Array.from(new Set(boardListIds))

    const fetchKey = useAsyncKey("board:read:detail", boardId ?? "")
    //const listAddKey = "list:create"
    const { isLoading } = useAsyncRequest(fetchKey)

    const currentUserRole = useBoardsStore((state) => boardId ? state.userBoardsById[boardId]?.Role : undefined)
    const isViewer = currentUserRole === "viewer"
    // const { isLoading: isCreatingList } = useAsyncRequest(listAddKey)

    const showSkeletons = isLoading && uniqueBoardListIds.length === 0

    const [shouldAnimate, setShouldAnimate] = useState(true);

    useEffect(() => {
        if (!isLoading) {
            const timeout = setTimeout(() => {
                setShouldAnimate(false);
            }, 2000);
            return () => clearTimeout(timeout);
        }
    }, [isLoading]);


    return (

        <Droppable droppableId="lists" type="list" direction="horizontal">
            {(provided) => (
                <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}

                    className="relative flex h-full min-h-0 w-full flex-row items-start pt-2 pb-2 mb-1
                     
                             overflow-y-hidden scrollbar-hidden "
                >
                    <AnimatePresence mode="popLayout">
                        {showSkeletons && SKELETON_CARD_COUNTS.map((cardCount, i) => (
                            <motion.div
                                key={`list-skeleton-${i}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1, transition: { duration: 0.2, delay: i * 0.07 } }}
                                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                                className="shrink-0 w-[280px] mr-4 animate-pulse"
                                style={{ height: "clamp(160px, 40%, 340px)" }}
                            >
                                <div className="w-full h-full bg-[#101204] rounded-xl p-2 pt-[9px] shadow-md shadow-black/60 flex flex-col gap-2">
                                    <div className="h-5 w-3/4 rounded-md bg-neutral-700/70" />
                                    {Array.from({ length: cardCount }).map((_, j) => (
                                        <div key={j} className="rounded-xl bg-neutral-700/40 p-2.5 flex flex-col gap-1.5">
                                            <div className="h-2.5 w-full rounded-sm bg-neutral-700/70" />
                                            <div className="h-2.5 w-3/4 rounded-sm bg-neutral-700/70" />
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                        {uniqueBoardListIds.map((boardListId: string, index: number) => (
                            <motion.div
                                key={boardListId}
                                initial={shouldAnimate ? { opacity: 0, y: +12, } : undefined}
                                animate={shouldAnimate ? {
                                    opacity: 1, y: 0,
                                    transition: { duration: 1.5, ease: "easeInOut", delay: Math.min(index * 0.1, 0.5) }
                                } : { opacity: 1, y: 0, transition: { duration: 0, delay: 0, } }}
                                exit={shouldAnimate ? { opacity: 0, scale: 0.95, transition: { duration: 1.5 } } : undefined}

                                className="flex shrink-0 self-start max-h-full"
                            >
                                <ListRow
                                    index={index}
                                    draggedCardId={draggedCardId}
                                    draggedSourceBoardListId={draggedSourceBoardListId}
                                    isDragDisabled={isViewer}
                                    isCardDropDisabled={isViewer}
                                    boardListID={boardListId} boardID={boardId} />
                            </motion.div>
                        ))}
                        {provided.placeholder}
                        <motion.div
                            key="list-add"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1, transition: { duration: 0.2 } }}
                            exit={{ opacity: 0, transition: { duration: 0.15 } }}
                            className="shrink-0"
                        >
                            <ListAdd boardID={boardId} setShouldAnimate={setShouldAnimate} />
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}
        </Droppable>

    )
}