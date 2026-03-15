import { useShareOffersStore, type ShareOffer } from "@/stores/shareOffersStore";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { GridBuilder, ActionComponent, type ColumnDefinition } from "@/components/OffersLists/UserBoardOutgoingRequests";

type OutletCtx = { showOnlyFiltered: boolean }

export function WorkspaceOutbox() {
    const workspaceID = useParams().workspaceId ?? "";
    const { showOnlyFiltered } = useOutletContext<OutletCtx>();
    const allShareOffers = useShareOffersStore(useShallow((state) => state.getWorkspaceShareOffers(workspaceID))) ?? [];
    const shareOffers = showOnlyFiltered ? allShareOffers.filter(o => o.Status === "pending") : allShareOffers;

    useEffect(() => {
        if (!workspaceID) return;
        useShareOffersStore.getState().fetchWorkspaceShareOffers(workspaceID);
    }, [workspaceID]);

    const columns: ColumnDefinition[] = [
        {
            name: "Destinatario",
            key: "recipient",
            width: "2fr",
            getValue: (offer: ShareOffer) => offer.ToUserID,
        },
        { name: "Stato", key: "status", width: "1fr", align: "center", getValue: (offer: ShareOffer) => offer.Status },
        { name: "Ruolo", key: "role", width: "1fr", align: "center", getValue: (offer: ShareOffer) => offer.OfferedRole },
        { name: "Data", key: "date", width: "1.2fr", getValue: (offer: ShareOffer) => offer.CreatedAt },
        {
            name: "Mittente",
            key: "sender",
            width: "2fr",
            getValue: (offer: ShareOffer) => offer.FromUserID,
        },
        {
            name: "Azione",
            key: "action",
            width: "140px",
            align: "center",
            getValue: (offer: ShareOffer) => offer.Status === "pending" ? "revoke" : offer.Status,
            renderCell: ({ value, shareId }) => <ActionComponent action={value as "revoke" | "accepted" | "rejected" | "none"} shareId={shareId} />,
        },
    ]

    return (
        <div className="w-full h-full flex flex-col items-center justify-start p-0 font-grotesk">


            <div className="w-full max-w-5xl flex flex-col gap-3 animate-rise-in">
                <GridBuilder
                    columns={columns}
                    data={shareOffers.map((offer) => offer.ID)}
                    emptyMessage="Nessuna condivisione inviata per questo workspace."
                />
            </div>
        </div>
    )
}
