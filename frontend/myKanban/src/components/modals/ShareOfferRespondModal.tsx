import { forwardRef } from "react"
import { CommonMenuWrapper } from "../menuElements/menuWrapper"
import { ShareOfferRespondHeadless } from "./ShareOfferRespondHeadless"
import { useShareOffersStore } from "@/stores/shareOffersStore"
import { useAsyncKey } from "@/stores/asyncRequestStore"

type ShareOfferRespondModalProps = {
    shareOfferID: string
    onClose?: () => void
    mode?: "respond" | "revoke"
}

export const ShareOfferRespondModal = forwardRef<HTMLDivElement, ShareOfferRespondModalProps>(({ shareOfferID, onClose, mode = "respond" }, ref) => {
    const respondToShareOffer = useShareOffersStore((state) => state.respondToShareOffer)
    const revokeWorkspaceShareOffer = useShareOffersStore((state) => state.revokeWorkspaceShareOffer)

    const requestKey = useAsyncKey(mode === "revoke" ? "shareoffer:revoke" : "shareoffer:respond", shareOfferID)

    async function handleRespond(accept: boolean) {
        await respondToShareOffer(shareOfferID, accept)
        onClose?.()
    }

    async function handleRevoke() {
        await revokeWorkspaceShareOffer(shareOfferID, "")
        onClose?.()
    }

    return (
        <CommonMenuWrapper
            className="!bg-zinc-900"
            ref={ref} onClose={onClose} requestKey={requestKey}>
            <ShareOfferRespondHeadless
                mode={mode}
                onClose={() => onClose?.()}
                onAccept={() => handleRespond(true)}
                onReject={mode === "revoke" ? handleRevoke : () => handleRespond(false)}
            />
        </CommonMenuWrapper>
    )
})
