import { useEffect } from "react";
import type { OverlayDescriptor } from "./overlayStore";
import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";

type AnchoredOverlayProps = OverlayDescriptor & {
    isInteractive?: boolean
}

export function AnchoredOverlay(ov: AnchoredOverlayProps) {
    const placement = ov.position?.placement || "bottom"
    const off = ov.position?.offset || [0, 0]

    const { refs, floatingStyles, update } = useFloating({
        strategy: "fixed",
        placement,
        middleware: [
            offset({ mainAxis: off[0], crossAxis: off[1] }),
            flip(),
            shift({ padding: 8 }),
        ],
        whileElementsMounted: autoUpdate,
    })

    useEffect(() => {
        const anchorEl = ov.anchorRef?.current
        if (anchorEl) {
            refs.setReference(anchorEl)
            update()
        }
    }, [ov.anchorRef, refs, update])

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