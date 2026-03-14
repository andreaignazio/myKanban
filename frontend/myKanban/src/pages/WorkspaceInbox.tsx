import { useShareOffersStore, type ShareOffer } from "@/stores/shareOffersStore";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { useCacheStore } from "@/stores/cacheStore";
import { GridBuilder, ActionComponent, type ColumnDefinition } from "@/components/OffersLists/UserBoardOutgoingRequests";

type OutletCtx = { showOnlyFiltered: boolean }

export function WorkspaceInbox() {
    const workspaceID = useParams().workspaceId ?? "";
    const { showOnlyFiltered } = useOutletContext<OutletCtx>();
    const workspaceRequestIds = useShareOffersStore(useShallow((state) => state.workspaceReceivedRequestsIdsByWorkspaceId[workspaceID] ?? []));
    const offerById = useCacheStore(useShallow((state) => state.offerById));
    const visibleRequestIds = workspaceRequestIds.filter((id) => {
        const offer = offerById[id];
        if (!offer) return false;
        if (showOnlyFiltered && offer.Status !== "pending") return false;
        return true;
    });
    useEffect(() => {
        if (!workspaceID) return;
        useShareOffersStore.getState().fetchWorkspaceReceivedRequests(workspaceID);
    }, [workspaceID]);

    const columns: ColumnDefinition[] = [
        {
            name: "Richiedente",
            key: "sender",
            width: "2fr",
            getValue: (offer: ShareOffer) => offer.FromUserID,
        },
        { name: "Stato", key: "status", width: "1fr", align: "center", getValue: (offer: ShareOffer) => offer.Status },
        { name: "Ruolo", key: "role", width: "1fr", align: "center", getValue: (offer: ShareOffer) => offer.OfferedRole },
        { name: "Data", key: "date", width: "1.2fr", getValue: (offer: ShareOffer) => offer.CreatedAt },
        {
            name: "Target",
            key: "target",
            width: "1fr",
            align: "center",
            getValue: (offer: ShareOffer) => offer.TargetType,
            renderCell: ({ value }) => <span className="text-sm text-text capitalize">{value}</span>,
        },
        {
            name: "Azione",
            key: "action",
            width: "140px",
            align: "center",
            getValue: (offer: ShareOffer) => offer.Status === "pending" ? "respond" : offer.Status,
            renderCell: ({ value, shareId }) => <ActionComponent action={value as "respond" | "accepted" | "rejected" | "none"} shareId={shareId} />,
        },
    ]

    return (
        <div className="w-full h-full flex flex-col items-center justify-start p-6 font-grotesk">
            <div className="w-full max-w-5xl flex flex-col gap-2 mb-4">
                <p className="text-2xl font-semibold tracking-tight text-text">Inbox</p>
                <p className="text-sm text-text/70">Richieste di accesso al workspace ricevute dagli utenti.</p>
            </div>

            <div className="w-full max-w-5xl flex flex-col gap-3 animate-rise-in">
                <GridBuilder
                    columns={columns}
                    data={visibleRequestIds}
                    emptyMessage="Nessuna richiesta di accesso ricevuta per questo workspace."
                />
            </div>
        </div>
    )
}
