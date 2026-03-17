import type { Location as RouterLocation } from "react-router-dom"

export type CardSource = "board" | "inbox" | "inbox-mirror"

export type CardOpenedFrom = "card-row" | "direct-url" | "card-edit-menu"

export type CardContext = {
    cardId: string
    sourceListId: string
    source?: CardSource
    openedFrom?: CardOpenedFrom
    listCardId?: string
    inboxCardId?: string
    rootListCardId?: string | null
}

export type CardRouteState = {
    backgroundLocation: RouterLocation
    cardContext: CardContext
}