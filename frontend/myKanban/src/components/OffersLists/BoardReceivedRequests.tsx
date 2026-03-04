import type { ShareOffer } from "@/stores/shareOfferTypes"
import { GridBuilder } from "./UserBoardOutgoingRequests"
import { forwardRef, useEffect, useState } from "react"
import { useShareOffersStore } from "@/stores/shareOffersStore"
import { useCacheStore } from "@/stores/cacheStore"
import { useShallow } from "zustand/shallow"
import { useParams } from "react-router-dom"

export const BoardReceivedRequests = forwardRef<HTMLDivElement, {}>((props, ref) => {


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

    const boardById = useCacheStore((state) => state.offerBoardById)

    function getBoardIdFromOffer(offer: ShareOffer) {
        if (offer.TargetType === "board") {
            return offer.TargetID;
        }
        return null;
    }

    function getWorkspaceIdFromOffer(offer: ShareOffer) {
        if (offer.TargetType === "board") {
            const board = boardById[offer.TargetID];
            //   console.log("Board fetched for offer:", offer.ID, "is:", board);
            return board?.WorkspaceID || null;
        }
        return null;
    }

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



    const columns = [
        // { name: "Board", key: "board", width: "2fr", align: "start", getValue: (offer: ShareOffer) => getBoardIdFromOffer(offer) },
        //{ name: "Workspace", key: "workspace", width: "1.5fr", align: "center", getValue: (offer: ShareOffer) => getWorkspaceIdFromOffer(offer) },
        { name: "Mittente", key: "sender", width: "2fr", getValue: (offer: ShareOffer) => offer.FromUserID },
        { name: "Stato", key: "status", width: "0.5fr", align: "center", getValue: (offer: ShareOffer) => offer.Status },
        { name: "Ruolo", key: "role", width: "0.5fr", align: "center", getValue: (offer: ShareOffer) => offer.OfferedRole },
        { name: "Data", key: "date", width: "1.2fr", align: "center", getValue: (offer: ShareOffer) => offer.CreatedAt },

        { name: "Azione", key: "action", width: "120px", align: "center", getValue: (offer: ShareOffer) => getActionForOffer(offer) },
    ]

    return (
        <div
            ref={ref}
            className="theme-dark w-fit h-60vh flex bg-main flex-col
            overflow-hidden 
            items-center justify-start  
            font-grotesk text-neutral-200"
        >
            <div className="w-full max-w-5xl flex flex-col gap-2 mb-4">
                <p className="text-2xl font-semibold tracking-tight text-text">Inbox</p>
                <p className="text-sm text-text/70">Condivisioni ricevute, stato e mittenti in un colpo d'occhio.</p>
            </div>

            <div className="w-full max-w-5xl flex flex-col gap-3 animate-rise-in">


                <GridBuilder columns={columns} data={offersIds} />
            </div>
        </div>
    )
})