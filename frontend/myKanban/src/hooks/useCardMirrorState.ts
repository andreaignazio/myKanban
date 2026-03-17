import type { CardSource } from "@/domain/cardContext"
import type { ListCard } from "@/stores/boardDetailStore"

type UseCardMirrorStateParams = {
    source?: CardSource
    listCard?: ListCard
    listCardID?: string
    rootListCardId?: string | null
    isMirrorList?: boolean
}

export function useCardMirrorState({
    source = "board",
    listCard,
    listCardID,
    rootListCardId: rawRootListCardId,
    isMirrorList,
}: UseCardMirrorStateParams) {
    const rootListCardId = rawRootListCardId ?? undefined
    const isInbox = source === "inbox"
    const isInboxMirror = source === "inbox-mirror"
    const isInboxMode = isInbox || isInboxMirror
    const isInboxRootMirror = isInbox && !!rootListCardId

    const effectiveListCardID = listCard?.ID ?? listCardID ?? rootListCardId ?? ""

    const resolvedRootListCardID = isInboxMirror
        ? (rootListCardId ?? effectiveListCardID)
        : (listCard?.RootID ?? rootListCardId ?? effectiveListCardID)

    const isMirrorCard = !!effectiveListCardID
        && !!resolvedRootListCardID
        && (isInboxMirror || isInboxRootMirror || effectiveListCardID !== resolvedRootListCardID || !!isMirrorList)

    return {
        isInbox,
        isInboxMirror,
        isInboxMode,
        isMirrorCard,
        effectiveListCardID,
        resolvedRootListCardID,
    }
}