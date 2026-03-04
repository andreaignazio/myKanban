import { useOverlayStore } from "./overlayStore"
import type { OverlayDescriptor } from "./overlayStore"
import { createPortal } from "react-dom"
import React, { useEffect } from "react"
import { PointOverlayLive } from "./PointOverlayLive"
import { AnchoredOverlay } from "./AnchoredOverlay"
import { VirtualOverlay } from "./VirtualOverlay"

export function OverlayRoot() {

    const stack = useOverlayStore((state) => state.stack)
    const closeTop = useOverlayStore((state) => state.closeTop)

    const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const baseZIndex = 1000
    const zIndexStep = 10

    //console.log("OverlayRoot render", { stack })
    useEffect(() => {
        if (stack.length === 0) return;
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as HTMLElement | null;
            const isTypeaheadMenuClick = !!target?.closest("#typeahead-menu");
            if (isTypeaheadMenuClick) return;
            //  console.log("Pointer down event", event)
            // Check if the pointer down event is outside of any open overlay


            const topDescriptor = stack[stack.length - 1]
            const panelEl = topDescriptor?.panelRef?.current

            const isInside = panelEl?.contains(event.target as Node) ?? false

            //console.log("Is inside any overlay?", isInside)

            if (!isInside && topDescriptor?.opts?.closeOnClickOutside !== false) {
                closeTop()

            }
        }


        const onPointerMove = (event: PointerEvent) => {
            //console.log("Pointer move event", event)
            if (stack.length === 0) return
            const closeOnMouseLeave = stack[stack.length - 1]?.opts?.closeOnMouseLeave
            // console.log("Pointer move event", event, "closeOnMouseLeave?", closeOnMouseLeave)
            if (closeOnMouseLeave) {
                // Handle close on mouse leave logic here
                const topDescriptor = stack[stack.length - 1]
                const panelEl = topDescriptor.panelRef?.current
                // console.log("Panel element for top overlay:", panelEl)
                /*if (panelEl && !panelEl.contains(event.target as Node)) {
                    // console.log("Pointer moved outside of the top overlay, closing it.")
                    closeTop()
                }*/
                if (panelEl && !event.composedPath().includes(panelEl)) {
                    //console.log("Pointer moved outside of the top overlay, closing it.")
                    timer.current = setTimeout(() => closeTop(), 600)
                } else {
                    clearTimeout(timer.current!)
                    //console.log("Cleared close timer on pointer move")
                }



            }



        }

        addEventListener("pointermove", onPointerMove)
        addEventListener("pointerdown", handlePointerDown)
        return () => {
            removeEventListener("pointermove", onPointerMove)
            removeEventListener("pointerdown", handlePointerDown)
        }
    }, [stack, closeTop])

    return (createPortal(
        <>

            {stack.map((descriptor: OverlayDescriptor, index) => {
                const zIndex = descriptor.zIndex ?? (baseZIndex + index * zIndexStep)
                const descriptorWithZ = { ...descriptor, zIndex }
                const isTopOverlay = index === stack.length - 1
                if (descriptor.renderType === "livePoint") {
                    return <PointOverlayLive key={descriptor.id} {...descriptorWithZ} />
                }
                if (descriptor.renderType === "anchored") {
                    return <AnchoredOverlay key={descriptor.id} {...descriptorWithZ} isInteractive={isTopOverlay} />
                }
                if (descriptor.renderType === "virtual") {
                    return <VirtualOverlay key={descriptor.id} {...descriptorWithZ} isInteractive={isTopOverlay} />
                }
                return (
                    <div
                        key={descriptor.id}
                        style={{ position: "relative", zIndex, pointerEvents: isTopOverlay ? "auto" : "none" }}
                        aria-hidden={!isTopOverlay}
                    >
                        {descriptor.render()}
                    </div>
                )
            })}
        </>,
        document.body

    )

    )
}
