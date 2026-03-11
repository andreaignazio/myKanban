

import { useCacheStore } from "@/stores/cacheStore";
import { useShareOffersStore, type ShareOffer } from "@/stores/shareOffersStore";

import { forwardRef, useEffect, } from "react";
import { useShallow } from "zustand/shallow";
import { GridBuilder, type ColumnDefinition } from "@/components/OffersLists/UserBoardOutgoingRequests";

type OutgoingRequestsProps = {
    panelRef?: React.RefObject<HTMLDivElement | null>;
}

export const UserWorkspaceReceivedInvites = forwardRef<HTMLDivElement, OutgoingRequestsProps>(({ panelRef }: OutgoingRequestsProps, ref) => {
    const fetchUserWorkspaceIncomingInvites = useShareOffersStore((state) => state.fetchUserWorkspaceIncomingInvites)

    const offersIds = useShareOffersStore(useShallow((state) => state.userWsIncomingOfferIds))
    useEffect(() => {

        fetchUserWorkspaceIncomingInvites();
    }, [fetchUserWorkspaceIncomingInvites])

    const boardById = useCacheStore((state) => state.offerBoardById)

    function getWorkspaceIdFromOffer(offer: ShareOffer) {
        if (offer.TargetType === "board") {
            const board = boardById[offer.TargetID];
            // console.log("Board fetched for offer:", offer.ID, "is:", board);
            return board?.WorkspaceID || null;
        } else if (offer.TargetType === "workspace") {
            return offer.TargetID;
        }
        return null;
    }

    const columns: ColumnDefinition[] = [
        //{ name: "Board", key: "board", width: "2fr", align: "start", getValue: (offer: ShareOffer) => getBoardIdFromOffer(offer) },
        { name: "Workspace", key: "workspace", width: "1.5fr", align: "center", getValue: (offer: ShareOffer) => getWorkspaceIdFromOffer(offer) },
        { name: "Stato", key: "status", width: "1fr", align: "center", getValue: (offer: ShareOffer) => offer.Status, style: { textTransform: "capitalize", transform: "translateX(8px)" } },
        { name: "Ruolo", key: "role", width: "1fr", align: "center", getValue: (offer: ShareOffer) => offer.OfferedRole, style: { textTransform: "capitalize", transform: "translateX(18px)" } },
        { name: "Data", key: "date", width: "1.5fr", align: "end", getValue: (offer: ShareOffer) => offer.CreatedAt },
        { name: "Mittente", key: "sender", width: "2fr", getValue: (offer: ShareOffer) => offer.FromUserID, labelStyle: { transform: "translateX(-22px)" } },
        { name: "Azione", key: "action", width: "1fr", align: "start", getValue: (offer: ShareOffer) => offer.Status === "pending" ? "respond" : offer.Status, labelStyle: { transform: "translateX(-22px)" } },
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
