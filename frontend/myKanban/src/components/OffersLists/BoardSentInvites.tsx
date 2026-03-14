import type { ShareOffer } from "@/stores/shareOfferTypes"
import { GridBuilder, type ColumnDefinition } from "./UserBoardOutgoingRequests"
import { forwardRef, useEffect, useState } from "react"
import { useShareOffersStore } from "@/stores/shareOffersStore"
import { useShallow } from "zustand/shallow"
import { useParams } from "react-router-dom"

export const BoardSentInvites = forwardRef<HTMLDivElement, { showOnlyPending?: boolean }>(({ showOnlyPending }, ref) => {
    const fetchBoardSentInvites = useShareOffersStore((state) => state.fetchBoardSentInvites)
    const idsByBoardId = useShareOffersStore(useShallow((state) => state.boardSentInvitesIdsByBoardId))
    const [offersIds, setOffersIds] = useState<string[]>([])

    const boardId = useParams().boardId || "";
    useEffect(() => {
        fetchBoardSentInvites(boardId);
    }, [fetchBoardSentInvites, boardId])

    useEffect(() => {
        setOffersIds(idsByBoardId[boardId] || [])
    }, [idsByBoardId, boardId])

    function getActionForOffer(offer: ShareOffer) {
        if (offer.Status === "pending") {
            return "revoke";
        } else if (offer.Status === "accepted") {
            return "accepted";
        } else if (offer.Status === "rejected") {
            return "rejected";
        } else {
            return "none";
        }
    }

    const columns: ColumnDefinition[] = [
        { name: "Stato", key: "status", width: "0.5fr", align: "center", getValue: (offer: ShareOffer) => offer.Status },
        { name: "Ruolo", key: "role", width: "0.5fr", align: "center", getValue: (offer: ShareOffer) => offer.OfferedRole },
        { name: "Data", key: "date", width: "1.2fr", align: "center", getValue: (offer: ShareOffer) => offer.CreatedAt },
        { name: "Destinatario", key: "sender", width: "2fr", getValue: (offer: ShareOffer) => offer.ToUserID },
        { name: "Azione", key: "action", width: "90px", align: "center", getValue: (offer: ShareOffer) => getActionForOffer(offer) },
    ]

    return (
        <div ref={ref} className="w-full flex flex-col gap-3 animate-rise-in">
            <GridBuilder columns={columns} data={offersIds} shouldShow={showOnlyPending ? (offer) => offer.Status === "pending" : undefined} />
        </div>
    )
})