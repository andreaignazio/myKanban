import type { ShareOffer } from "@/stores/shareOfferTypes"
import { GridBuilder, type ColumnDefinition } from "./UserBoardOutgoingRequests"
import { forwardRef, useEffect, useState } from "react"
import { useShareOffersStore } from "@/stores/shareOffersStore"
import { useShallow } from "zustand/shallow"
import { useParams } from "react-router-dom"

export const BoardReceivedRequests = forwardRef<HTMLDivElement, { showOnlyPending?: boolean }>(({ showOnlyPending }, ref) => {


    //const fetchUserBoardAccessSentRequests = useShareOffersStore((state) => state.fetchUserBoardAccessSentRequests)
    const fetchBoardReceivedRequests = useShareOffersStore((state) => state.fetchBoardReceivedRequests)
    const idsByBoardId = useShareOffersStore(useShallow((state) => state.boardReceivedRequestsIdsByBoardId))
    const [offersIds, setOffersIds] = useState<string[]>([])



    // const offersById = useCacheStore((state) => state.offerById)
    const boardId = useParams().boardId || "";
    useEffect(() => {

        fetchBoardReceivedRequests(boardId);

    }, [fetchBoardReceivedRequests, boardId])


    useEffect(() => {
        setOffersIds(idsByBoardId[boardId] || [])
    }, [idsByBoardId, boardId])
    function getActionForOffer(offer: ShareOffer) {
        if (offer.Status === "pending") {
            return "respond";
        } else if (offer.Status === "accepted") {
            return "accepted";
        } else if (offer.Status === "rejected") {
            return "rejected";
        } else {
            return "none";
        }
    }



    const columns: ColumnDefinition[] = [
        // { name: "Board", key: "board", width: "2fr", align: "start", getValue: (offer: ShareOffer) => getBoardIdFromOffer(offer) },
        //{ name: "Workspace", key: "workspace", width: "1.5fr", align: "center", getValue: (offer: ShareOffer) => getWorkspaceIdFromOffer(offer) },
        { name: "Mittente", key: "sender", width: "2fr", getValue: (offer: ShareOffer) => offer.FromUserID },
        { name: "Stato", key: "status", width: "0.5fr", align: "center", getValue: (offer: ShareOffer) => offer.Status },
        { name: "Ruolo", key: "role", width: "0.5fr", align: "center", getValue: (offer: ShareOffer) => offer.OfferedRole },
        { name: "Data", key: "date", width: "1.2fr", align: "center", getValue: (offer: ShareOffer) => offer.CreatedAt },

        { name: "Azione", key: "action", width: "120px", align: "center", getValue: (offer: ShareOffer) => getActionForOffer(offer) },
    ]

    return (
        <div ref={ref} className="w-full flex flex-col gap-3 animate-rise-in">
            <GridBuilder columns={columns} data={offersIds} shouldShow={showOnlyPending ? (offer) => offer.Status === "pending" : undefined} />
        </div>
    )
})