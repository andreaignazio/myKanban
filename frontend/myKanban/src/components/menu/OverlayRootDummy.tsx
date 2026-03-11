import { OverlayRoot } from "@/overlays/OverlayRootOLD"
import { useOverlayStore } from "@/overlays/store"

import { useRef, useState } from "react"
import { useShallow } from "zustand/react/shallow"

type OverlayRootDummyProps = {
    label: string
    overlayIdProp?: string
    children?: React.ReactNode
    panelRef: React.RefObject<HTMLDivElement | null>
}

export function OverlayRootDummy({ label, overlayIdProp, children, panelRef }: OverlayRootDummyProps) {
    const overlayId = overlayIdProp || "membership-dropdown"
    const close = useOverlayStore((state) => state.close)
    const open = useOverlayStore((state) => state.open)
    const openId = useOverlayStore(useShallow((state) => state.getOpenId()))

    const anchorRef = useRef<HTMLButtonElement | null>(null)
    //const panelRef = useRef<HTMLDivElement | null>(null)

    const toggle = () => {
        // console.log("toggle", { openId, overlayId })
        if (openId === overlayId) close()
        else open(overlayId)
        //setOpenId(getOpenId())
    }


    return (
        <div className="relative">
            <button
                ref={anchorRef}
                onClick={toggle}
                className="rounded-lg border px-3 py-2 hover:bg-active"
            >
                {label}
            </button>
            <OverlayRoot
                overlayId={overlayId}
                anchorRef={anchorRef}
                panelRef={panelRef}
                closeOnOutside={false}
            >
                {children}

            </OverlayRoot>


        </div>
    )



}