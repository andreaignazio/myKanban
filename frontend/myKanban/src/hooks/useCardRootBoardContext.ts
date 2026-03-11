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
    rootListCardId?: string
}

export function useCardRootBoardContext({
    boardId,
    source,
    listCard,
    listCardID,
    rootListCardId,
}: UseCardRootBoardContextParams) {
    const mirrorState = useCardMirrorState({
        source,
        listCard,
        listCardID,
        rootListCardId,
    })

    const { isInboxMirror, isMirrorCard, effectiveListCardID } = mirrorState

    const fetchRootBoardForListcardId = useBoardDetailStore((state) => state.fetchRootBoardForListcardId)
    const getRootBoardForListcardId = useBoardDetailStore((state) => state.getRootBoardForListCardId)
    const rootBoardIdByListCardId = useBoardDetailStore((state) => state.rootBoardIdByListCardId)
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

    return {
        ...mirrorState,
        effectiveRootBoard,
        rootBoardBackgroundType,
        rootBoardBgImage,
        rootBoardBgColorClass,
        showMirrorBackdrop,
    }
}