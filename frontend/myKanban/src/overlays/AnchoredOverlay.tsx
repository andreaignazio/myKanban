import { useEffect } from "react";
import type { OverlayDescriptor } from "./overlayStore";
import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";

type AnchoredOverlayProps = OverlayDescriptor & {
    isInteractive?: boolean
}

export function AnchoredOverlay(ov: AnchoredOverlayProps) {
    const placement = ov.position?.placement || "bottom"
    const off = ov.position?.offset || [0, 0]
    const viewportPadding = { top: 20, right: 8, bottom: 8, left: 8 }

    const { refs, floatingStyles, update } = useFloating({
        strategy: "fixed",
        placement,
        middleware: [
            offset({ mainAxis: off[0], crossAxis: off[1] }),
            flip({
                padding: viewportPadding,
                crossAxis: true,
                fallbackAxisSideDirection: "start",
            }),
            shift({
                padding: viewportPadding,
                crossAxis: true,
            }),
        ],
        whileElementsMounted: autoUpdate,
    })

    useEffect(() => {
        if (ov.frozenAnchorRect) {
            refs.setReference({ getBoundingClientRect: () => ov.frozenAnchorRect! })
            update()
            return
        }
        const anchorEl = ov.anchorRef?.current
        if (anchorEl) {
            refs.setReference(anchorEl)
            update()
        }
    }, [ov.anchorRef, ov.frozenAnchorRect, refs, update])

    const setFloating = (el: HTMLDivElement | null) => {
        if (ov.panelRef) {
            ov.panelRef.current = el
        }
        refs.setFloating(el)
        if (el) {
            update()
        }
    }



    /* return (
         <div
             ref={ov.panelRef}
             className=" bg-transparent rounded-full flex items-center justify-center"
             style={style}
         >
             {ov.render()}
         </div>
     )*/
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