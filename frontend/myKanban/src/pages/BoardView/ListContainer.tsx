import { ListAdd } from "@/components/ListAdd"
import { ListRow } from "@/components/ListRow"
import { useBoardDetailStore } from "@/stores/boardDetailStore"
import { useParams } from "react-router"
import { useShallow } from "zustand/shallow"

import { Droppable } from "@hello-pangea/dnd"

const EMPTY_LIST_IDS: string[] = []

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

    return (

        <Droppable droppableId="lists" type="list" direction="horizontal">
            {(provided) => (
                <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="relative flex h-full min-h-0 w-full flex-row items-start pt-2 pb-2 mb-1 !pr-8
                            overflow-x-auto overflow-y-hidden scrollbar-hidden "
                >
                    {uniqueBoardListIds.map((boardListId: string, index: number) => (
                        <ListRow key={boardListId}
                            index={index}
                            draggedCardId={draggedCardId}
                            draggedSourceBoardListId={draggedSourceBoardListId}
                            boardListID={boardListId} boardID={boardId} />
                    ))}
                    {provided.placeholder}
                    <ListAdd key="listAdd" />
                </div>
            )}
        </Droppable>

    )
}