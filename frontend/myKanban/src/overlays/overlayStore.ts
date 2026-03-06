import type { OverlayExclusiveGroup } from "@/domain/overlayExclusiveGroups"
import { create } from "zustand"

export type OverlayState = {
    stack: OverlayDescriptor[]
    isOverlayBackdropLocked: () => boolean
    open: (descriptor: OverlayDescriptor) => void
    close: (id: string) => void
    closeTop: () => void
    isActive: (id: string) => boolean
    triggerUpdate: () => void
    dropdownActiveIdMap: Record<string, string | null>
    setDropdownActiveId: (dropdownId: string, activeId: string | null) => void
    backdropOpacity: number
    closeAll: () => void

    // getOpenId: () => string | null
}
export type OverlayOptions = {
    closeOnMouseLeave?: boolean
    closeOnClickOutside?: boolean
    closeOnEscape?: boolean
    lockBackdrop?: boolean
    passthrough?: boolean
    closeOnAncnhorScroll?: boolean
    closeOnSelection?: boolean

}

export type OverlayPlacement = "top" | "bottom" | "left" | "right" | "top-start" | "top-end" | "bottom-start" | "bottom-end" | "left-start" | "left-end" | "right-start" | "right-end"

export type OverlayPositionOptions = {
    placement?: OverlayPlacement
    offset?: [number, number]
    virtual?: "viewport-center" | "viewport-bottom-right" | "cursor" | "viewport-top-center"
}

export type OverlayDescriptor = {
    id: string
    render: () => React.ReactNode
    panelRef?: React.RefObject<HTMLDivElement | null>
    anchorRef?: React.RefObject<HTMLElement | null>
    type: "modal" | "popover" | "drawer" | "livepoint" | "dropdown" | null
    opts?: OverlayOptions
    position?: OverlayPositionOptions
    renderType?: "livePoint" | "anchored" | "virtual"
    zIndex?: number
    exclusiveGroup?: OverlayExclusiveGroup  // Only one overlay with the same exclusiveGroup can be open at a time
    desiredBackdropOpacity?: number // 0 to 1, only applicable if lockBackdrop is true
    // Add more properties as needed, e.g., position, content, etc.
}


export const useOverlayStore = create<OverlayState>((set, get) => ({
    stack: [],
    backdropOpacity: 0.5,
    dropdownActiveIdMap: {},
    open: (descriptor) => {
        //   console.log("STORE: Opening overlay with descriptor:", descriptor)
        const exist = get().stack.find((d) => d.id === descriptor.id)
        if (exist) {
            set((state) => ({
                stack: state.stack.map((d) => (d.id === descriptor.id ? descriptor : d))
            }))
            return
        }

        if (descriptor.exclusiveGroup) {
            const groupExist = get().stack.find((d) => d.exclusiveGroup === descriptor.exclusiveGroup)
            if (groupExist) {
                set((state) => ({ stack: state.stack.filter((d) => d.exclusiveGroup !== descriptor.exclusiveGroup) }))
            }
        }
        if (descriptor.opts?.lockBackdrop && descriptor.desiredBackdropOpacity !== undefined) {
            set((state) => ({ backdropOpacity: descriptor.desiredBackdropOpacity! }))
        }

        set((state) => ({ stack: [...state.stack, descriptor] }))
    },
    close: (id) => set((state) => ({ stack: state.stack.filter((d) => d.id !== id) })),
    closeTop: () => {
        // console.log("Closing top overlay")
        const current = get().stack
        const next = [...current]
        next.splice(current.length - 1, 1)
        set((state) => ({
            stack: next
        }))
    },
    isOverlayBackdropLocked: () => {
        const current = get().stack
        if (current.length === 0) return false
        return current.some((d) => {
            if (d.opts?.lockBackdrop) {
                return true
            } else {
                return false
            }
        })
        //  return current[current.length - 1].opts?.lockBackdrop ?? false
    },
    isActive: (id) => {
        const current = get().stack
        return current.some((d) => d.id === id)
    },
    triggerUpdate: () => set((state) => ({ stack: [...state.stack] })),
    setDropdownActiveId: (dropdownId: string, activeId: string | null) => {
        set((state) => ({
            dropdownActiveIdMap: {
                ...state.dropdownActiveIdMap,
                [dropdownId]: activeId,
            }
        }))
    },
    closeAll: () => set(() => ({ stack: [] })),
}))
