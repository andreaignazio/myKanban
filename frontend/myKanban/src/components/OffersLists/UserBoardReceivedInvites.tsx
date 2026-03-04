
import { useCacheStore } from "@/stores/cacheStore";
import { useShareOffersStore, type ShareOffer } from "@/stores/shareOffersStore";

import { forwardRef, useEffect, } from "react";
import { useShallow } from "zustand/shallow";
import { GridBuilder } from "@/components/OffersLists/UserBoardOutgoingRequests";

type OutgoingRequestsProps = {
    panelRef?: React.RefObject<HTMLDivElement | null>;
}
export type ColumnDefinition = {
    name: string;
    key: string;
    width?: string;
    align?: "start" | "center" | "end";
    getValue: (offer: ShareOffer) => string | null;
    style?: React.CSSProperties;
    labelStyle?: React.CSSProperties;
}

export const UserBoardReceivedInvites = forwardRef<HTMLDivElement, OutgoingRequestsProps>(({ panelRef }: OutgoingRequestsProps, ref) => {

    const fetchUserBoardInvitesIncoming = useShareOffersStore((state) => state.fetchUserBoardInvitesIncoming)

    const offersIds = useShareOffersStore(useShallow((state) => state.userBoardInvitesIncomingIds))

    useEffect(() => {

        fetchUserBoardInvitesIncoming();
    }, [fetchUserBoardInvitesIncoming])

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
            // console.log("Board fetched for offer:", offer.ID, "is:", board);
            return board?.WorkspaceID || null;
        } else if (offer.TargetType === "workspace") {
            // console.log("Offer with ID:", offer.ID, "is a workspace share offer with TargetID:", offer.TargetID);
            return offer.TargetID;
        }
        return null;
    }

    const columns = [
        { name: "Board", key: "board", width: "2fr", align: "start", getValue: (offer: ShareOffer) => getBoardIdFromOffer(offer) },
        { name: "Workspace", key: "workspace", width: "1.5fr", align: "center", getValue: (offer: ShareOffer) => getWorkspaceIdFromOffer(offer) },
        { name: "Stato", key: "status", width: "0.5fr", align: "center", getValue: (offer: ShareOffer) => offer.Status },
        { name: "Ruolo", key: "role", width: "0.5fr", align: "center", getValue: (offer: ShareOffer) => offer.OfferedRole },
        { name: "Data", key: "date", width: "1.2fr", align: "center", getValue: (offer: ShareOffer) => offer.CreatedAt },
        { name: "Mittente", key: "sender", width: "2fr", getValue: (offer: ShareOffer) => offer.FromUserID },
        { name: "Azione", key: "action", width: "120px", align: "center", getValue: (offer: ShareOffer) => offer.Status === "pending" ? "respond" : offer.Status },
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