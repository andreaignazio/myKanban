
import { useCacheStore } from "@/stores/cacheStore";
import { useShareOffersStore, type ShareOffer } from "@/stores/shareOffersStore";

import { forwardRef } from "react";
import { useShallow } from "zustand/shallow";
import { GridBuilder } from "@/components/OffersLists/UserBoardOutgoingRequests";

type OutgoingRequestsProps = {
    panelRef?: React.RefObject<HTMLDivElement | null>;
    showOnlyPending?: boolean;
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

export const UserBoardReceivedInvites = forwardRef<HTMLDivElement, OutgoingRequestsProps>(({ panelRef, showOnlyPending }: OutgoingRequestsProps, ref) => {

    const offersIds = useShareOffersStore(useShallow((state) => state.userBoardInvitesIncomingIds))

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

    const columns: ColumnDefinition[] = [
        { name: "Board", key: "board", width: "1fr", align: "center", getValue: (offer: ShareOffer) => getBoardIdFromOffer(offer) },
        { name: "Workspace", key: "workspace", width: "1fr", align: "center", getValue: (offer: ShareOffer) => getWorkspaceIdFromOffer(offer) },
        { name: "Status", key: "status", width: "0.5fr", align: "center", getValue: (offer: ShareOffer) => offer.Status },
        { name: "Role", key: "role", width: "0.5fr", align: "center", getValue: (offer: ShareOffer) => offer.OfferedRole },
        { name: "Date", key: "date", width: "1fr", align: "center", getValue: (offer: ShareOffer) => offer.CreatedAt },
        { name: "From", key: "sender", width: "2fr", align: "center", getValue: (offer: ShareOffer) => offer.FromUserID },
        { name: "Action", key: "action", width: "1fr", align: "center", getValue: (offer: ShareOffer) => offer.Status === "pending" ? "respond" : offer.Status },
    ]

    return (
        <div className="w-full flex flex-col gap-3 animate-rise-in">
            <GridBuilder
                columns={columns}
                data={offersIds}
                emptyMessage="No board invites received."
                shouldShow={showOnlyPending ? (offer) => offer.Status === "pending" : undefined}
            />
        </div>
    )
})