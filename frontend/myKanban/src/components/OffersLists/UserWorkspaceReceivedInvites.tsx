

import { useCacheStore } from "@/stores/cacheStore";
import { useShareOffersStore, type ShareOffer } from "@/stores/shareOffersStore";

import { forwardRef } from "react";
import { useShallow } from "zustand/shallow";
import { GridBuilder, type ColumnDefinition } from "@/components/OffersLists/UserBoardOutgoingRequests";

type OutgoingRequestsProps = {
    panelRef?: React.RefObject<HTMLDivElement | null>;
    showOnlyPending?: boolean;
}

export const UserWorkspaceReceivedInvites = forwardRef<HTMLDivElement, OutgoingRequestsProps>(({ panelRef, showOnlyPending }: OutgoingRequestsProps, ref) => {

    const offersIds = useShareOffersStore(useShallow((state) => state.userWsIncomingOfferIds))

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
        { name: "Workspace", key: "workspace", width: "1.5fr", align: "center", getValue: (offer: ShareOffer) => getWorkspaceIdFromOffer(offer) },
        { name: "Status", key: "status", width: "1fr", align: "center", getValue: (offer: ShareOffer) => offer.Status, style: { textTransform: "capitalize", transform: "translateX(8px)" } },
        { name: "Role", key: "role", width: "1fr", align: "center", getValue: (offer: ShareOffer) => offer.OfferedRole, style: { textTransform: "capitalize", transform: "translateX(18px)" } },
        { name: "Date", key: "date", width: "1.5fr", align: "end", getValue: (offer: ShareOffer) => offer.CreatedAt },
        { name: "From", key: "sender", width: "2fr", getValue: (offer: ShareOffer) => offer.FromUserID, labelStyle: { transform: "translateX(-22px)" } },
        { name: "Action", key: "action", width: "1fr", align: "start", getValue: (offer: ShareOffer) => offer.Status === "pending" ? "respond" : offer.Status, labelStyle: { transform: "translateX(-22px)" } },
    ]

    return (
        <div className="w-full flex flex-col gap-3 animate-rise-in">
            <GridBuilder
                columns={columns}
                data={offersIds}
                emptyMessage="No workspace invites received."
                shouldShow={showOnlyPending ? (offer) => offer.Status === "pending" : undefined}
            />
        </div>
    )
})
