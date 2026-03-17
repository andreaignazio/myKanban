import { useEffect, useState } from "react"

import type { CardSource } from "@/domain/cardContext"
import { useBoardBackground } from "@/hooks/useBoardBackground"
import { useCardMirrorState } from "@/hooks/useCardMirrorState"
import { useBoardDetailStore, type ListCard } from "@/stores/boardDetailStore"
import type { Board } from "@/stores/types"

type UseCardRootBoardContextParams = {
    boardId?: string
    source?: CardSource
    listCard?: ListCard
    listCardID?: string
    rootListCardId?: string | null
    listID?: string
}

export function useCardRootBoardContext({
    boardId,
    source,
    listCard,
    listCardID,
    rootListCardId: rawRootListCardId,
    listID,
}: UseCardRootBoardContextParams) {
    const rootListCardId = rawRootListCardId ?? undefined
    const isMirrorList = useBoardDetailStore((state) => {
        const resolvedListID = listID ?? listCard?.ListID
        if (!resolvedListID || !boardId) return false
        const blIds = state.boardListIdsByBoardId[boardId] ?? []
        const bl = blIds.map((id) => state.boardListById[id]).find((bl) => bl?.ListID === resolvedListID)
        return bl ? bl.ID !== bl.RootID : false
    })

    const mirrorState = useCardMirrorState({
        source,
        listCard,
        listCardID,
        rootListCardId,
        isMirrorList,
    })

    const { isInboxMirror, isMirrorCard, effectiveListCardID } = mirrorState

    const fetchRootBoardForListcardId = useBoardDetailStore((state) => state.fetchRootBoardForListcardId)
    const getRootBoardForListcardId = useBoardDetailStore((state) => state.getRootBoardForListCardId)
    const rootBoardIdByListCardId = useBoardDetailStore((state) => state.rootBoardIdByListCardId)
    const rootListCardData = useBoardDetailStore((state) => effectiveListCardID ? state.rootListCardDataByListCardId[effectiveListCardID] : undefined)
    const invalidatedRootBoardListCardIds = useBoardDetailStore((state) => state.invalidatedRootBoardListCardIds)

    const [effectiveRootBoard, setEffectiveRootBoard] = useState<Board | undefined>(undefined)
    const isRootBoardCacheInvalidated = !!effectiveListCardID && !!invalidatedRootBoardListCardIds[effectiveListCardID]

    useEffect(() => {
        if (!isMirrorCard) {
            setEffectiveRootBoard(undefined)
            return
        }
        if (!effectiveListCardID) return
        if (!boardId) return

        const rootBoard = getRootBoardForListcardId(effectiveListCardID)
        if (rootBoard?.ID && !isRootBoardCacheInvalidated) {
            setEffectiveRootBoard(rootBoard)
            return
        }

        void fetchRootBoardForListcardId(boardId, effectiveListCardID)
    }, [boardId, effectiveListCardID, fetchRootBoardForListcardId, getRootBoardForListcardId, isMirrorCard, isRootBoardCacheInvalidated])

    useEffect(() => {
        if (!isMirrorCard) {
            setEffectiveRootBoard(undefined)
            return
        }
        if (!effectiveListCardID) return

        const rootBoard = getRootBoardForListcardId(effectiveListCardID)
        setEffectiveRootBoard(rootBoard ?? undefined)
    }, [effectiveListCardID, getRootBoardForListcardId, isMirrorCard, rootBoardIdByListCardId])

    const {
        backgroundType: rootBoardBackgroundType,
        backgroundImageUrl: rootBoardBgImage,
        backgroundColorClassName: rootBoardBgColorClass,
    } = useBoardBackground({ board: effectiveRootBoard })

    const showMirrorBackdrop = isInboxMirror || (isMirrorCard && !!effectiveRootBoard?.ID && effectiveRootBoard.ID !== boardId)
    const isUserBoardPurged = !!rootListCardData?.isUserBoardPurged
    const isUserBoardSoftDeleted = !!rootListCardData?.isUserBoardSoftDeleted
    const isMainListCardPurged = !!rootListCardData?.isMainListCardPurged
    const isMainListCardSoftDeleted = !!rootListCardData?.isMainListCardSoftDeleted
    const isRootPurged = !!rootListCardData?.isRootPurged
    const isRootSoftDeleted = !!rootListCardData?.isRootSoftDeleted

    return {
        ...mirrorState,
        effectiveRootBoard,
        rootListCardData,
        isUserBoardPurged,
        isUserBoardSoftDeleted,
        isMainListCardPurged,
        isMainListCardSoftDeleted,
        isRootPurged: isRootPurged,
        isRootSoftDeleted: isRootSoftDeleted,
        rootBoardBackgroundType,
        rootBoardBgImage,
        rootBoardBgColorClass,
        showMirrorBackdrop,
    }
}

export type CardRootBoardContextValue = ReturnType<typeof useCardRootBoardContext>