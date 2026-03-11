import type { CardSource } from "@/domain/cardContext"
import type { ListCard } from "@/stores/boardDetailStore"

type UseCardMirrorStateParams = {
    source?: CardSource
    listCard?: ListCard
    listCardID?: string
    rootListCardId?: string
}

export function useCardMirrorState({
    source = "board",
    listCard,
    listCardID,
    rootListCardId,
}: UseCardMirrorStateParams) {
    const isInbox = source === "inbox"
    const isInboxMirror = source === "inbox-mirror"
    const isInboxMode = isInbox || isInboxMirror

    const effectiveListCardID = listCard?.ID ?? listCardID ?? rootListCardId ?? ""

    const resolvedRootListCardID = isInboxMirror
        ? (rootListCardId ?? effectiveListCardID)
        : (listCard?.RootID ?? rootListCardId ?? effectiveListCardID)

    const isMirrorCard = !!effectiveListCardID
        && !!resolvedRootListCardID
        && (isInboxMirror || effectiveListCardID !== resolvedRootListCardID)

    return {
        isInbox,
        isInboxMirror,
        isInboxMode,
        isMirrorCard,
        effectiveListCardID,
        resolvedRootListCardID,
    }
}