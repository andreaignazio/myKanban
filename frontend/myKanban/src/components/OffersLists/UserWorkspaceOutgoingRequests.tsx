import { useShareOffersStore, type ShareOffer } from "@/stores/shareOffersStore";
import { forwardRef, useEffect } from "react";
import { useShallow } from "zustand/shallow";
import { GridBuilder, type ColumnDefinition } from "@/components/OffersLists/UserBoardOutgoingRequests";

type OutgoingRequestsProps = {
    panelRef?: React.RefObject<HTMLDivElement | null>;
}

export const UserWorkspaceOutgoingRequests = forwardRef<HTMLDivElement, OutgoingRequestsProps>(({ panelRef }: OutgoingRequestsProps, ref) => {
    const fetchUserWorkspaceAccessSentRequests = useShareOffersStore((state) => state.fetchUserWorkspaceAccessSentRequests)

    const offersIds = useShareOffersStore(useShallow((state) => state.userWorkspaceAccessSentRequestsIds))
    useEffect(() => {

        fetchUserWorkspaceAccessSentRequests();
    }, [fetchUserWorkspaceAccessSentRequests])

    const columns: ColumnDefinition[] = [
        { name: "Workspace", key: "workspace", width: "1.5fr", align: "center", getValue: (offer: ShareOffer) => offer.TargetID },
        { name: "Stato", key: "status", width: "1fr", align: "center", getValue: (offer: ShareOffer) => offer.Status, style: { textTransform: "capitalize", transform: "translateX(8px)" } },
        { name: "Ruolo", key: "role", width: "1fr", align: "center", getValue: (offer: ShareOffer) => offer.OfferedRole, style: { textTransform: "capitalize", transform: "translateX(18px)" } },
        { name: "Data", key: "date", width: "1.5fr", align: "end", getValue: (offer: ShareOffer) => offer.CreatedAt },
        { name: "Azione", key: "action", width: "1fr", align: "start", getValue: (offer: ShareOffer) => offer.Status === "pending" ? "revoke" : offer.Status, labelStyle: { transform: "translateX(-22px)" } },
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
                <p className="text-2xl font-semibold tracking-tight text-text">Workspace Requests</p>
                <p className="text-sm text-text/70">Richieste di accesso ai workspace inviate da te.</p>
            </div>

            <div className="w-full max-w-5xl flex flex-col gap-3 animate-rise-in">
                <GridBuilder columns={columns} data={offersIds} />
            </div>
        </div>
    )
})
