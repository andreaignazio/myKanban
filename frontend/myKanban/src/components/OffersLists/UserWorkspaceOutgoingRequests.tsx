import { useShareOffersStore, type ShareOffer } from "@/stores/shareOffersStore";
import { forwardRef, useEffect } from "react";
import { useShallow } from "zustand/shallow";
import { GridBuilder, type ColumnDefinition } from "@/components/OffersLists/UserBoardOutgoingRequests";

type OutgoingRequestsProps = {
    panelRef?: React.RefObject<HTMLDivElement | null>;
    showOnlyPending?: boolean;
}

export const UserWorkspaceOutgoingRequests = forwardRef<HTMLDivElement, OutgoingRequestsProps>(({ panelRef, showOnlyPending }: OutgoingRequestsProps, ref) => {
    const fetchUserWorkspaceAccessSentRequests = useShareOffersStore((state) => state.fetchUserWorkspaceAccessSentRequests)

    const offersIds = useShareOffersStore(useShallow((state) => state.userWorkspaceAccessSentRequestsIds))
    useEffect(() => {

        fetchUserWorkspaceAccessSentRequests();
    }, [fetchUserWorkspaceAccessSentRequests])

    const columns: ColumnDefinition[] = [
        { name: "Workspace", key: "workspace", width: "1.5fr", align: "center", getValue: (offer: ShareOffer) => offer.TargetID },
        { name: "Status", key: "status", width: "1fr", align: "center", getValue: (offer: ShareOffer) => offer.Status, },
        { name: "Role", key: "role", width: "1fr", align: "center", getValue: (offer: ShareOffer) => offer.OfferedRole, },
        { name: "Date", key: "date", width: "1fr", align: "center", getValue: (offer: ShareOffer) => offer.CreatedAt },
        { name: "Action", key: "action", width: "1fr", align: "center", getValue: (offer: ShareOffer) => offer.Status === "pending" ? "revoke" : offer.Status, },
    ]

    return (
        <div className="w-full flex flex-col gap-3 animate-rise-in">
            <GridBuilder
                columns={columns}
                data={offersIds}
                emptyMessage="No workspace access requests sent."
                shouldShow={showOnlyPending ? (offer) => offer.Status === "pending" : undefined}
            />
        </div>
    )
})
