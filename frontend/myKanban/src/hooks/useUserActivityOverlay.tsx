import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { UserActivityOverlay } from "@/pages/User/userActivityOverlay";
import { useEffect, useRef } from "react";
import { useShallow } from "zustand/shallow";
import { useUiStore } from "@/stores/uiStore";

export function useUserActivityOverlay() {
    const openOverlay = useOverlayStore((state) => state.open);
    const closeOverlay = useOverlayStore((state) => state.close);
    const isActive = useOverlayStore((state) => state.isActive);
    const stack = useOverlayStore(useShallow((state) => state.stack));
    const { userActivityOverlayOpen, userActivityOverlayData, setUserActivityOverlayOpen } = useUiStore(useShallow((state) => ({
        userActivityOverlayOpen: state.userActivityOverlayOpen,
        userActivityOverlayData: state.userActivityOverlayData,
        setUserActivityOverlayOpen: state.setUserActivityOverlayOpen,
    })));

    const menuId = "user-activity-overlay";
    const requestedKey = `${userActivityOverlayData?.userID ?? ""}:${userActivityOverlayData?.workspaceID ?? ""}`
    const openedKeyRef = useRef<string>("")

    const panelRef = useRef<HTMLDivElement>(null)
    function handleOpenUserActivityOverlay() {
        if (!userActivityOverlayData?.userID) return;

        const descriptor: OverlayDescriptor = {
            id: menuId,
            render: () => <UserActivityOverlay onClose={() => setUserActivityOverlayOpen(false)} ref={panelRef}
                userId={userActivityOverlayData.userID} workspaceId={userActivityOverlayData.workspaceID}
            />,
            panelRef,
            type: "modal",
            renderType: "virtual",
            exclusiveGroup: "card-detail-modal",
            opts: {
                closeOnMouseLeave: false,
                closeOnClickOutside: true,
                closeOnEscape: true,
                lockBackdrop: true,
            },
            position: {
                virtual: "viewport-center"
            },
            desiredBackdropOpacity: 0.9,
        }
        openOverlay(descriptor);
    }

    useEffect(() => {
        if (userActivityOverlayOpen) {
            const isOpen = isActive(menuId)
            if (!isOpen) {
                handleOpenUserActivityOverlay()
                openedKeyRef.current = requestedKey
            } else if (openedKeyRef.current !== requestedKey) {
                closeOverlay(menuId)
                handleOpenUserActivityOverlay()
                openedKeyRef.current = requestedKey
            }
        } else {
            closeOverlay(menuId)
            openedKeyRef.current = ""
        }
    }, [userActivityOverlayOpen, requestedKey, isActive, openOverlay, closeOverlay])

    useEffect(() => {
        if (!isActive(menuId) && userActivityOverlayOpen) {
            setUserActivityOverlayOpen(false)
        }
    }, [stack, isActive, userActivityOverlayOpen, setUserActivityOverlayOpen])

}