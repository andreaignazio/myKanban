import type { OverlayPlacement } from "@/overlays/overlayStore"

import { create } from "zustand"

type DraggingCardData = {
    listCardID: string
    listID: string
    boardID: string
}

export type RouteParams = {
    route?: string
    workspaceId?: string
    boardId?: string
    cardId?: string
}

type UiStore = {
    currentRouteParams: RouteParams
    setCurrentRouteParams: (routeParams: RouteParams) => void

    sidebarHidden: boolean
    toggleSidebarHidden: () => void
    setSidebarHidden: (hidden: boolean) => void
    ghostHeight: number | null
    ghostActive: boolean
    setGhostHeight: (height: number | null) => void
    isCardDragging: boolean
    isListDragging: boolean
    setCardDragging: (dragging: boolean) => void
    setListDragging: (dragging: boolean) => void
    draggingCardData?: DraggingCardData | null
    setDraggingCardData: (data: DraggingCardData | null) => void
    draggingListData?: { boardListID: string } | null
    setDraggingListData: (data: { boardListID: string } | null) => void
    isThisListDragging: (boardListID: string) => boolean

    draggingEntryData?: { entryId: string, checklistId: string } | null
    setDraggingEntryData: (data: { entryId: string, checklistId: string } | null) => void
    isEntryDragging: boolean
    setIsEntryDragging: (dragging: boolean) => void

    deletedBoardModalOpen: boolean
    setDeletedBoardModalOpen: (open: boolean) => void

    deletedCardModalOpen: boolean
    deletedCardId?: string
    setDeletedCardModalOpen: (open: boolean, cardId?: string) => void

    lostWorkspaceAccessModalOpen: boolean
    lostWorkspaceAccessWorkspaceId?: string
    setLostWorkspaceAccessModalOpen: (open: boolean, workspaceId?: string) => void

    lostBoardAccessModalOpen: boolean
    lostBoardAccessBoardId?: string
    lostBoardAccessWorkspaceId?: string
    setLostBoardAccessModalOpen: (open: boolean, boardId?: string, workspaceId?: string) => void

    domainModalOpen: boolean
    domainModalData?: DomainModalData
    setDomainModalOpen: (open: boolean, data?: DomainModalData) => void

    userActivityOverlayOpen: boolean
    userActivityOverlayData?: UserActivityOverlayData
    setUserActivityOverlayOpen: (open: boolean, data?: UserActivityOverlayData) => void
}

export type DomainModalData = {
    componentent: (onClose: () => void) => React.ReactNode
    anchorRef: React.RefObject<HTMLElement | null> | null
    renderType?: "anchored" | "virtual"
    placement?: OverlayPlacement
    virtual?: "viewport-center" | "viewport-bottom-right" | "cursor"
    autoCloseMs?: number
    onAutoClose?: () => void
    closeOnClickOutside?: boolean
    closeOnEscape?: boolean
    lockBackdrop?: boolean
    theme?: "light" | "dark"
}

export type UserActivityOverlayData = {
    userID: string
    workspaceID?: string
}

export const useUiStore = create<UiStore>((set, get) => ({
    currentRouteParams: {},
    sidebarHidden: false,
    ghostHeight: 0,
    ghostActive: false,
    isCardDragging: false,
    isListDragging: false,
    draggingCardData: null,
    draggingListData: null,
    draggingEntryData: null,
    isEntryDragging: false,
    deletedBoardModalOpen: false,
    deletedCardModalOpen: false,
    deletedCardId: undefined,
    lostWorkspaceAccessModalOpen: false,
    lostWorkspaceAccessWorkspaceId: undefined,
    lostBoardAccessModalOpen: false,
    lostBoardAccessBoardId: undefined,
    lostBoardAccessWorkspaceId: undefined,
    domainModalOpen: false,
    domainModalData: undefined,
    userActivityOverlayOpen: false,
    userActivityOverlayData: undefined,
    setCurrentRouteParams: (routeParams: RouteParams) => {
        set(() => ({
            currentRouteParams: routeParams,
        }))
    },

    setDomainModalOpen: (open, data?: DomainModalData) => {
        set(() => ({
            domainModalData: data,
            domainModalOpen: open,

        }))
    },
    setUserActivityOverlayOpen: (open, data?: UserActivityOverlayData) => {
        set(() => ({
            userActivityOverlayData: data,
            userActivityOverlayOpen: open,
        }))
    },
    setDeletedBoardModalOpen: (open) => {
        set(() => ({
            deletedBoardModalOpen: open,
        }))
    },
    setDeletedCardModalOpen: (open, cardId) => {
        set(() => ({
            deletedCardModalOpen: open,
            deletedCardId: open ? cardId : undefined,
        }))
    },
    setLostWorkspaceAccessModalOpen: (open, workspaceId) => {
        set(() => ({
            lostWorkspaceAccessModalOpen: open,
            lostWorkspaceAccessWorkspaceId: open ? workspaceId : undefined,
        }))
    },
    setLostBoardAccessModalOpen: (open, boardId, workspaceId) => {
        set(() => ({
            lostBoardAccessModalOpen: open,
            lostBoardAccessBoardId: open ? boardId : undefined,
            lostBoardAccessWorkspaceId: open ? workspaceId : undefined,
        }))
    },
    setIsEntryDragging: (dragging: boolean) => {
        set(() => ({
            isEntryDragging: dragging,
        }))
    },
    setDraggingEntryData: (data) => {
        set(() => ({
            draggingEntryData: data,
        }))
    },


    setGhostHeight: (height) => {

        set(() => ({
            ghostHeight: height,
        }))

    },
    setCardDragging: (dragging) => {
        set(() => ({
            isCardDragging: dragging,
        }))
    },
    setListDragging: (dragging) => {
        set(() => ({
            isListDragging: dragging,
        }))
    },
    setDraggingCardData: (listCardID) => {
        set(() => ({
            draggingCardData: listCardID,
        }))
    },
    setDraggingListData: (data) => {
        set(() => ({
            draggingListData: data,
        }))
    },

    isThisListDragging: (boardListID: string) => {
        const draggingListData = get().draggingListData
        const isListDragging = get().isListDragging
        if (!isListDragging || !draggingListData) return false
        return draggingListData?.boardListID === boardListID
    },


    toggleSidebarHidden: () => {
        set((state) => ({
            sidebarHidden: !state.sidebarHidden,
        }))
    },
    setSidebarHidden: (hidden: boolean) => {
        set(() => ({
            sidebarHidden: hidden,
        }))
    }

}))