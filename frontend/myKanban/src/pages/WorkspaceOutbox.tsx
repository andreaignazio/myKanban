import { useShareOffersStore, type ShareOffer } from "@/stores/shareOffersStore";
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { ExclamationCircleIcon } from "@heroicons/react/24/solid";
import { LabeledButtonCustom } from "@/components/buttons/labeledButton";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { ShareActionModal } from "@/components/modals/ShareActionModal";
import { GridBuilder, type ColumnDefinition } from "@/components/OffersLists/UserBoardOutgoingRequests";

export function WorkspaceOutbox() {
    const workspaceID = useParams().workspaceId ?? "";
    const shareOffers = useShareOffersStore(useShallow((state) => state.getWorkspaceShareOffers(workspaceID))) ?? [];
    const shareActionModalRef = useRef<HTMLDivElement>(null);

    const openMenu = useOverlayStore((state) => state.open)
    const onMenuClose = useOverlayStore((state) => state.close);

    function handleOpenRevokeModal(shareOfferID: string) {
        const id = "revokeModal-" + shareOfferID;
        const descriptor: OverlayDescriptor = {
            id: id,
            render: () => <ShareActionModal ref={shareActionModalRef} shareOfferID={shareOfferID} actionType="revoke" onClose={() => onMenuClose(id)} />,
            panelRef: shareActionModalRef,
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
            getValue: (offer: ShareOffer) => offer.ID,
            renderCell: ({ value }) => <RevokeCell shareOfferID={value} onRevoke={handleOpenRevokeModal} />,
        },
    ]

    return (
        <div className="w-full h-full flex flex-col items-center justify-start p-6 font-grotesk">
            <div className="w-full max-w-5xl flex flex-col gap-2 mb-4">
                <p className="text-2xl font-semibold tracking-tight text-text">Outbox</p>
                <p className="text-sm text-text/70">Condivisoni inviate, stato e destinatari in un colpo d'occhio.</p>
            </div>

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

function RevokeCell({ shareOfferID, onRevoke }: { shareOfferID: string | null, onRevoke: (id: string) => void }) {
    if (!shareOfferID) {
        return <span className="text-sm text-text/60">—</span>
    }

    return (
        <div className="flex md:justify-center">
            <LabeledButtonCustom label="Revoke" onClick={() => onRevoke(shareOfferID)}>
                <ExclamationCircleIcon className="w-5 h-5" />
            </LabeledButtonCustom>
        </div>
    )
}
