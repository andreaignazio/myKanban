import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
        whileElementsMounted: (reference, floating, update) =>
            autoUpdate(reference, floating, update, { elementResize: false }),
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

    // After initial positioning, enable a smooth CSS transition on transform so that
    // any subsequent position corrections (e.g. after a height animation) are fluid
    // instead of snapping.
    const [canTransition, setCanTransition] = useState(false)
    const floatingElRef = useRef<HTMLDivElement | null>(null)
    const debounceRef = useRef<number | undefined>(undefined)
    const lastSizeRef = useRef<{ w: number; h: number } | null>(null)

    // Debounced ResizeObserver: fires a single update() after the height animation
    // settles, but only when the size delta is significant enough to warrant a
    // repositioning (avoids jarring micro-adjustments for small changes).
    useLayoutEffect(() => {
        const el = floatingElRef.current
        if (!el) return
        const THRESHOLD = 16
        const observer = new ResizeObserver((entries) => {
            const { inlineSize: w, blockSize: h } = entries[0].borderBoxSize[0]
            const prev = lastSizeRef.current
            const delta = prev ? Math.max(Math.abs(w - prev.w), Math.abs(h - prev.h)) : Infinity
            lastSizeRef.current = { w, h }
            if (delta < THRESHOLD) return
            clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => update(), 10)
        })
        observer.observe(el)
        return () => { observer.disconnect(); clearTimeout(debounceRef.current) }
    }, [update])

    const setFloating = useCallback((el: HTMLDivElement | null) => {
        floatingElRef.current = el
        if (ov.panelRef) {
            ov.panelRef.current = el
        }
        refs.setFloating(el)
        if (el) {
            update()
            // Enable position transition after the initial position has been painted
            requestAnimationFrame(() => requestAnimationFrame(() => setCanTransition(true)))
        }
    }, [refs, update, ov.panelRef])



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
                style={{
                    ...floatingStyles,
                    transition: canTransition ? "transform 300ms ease-in-out" : undefined,
                    pointerEvents: ov.isInteractive === false ? "none" : "auto",
                }}
                aria-hidden={ov.isInteractive === false}
            >
                {ov.render()}
            </div>
        </div>
    )
}
