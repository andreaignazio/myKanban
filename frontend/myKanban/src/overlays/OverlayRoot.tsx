import { useOverlayStore } from "./overlayStore"
import type { OverlayDescriptor } from "./overlayStore"
import { createPortal } from "react-dom"
import React, { useEffect } from "react"
import { AnimatePresence, motion } from "motion/react"
import { PointOverlayLive } from "./PointOverlayLive"
import { AnchoredOverlay } from "./AnchoredOverlay"
import { VirtualOverlay } from "./VirtualOverlay"

export function OverlayRoot() {

    const stack = useOverlayStore((state) => state.stack)
    const close = useOverlayStore((state) => state.close)

    const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const baseZIndex = 1000
    const zIndexStep = 10
    const topInteractiveOverlay = [...stack].reverse().find((d) => d.opts?.passthrough !== true)

    //console.log("OverlayRoot render", { stack })
    useEffect(() => {
        if (stack.length === 0) return;
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as HTMLElement | null;
            const isTypeaheadMenuClick = !!target?.closest("#typeahead-menu");
            if (isTypeaheadMenuClick) return;
            //  console.log("Pointer down event", event)
            // Check if the pointer down event is outside of any open overlay


            const topDescriptor = topInteractiveOverlay
            const panelEl = topDescriptor?.panelRef?.current
            const anchorEl = topDescriptor?.anchorRef?.current

            const isInsidePanel = panelEl?.contains(event.target as Node) ?? false
            const isInsideAnchor = anchorEl?.contains(event.target as Node) ?? false
            const isInside = isInsidePanel || isInsideAnchor

            //console.log("Is inside any overlay?", isInside)

            if (!isInside && topDescriptor?.opts?.closeOnClickOutside !== false && topDescriptor?.id) {
                close(topDescriptor.id)

            }
        }


        const onPointerMove = (event: PointerEvent) => {
            //console.log("Pointer move event", event)
            if (stack.length === 0) return
            const closeOnMouseLeave = topInteractiveOverlay?.opts?.closeOnMouseLeave
            // console.log("Pointer move event", event, "closeOnMouseLeave?", closeOnMouseLeave)
            if (closeOnMouseLeave) {
                // Handle close on mouse leave logic here
                const topDescriptor = topInteractiveOverlay
                const panelEl = topDescriptor?.panelRef?.current
                // console.log("Panel element for top overlay:", panelEl)
                /*if (panelEl && !panelEl.contains(event.target as Node)) {
                    // console.log("Pointer moved outside of the top overlay, closing it.")
                    closeTop()
                }*/
                if (panelEl && !event.composedPath().includes(panelEl)) {
                    //console.log("Pointer moved outside of the top overlay, closing it.")
                    timer.current = setTimeout(() => {
                        if (topDescriptor?.id) {
                            close(topDescriptor.id)
                        }
                    }, 600)
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
    }, [stack, close, topInteractiveOverlay])

    return (createPortal(
        <AnimatePresence>

            {stack.flatMap((descriptor: OverlayDescriptor, index) => {
                const zIndex = descriptor.zIndex ?? (baseZIndex + index * zIndexStep)
                const descriptorWithZ = { ...descriptor, zIndex }
                const isInteractive = descriptor.id === topInteractiveOverlay?.id
                const nodes: React.ReactNode[] = []

                if (descriptor.opts?.enableOwnBackdrop) {
                    nodes.push(
                        <motion.div
                            key={`backdrop-${descriptor.id}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            style={{ position: "fixed", inset: 0, zIndex: zIndex - 1, background: "rgba(0, 0, 0, 0.45)" }}
                            onClick={() => close(descriptor.id)}
                        />
                    )
                }

                if (descriptor.renderType === "livePoint") {
                    nodes.push(<PointOverlayLive key={descriptor.id} {...descriptorWithZ} />)
                } else if (descriptor.renderType === "anchored") {
                    nodes.push(<AnchoredOverlay key={descriptor.id} {...descriptorWithZ} isInteractive={isInteractive} />)
                } else if (descriptor.renderType === "virtual") {
                    nodes.push(<VirtualOverlay key={descriptor.id} {...descriptorWithZ} isInteractive={isInteractive} />)
                } else {
                    nodes.push(
                        <div
                            key={descriptor.id}
                            style={{ position: "relative", zIndex, pointerEvents: isInteractive ? "auto" : "none" }}
                            aria-hidden={!isInteractive}
                        >
                            {descriptor.render()}
                        </div>
                    )
                }

                return nodes
            })}
        </AnimatePresence>,
        document.body

    )

    )
}
