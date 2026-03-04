import { useEffect, useState } from "react"
import type { OverlayDescriptor } from "./overlayStore"

export function PointOverlayLive(ov: OverlayDescriptor) {
    // console.log("Rendering PointOverlayLive with descriptor:", ov)

    const [style, setStyle] = useState<React.CSSProperties>({})
    useEffect(() => {
        const onMouseMove = (event: MouseEvent) => {
            // console.log("Mouse move event:", event)
            setStyle({
                position: "fixed",
                top: event.clientY,
                left: event.clientX,
                transform: "translate(-50%, -50%)",
                zIndex: ov.zIndex ?? 1000,
                pointerEvents: "none", // Allow clicks to pass through
            })
        }

        window.addEventListener("mousemove", onMouseMove)
        return () => {
            window.removeEventListener("mousemove", onMouseMove)
            // console.log("Cleaning up event listener")
        }
    }, [])

    return (
        <div className=" bg-red-500 rounded-full flex items-center justify-center" style={style}>
            {ov.render()}
        </div>
    )
}
