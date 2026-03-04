import type { OverlayDescriptor } from "./overlayStore"

export function VirtualOverlay(ov: OverlayDescriptor) {

    const rect = ov.panelRef?.current?.getBoundingClientRect() || { width: 0, height: 0 }


    const style: React.CSSProperties = {
        position: "fixed",
        top: (window.innerHeight - rect.height) / 2,
        left: (window.innerWidth - rect.width) / 2,
    }
    return (
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1000 }}>
            <div
                ref={ov.panelRef}
                className=" bg-transparent rounded-full flex items-center justify-center"
                style={{ ...style, pointerEvents: "auto" }}
            >
                {ov.render()}
            </div>
        </div>
    )
}