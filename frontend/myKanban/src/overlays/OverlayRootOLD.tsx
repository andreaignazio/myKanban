import { useEffect } from "react"
import { useOverlayStore } from "./store"
import React from "react"
import { createPortal } from "react-dom"
import { useShallow } from "zustand/shallow"

type Props = {

    anchorRef: React.RefObject<HTMLElement | null>
    panelRef: React.RefObject<HTMLElement | null>
    overlayId: string
    children: React.ReactNode
    closeOnOutside?: boolean
}

export function OverlayRoot({ anchorRef, panelRef, overlayId, children: children, closeOnOutside }: Props) {

    if (closeOnOutside === undefined) closeOnOutside = true

    //const openId = useOverlayStore((state) => state.openId)
    const openId = useOverlayStore(useShallow((state) => state.getOpenId()))
    const close = useOverlayStore((state) => state.close)

    // console.log("OverlayRoot render", { openId, overlayId })
    useEffect(() => {
        if (closeOnOutside === false) return
        const onPointerDown = (e: PointerEvent) => {
            if (openId !== overlayId) return

            const target = e.target as Node | null
            if (!target) return

            const anchor = anchorRef.current
            const panel = panelRef.current

            const inside =
                (anchor && anchor.contains(target)) ||
                (panel && panel.contains(target))

            if (!inside && closeOnOutside) close()
        }

        document.addEventListener("pointerdown", onPointerDown, true)
        return () => document.removeEventListener("pointerdown", onPointerDown, true)
    }, [openId, overlayId, close, anchorRef, panelRef, closeOnOutside])

    //Key
    if (openId !== overlayId) return null

    const rect = anchorRef.current?.getBoundingClientRect()
    const style: React.CSSProperties = rect
        ? { position: "fixed", left: rect.left, top: rect.bottom + 8, zIndex: 1000 }
        : { position: "fixed", left: 0, top: 0, zIndex: 1000 }

    return createPortal(
        <div style={style}>{children}</div>,
        document.body
    )

}