import { useCallback, useEffect, useMemo } from "react"
import { autoUpdate, offset, shift, useFloating } from "@floating-ui/react"
import type { VirtualElement } from "@floating-ui/react"
import type { OverlayDescriptor } from "./overlayStore"

export type VirtualPreset =
    | "viewport-center"
    | "viewport-bottom-right"
    | "cursor"

export type Placement =
    | "top" | "bottom" | "left" | "right"
    | "top-start" | "top-end" | "bottom-start"
    | "bottom-end" | "left-start" | "left-end"
    | "right-start" | "right-end"

type VirtualOverlayProps = OverlayDescriptor & {
    isInteractive?: boolean
}

export function VirtualOverlay(ov: VirtualOverlayProps) {

    const isViewportCenter = ov.position?.virtual === "viewport-center";
    const offX = ov.position?.offset?.[0] ?? 0;
    const offY = ov.position?.offset?.[1] ?? 0;
    const virtualMode = ov.position?.virtual || "viewport-center";
    const placement: Placement = virtualMode === "viewport-bottom-right" ? "top-end" : "bottom-start";

    const { refs, floatingStyles, update } = useFloating({
        strategy: "fixed",
        placement,
        middleware: [
            offset(({ rects }) => ({
                mainAxis: isViewportCenter ? -rects.floating.height / 2 : 0,
                crossAxis: isViewportCenter ? -rects.floating.width / 2 : 0,
            })),

            shift({ padding: 0 }),
        ],
        whileElementsMounted: (reference, floating, updateFn) => autoUpdate(reference, floating, updateFn, { animationFrame: true }),
    })

    const virtualRef = useMemo<VirtualElement>(() => ({
        getBoundingClientRect: () => {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const bottomRightX = window.innerWidth;
            const bottomRightY = window.innerHeight;
            const x = (virtualMode === "viewport-bottom-right" ? bottomRightX : centerX) + offX;
            const y = (virtualMode === "viewport-bottom-right" ? bottomRightY : centerY) + offY;
            return {
                x,
                y,
                top: y,
                left: x,
                right: x,
                bottom: y,
                width: 0,
                height: 0,
            }
        },
        contextElement: document.body,
    }), [offX, offY, virtualMode])




    /* const { refs, floatingStyles, update } = useFloating({
         strategy: "fixed",
         placement: "bottom-start",
         middleware: [
             offset(({ rects }) => ({
                 mainAxis: -rects.floating.height / 2,
                 crossAxis: -rects.floating.width / 2,
             })),
             shift({ padding: 12 }),
         ],
         whileElementsMounted: autoUpdate,
     })
 
     const virtualRef = useMemo<VirtualElement>(() => ({
         getBoundingClientRect: () => {
             const x = window.innerWidth / 2
             const y = window.innerHeight / 2
             return {
                 x,
                 y,
                 top: y,
                 left: x,
                 right: x,
                 bottom: y,
                 width: 0,
                 height: 0,
             }
         },
         contextElement: document.body,
     }), [])
 */

    useEffect(() => {
        refs.setReference(virtualRef)
        update()
    }, [refs, update, virtualRef])

    const setFloating = useCallback((el: HTMLDivElement | null) => {
        if (ov.panelRef) {
            ov.panelRef.current = el
        }
        refs.setFloating(el)
    }, [ov.panelRef, refs])
    return (
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: ov.zIndex ?? 1000 }}>
            <div
                ref={setFloating}
                className=" bg-transparent rounded-full flex items-center justify-center"
                style={{ ...floatingStyles, pointerEvents: ov.isInteractive === false ? "none" : "auto" }}
                aria-hidden={ov.isInteractive === false}
            >
                {ov.render()}
            </div>
        </div>
    )
}
