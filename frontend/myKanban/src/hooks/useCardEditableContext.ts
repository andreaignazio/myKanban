import type { CardContext } from "@/domain/cardContext";
import { useCurrentBoardRole } from "./useCurrentBoardRole";
import { useParams } from "react-router";
import { useListsStore } from "@/stores/listsStore";
import { useBoardDetailStore } from "@/stores/boardDetailStore";
type UseCardEditableContextParams = {
    cardContext?: CardContext
    boardId?: string
}
export function useCardEditableContext({ cardContext, boardId }: UseCardEditableContextParams) {

    const listsById = useListsStore((state) => state.listsById)
    // const boardListsById = useBoardDetailStore((state) => state.boardListById)
    const list = cardContext?.sourceListId ? listsById[cardContext.sourceListId] : undefined
    const getBlForListCardId = useBoardDetailStore((state) => state.getBoardListForListCardId)

    const resolvedBoardId = boardId ?? (useParams().boardId as string)

    const boardList = cardContext?.listCardId ? getBlForListCardId(cardContext.listCardId, resolvedBoardId) : undefined

    const accessMode = boardList?.AccessMode ?? undefined

    const { isViewer } = useCurrentBoardRole(resolvedBoardId)

    const canEdit = !isViewer && accessMode !== "readonly"

    return {
        canEdit,
        isReadOnlyList: accessMode === "readonly",
    }
}