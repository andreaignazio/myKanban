import { useShareOffersStore, type ShareOffer } from "@/stores/shareOffersStore";
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { ExclamationCircleIcon } from "@heroicons/react/24/solid";
import { useCacheStore } from "@/stores/cacheStore";
import { LabeledButtonCustom } from "@/components/buttons/labeledButton";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { ShareOfferRespondModal } from "@/components/modals/ShareOfferRespondModal";
import { GridBuilder, type ColumnDefinition } from "@/components/OffersLists/UserBoardOutgoingRequests";

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
    const respondModalRef = useRef<HTMLDivElement>(null);

    const openMenu = useOverlayStore((state) => state.open)
    const onMenuClose = useOverlayStore((state) => state.close);

    function handleOpenRespondModal(shareOfferID: string) {
        const id = "respondModal-" + shareOfferID;
        const descriptor: OverlayDescriptor = {
            id: id,
            render: () => <ShareOfferRespondModal ref={respondModalRef} shareOfferID={shareOfferID} onClose={() => onMenuClose(id)} />,
            panelRef: respondModalRef,
            type: "modal",
            renderType: "virtual",
            exclusiveGroup: "share-action-modal",
            opts: {
                closeOnMouseLeave: false,
                closeOnClickOutside: true,
                closeOnEscape: true,
                lockBackdrop: true,
            },
            position: {
                virtual: "viewport-center"
            }
        }
        openMenu(descriptor);
    }

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
            getValue: (offer: ShareOffer) => offer.ID,
            renderCell: ({ value }) => <RespondCell shareOfferID={value} onRespond={handleOpenRespondModal} />,
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

function RespondCell({ shareOfferID, onRespond }: { shareOfferID: string | null, onRespond: (id: string) => void }) {
    if (!shareOfferID) {
        return <span className="text-sm text-text/60">—</span>
    }

    return (
        <div className="flex md:justify-center">
            <LabeledButtonCustom label="Respond" onClick={() => onRespond(shareOfferID)}>
                <ExclamationCircleIcon className="w-5 h-5" />
            </LabeledButtonCustom>
        </div>
    )
}
