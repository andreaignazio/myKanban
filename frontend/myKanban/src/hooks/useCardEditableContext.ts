import type { CardContext } from "@/domain/cardContext";
import { useCurrentBoardRole } from "./useCurrentBoardRole";
import { useParams } from "react-router";
import { useBoardDetailStore } from "@/stores/boardDetailStore";
type UseCardEditableContextParams = {
    cardContext?: CardContext
    boardId?: string
}
export function useCardEditableContext({ cardContext, boardId }: UseCardEditableContextParams) {
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