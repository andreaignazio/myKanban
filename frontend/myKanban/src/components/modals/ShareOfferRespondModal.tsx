import { forwardRef } from "react"
import { CommonMenuWrapper } from "../menuElements/menuWrapper"
import { ShareOfferRespondHeadless } from "./ShareOfferRespondHeadless"
import { useShareOffersStore } from "@/stores/shareOffersStore"
import { useAsyncKey } from "@/stores/asyncRequestStore"
//import { useAsyncRequestDisplay } from "@/hooks/useAsyncRequestDisplay"

type ShareOfferRespondModalProps = {
    shareOfferID: string
    onClose?: () => void
}

export const ShareOfferRespondModal = forwardRef<HTMLDivElement, ShareOfferRespondModalProps>(({ shareOfferID, onClose }, ref) => {
    const respondToShareOffer = useShareOffersStore((state) => state.respondToShareOffer)

    const requestKey = useAsyncKey("shareoffer:respond", shareOfferID)
    // const { displaySuccess } = useAsyncRequestDisplay(requestKey, { minSuccessMs: 800 })

    async function handleRespond(accept: boolean) {
        await respondToShareOffer(shareOfferID, accept)
        onClose?.()
    }

    return (
        <CommonMenuWrapper
            className="!bg-zinc-900"
            ref={ref} onClose={onClose} requestKey={requestKey}>
            <ShareOfferRespondHeadless
                onClose={() => onClose?.()}
                onAccept={() => handleRespond(true)}
                onReject={() => handleRespond(false)}
            />
        </CommonMenuWrapper>
    )
})
