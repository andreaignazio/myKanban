import { OverlayRoot } from "@/overlays/OverlayRootOLD"
import { useOverlayStore } from "@/overlays/store"
import { useRef } from "react"
import { useShallow } from "zustand/react/shallow"


export function MembershipDropdown(overlayIdProp?: string) {
    const overlayId = overlayIdProp || "membership-dropdown"
    const close = useOverlayStore((state) => state.close)
    const open = useOverlayStore((state) => state.open)
    const openId = useOverlayStore(useShallow((state) => state.getOpenId()))

    const anchorRef = useRef<HTMLButtonElement | null>(null)
    const panelRef = useRef<HTMLDivElement | null>(null)

    const toggle = () => {
        // console.log("toggle", { openId, overlayId })
        if (openId === overlayId) close()
        else open(overlayId)
        //setOpenId(getOpenId())
    }

    const menuItems = [
        { id: 0, label: "Viewer" },
        { id: 1, label: "Member" },
        { id: 2, label: "Admin" },
        { id: 3, label: "Owner" },
    ]

    return (
        <div className="relative">
            <button
                ref={anchorRef}
                onClick={toggle}
                className="rounded-lg border px-3 py-2 hover:bg-active"
            >
                Membership
            </button>
            <OverlayRoot
                overlayId={overlayId}
                anchorRef={anchorRef}
                panelRef={panelRef}
            >
                <div
                    ref={panelRef}
                    className="w-64 rounded-xl border bg-white shadow-lg p-2"
                >
                    <div className="px-3 py-2 text-sm text-gray-500">Select role</div>
                    {menuItems.map((item) => (
                        <button
                            className="w-full text-left rounded-lg px-3 py-2 hover:bg-gray-100"
                            onClick={() => {
                                close()
                            }}
                        >
                            {item.label}
                        </button>
                    ))}

                </div>

            </OverlayRoot>


        </div>
    )



}