import type { CardContext } from "@/domain/cardContext";
import { useCurrentBoardRole } from "./useCurrentBoardRole";
import { useParams } from "react-router";
import { useBoardDetailStore } from "@/stores/boardDetailStore";
import type { Board } from "@/stores/types";
import { useBoardsStore } from "@/stores/boardsStore";

type UseCardEditableContextParams = {
    cardContext?: CardContext
    boardId?: string
    effectiveRootBoard?: Board
}

export function useCardEditableContext({ cardContext, boardId, effectiveRootBoard }: UseCardEditableContextParams) {
    const getBlForListCardId = useBoardDetailStore((state) => state.getBoardListForListCardId)
    const boardListById = useBoardDetailStore((state) => state.boardListById)
    const rootListCardDataByListCardId = useBoardDetailStore((state) => state.rootListCardDataByListCardId)

    const resolvedBoardId = boardId ?? (useParams().boardId as string)

    const rootListCardId = cardContext?.rootListCardId
    // effectiveRootBoard is set by useCardRootBoardContext when the card is a mirror
    // (either board mirror via listCard.RootID !== listCard.ID, or inbox-mirror)
    const isMirrorCard = !!effectiveRootBoard

    // For mirror cards: resolve root board and its board list from cached rootboard data
    const rootBoardId = isMirrorCard ? effectiveRootBoard!.ID : undefined
    // Cache key mirrors effectiveListCardID from useCardMirrorState:
    // - board mirror: listCard.ID == cardContext.listCardId
    // - inbox-mirror (no listCardId in context): rootListCardId
    const cacheKey = cardContext?.listCardId ?? rootListCardId
    const rootListCardData = isMirrorCard && cacheKey
        ? rootListCardDataByListCardId[cacheKey]
        : undefined
    const rootBoardList = rootListCardData?.rootBoardListID
        ? boardListById[rootListCardData.rootBoardListID]
        : undefined

    // For non-mirror cards: use the card's own board list on the current board
    const localBoardList = !isMirrorCard && cardContext?.listCardId
        ? getBlForListCardId(cardContext.listCardId, resolvedBoardId)
        : undefined

    const targetBoardId = (isMirrorCard && rootBoardId) ? rootBoardId : resolvedBoardId
    const accessMode = (isMirrorCard ? rootBoardList?.AccessMode : localBoardList?.AccessMode) ?? undefined

    const { role, isViewer } = useCurrentBoardRole(targetBoardId)

    const userBoardById = useBoardsStore((state) => state.userBoardsById)
    //console.log("Card Editable Context", { targetBoardId, accessMode, isViewer, role, rootBoardId, rootBoardList, localBoardList })
    const userBoardRoot = effectiveRootBoard ? userBoardById[effectiveRootBoard?.ID ?? ""] : undefined
    const hasRootBoardAccess = !isMirrorCard || role !== undefined
    const canEdit = hasRootBoardAccess && !isViewer && accessMode !== "readonly"

    return {
        canEdit,
        isReadOnlyList: accessMode === "readonly",
        rootBoardId,
        userBoardRoot,
    }
}