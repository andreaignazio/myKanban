import { useOverlayStore } from "@/overlays/overlayStore"
import { useEffect, useState } from "react"
import { useShallow } from "zustand/react/shallow"

export function useIsOverlayActive(id: string) {

    const [isMenuActive, setIsMenuActive] = useState(false)

    const isOverlayActive = useOverlayStore((state) => state.isActive)
    const stack = useOverlayStore(useShallow((state) => state.stack))
    const menuId = id
    useEffect(() => {
        if (!isOverlayActive(menuId)) {
            setIsMenuActive(false)
        } else {
            setIsMenuActive(true)
        }
    }, [isOverlayActive, isMenuActive, stack])

    return (

        { isMenuActive }
    )
}

export function useIsOverlayActiveDumb() {

    return useIsOverlayActive
}