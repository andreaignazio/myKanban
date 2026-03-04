import { ListAdd } from "@/components/ListAdd"
import { ListRow } from "@/components/ListRow"
import { useBoardDetailStore } from "@/stores/boardDetailStore"
import { useParams } from "react-router"
import { useShallow } from "zustand/shallow"

import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd"

const EMPTY_LIST_IDS: string[] = []

export const ListContainer = () => {
    const boardId = useParams().boardId as string
    const boardListIds = useBoardDetailStore(useShallow((state) => (
        boardId ? state.boardListIdsByBoardId[boardId] ?? EMPTY_LIST_IDS : EMPTY_LIST_IDS
    )))
    const uniqueBoardListIds = Array.from(new Set(boardListIds))
    const setBoardListIds = useBoardDetailStore((state) => state.setBoardListIdsByBoardId)
    const setListCardIds = useBoardDetailStore((state) => state.setListCardIdsByListId)
    const getListCardIds = useBoardDetailStore((state) => state.getListCardIds)
    const getListIdForBoardListId = useBoardDetailStore((state) => state.getListIdForBoardListId)
    const persistMoveList = useBoardDetailStore((state) => state.persistMoveList)
    const persistMoveCard = useBoardDetailStore((state) => state.persistMoveCardInBoard)

    function handleDragEnd(result: DropResult) {

        const { destination, source, draggableId, type } = result

        if (!destination) return
        if (destination.droppableId === source.droppableId && destination.index === source.index) return

        if (type === "list") {
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
                const newSourceListCardIds = Array.from(sourceListCardIds)
                newSourceListCardIds.splice(source.index, 1)
                setListCardIds(sourceListId, newSourceListCardIds)
                const newDestinationListCardIds = Array.from(destinationListCardIds)
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
        <DragDropContext onDragEnd={handleDragEnd}>
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
                                boardListID={boardListId} boardID={boardId} />
                        ))}
                        {provided.placeholder}
                        <ListAdd key="listAdd" />
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    )
}