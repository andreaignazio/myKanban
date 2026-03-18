import type { CardContext } from "@/domain/cardContext";
import { useCurrentBoardRole } from "./useCurrentBoardRole";
import { useParams } from "react-router";
import { useBoardDetailStore } from "@/stores/boardDetailStore";
import type { Board } from "@/stores/types";
import { useBoardsStore } from "@/stores/boardsStore";
import { useListsStore } from "@/stores/listsStore";

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
    const { isViewer: isLocalViewer } = useCurrentBoardRole(resolvedBoardId)

    const userBoardById = useBoardsStore((state) => state.userBoardsById)
    const getListById = useListsStore((state) => state.getListById)

    //console.log("Card Editable Context", { targetBoardId, accessMode, isViewer, role, rootBoardId, rootBoardList, localBoardList })
    const userBoardRoot = effectiveRootBoard ? userBoardById[effectiveRootBoard?.ID ?? ""] : undefined
    const hasRootBoardAccess = !isMirrorCard || role !== undefined

    // canEditBoardList: governs structural operations on the local board list (archive, move, mirror, labels)
    // For mirror cards: checks local board role + local BL accessMode + list ExternalAccess policy
    // For non-mirror cards: same board as canEdit, ExternalAccess is irrelevant (own list)
    const localBoardListForEdit = isMirrorCard
        ? getBlForListCardId(cardContext?.listCardId ?? "", resolvedBoardId)
        : localBoardList
    const localList = getListById(localBoardListForEdit?.ListID ?? "")
    const isExternallyRestricted = isMirrorCard && localList?.ExternalAccess === "restricted"
    const canEditBoardList = !isLocalViewer
        && localBoardListForEdit?.AccessMode !== "readonly"
        && !isExternallyRestricted

    // canEdit: governs card content operations (title, dates, members, checklist, description)
    // For mirror cards: also blocked if local board list is readonly (viewing through a readonly mirror)
    const isLocalBoardListReadonly = isMirrorCard && localBoardListForEdit?.AccessMode === "readonly"
    const canEdit = hasRootBoardAccess && !isViewer && accessMode !== "readonly" && !isLocalBoardListReadonly

    let canEditReason: string | undefined
    if (!canEdit) {
        if (!hasRootBoardAccess) {
            canEditReason = "You don't have access to the original board."
        } else if (isViewer) {
            canEditReason = "You are a viewer on the original board."
        } else if (isLocalBoardListReadonly) {
            canEditReason = "This list is set to read-only on this board."
        } else if (accessMode === "readonly") {
            canEditReason = "The original list is set to read-only."
        }
    }

    return {
        canEdit,
        canEditReason,
        canEditBoardList,
        isReadOnlyList: accessMode === "readonly",
        rootBoardId,
        userBoardRoot,
        hasRootBoardAccess
    }
}