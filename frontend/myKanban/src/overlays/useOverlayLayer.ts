import { useRef } from "react";
import { useOverlayStore, type OverlayDescriptor } from "./overlayStore";

export function useOverlayLayer() {

    function newFloatingMenu(id: string, render: (ref: React.RefObject<HTMLDivElement>) => React.ReactNode, ){

        const openMenu = useOverlayStore((state) => state.open)
        const onMenuClose = useOverlayStore((state) => state.close);
        const panelRef = useRef<HTMLDivElement | null>(null);
    
        function open(shareOfferID: string) {
            // console.log("Opening revoke modal for share offer", shareOfferID);
            const id = "revokeModal-" + shareOfferID;
            const descriptor: OverlayDescriptor = {
                id: id,
                render: () => render(panelRef),
                panelRef: panelRef,
                type: "modal",
                renderType: "virtual",
                exclusiveGroup: "share-action-modal",
                opts: {
                    closeOnMouseLeave: false,
                    closeOnClickOutside: true,
                    closeOnEscape: true,
                    lockBackdrop: true,
                },
                position: {
                    virtual: "viewport-center"
                }
            }
            openMenu(descriptor);
    
        }

        return{
            open,
            onMenuClose,
            ref: panelRef
        }
    }
    return {
        newFloatingMenu
    }
}
