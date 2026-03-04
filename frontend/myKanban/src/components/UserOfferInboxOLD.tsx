import { useShareOffersStore, type ShareOffer } from "@/stores/shareOffersStore";
import { forwardRef, use, useEffect, useRef, useState, type RefObject } from "react";
import { useShallow } from "zustand/shallow";
import { LabeledButtonCustom } from "./buttons/labeledButton";
import ExclamationCircleIcon from "@heroicons/react/24/solid/ExclamationCircleIcon";
import { PencilIcon } from "@heroicons/react/24/outline";
import { UserComponent } from "@/components/OffersLists/UserBoardOutgoingRequests";
import { getRoleBadgeClass, getStatusBadgeClass } from "@/pages/WorkspaceOutbox/utils/shareOfferBadges";
import { EnvelopeIcon } from "@heroicons/react/24/solid";
import { useCacheStore } from "@/stores/cacheStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { SubscriptionBadge } from "./sidebar/Sidebar";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { WorkspaceHoverCard } from "./modals/WorkspaceHoverCard";
import { ShareActionModal } from "./modals/ShareActionModal";

type InboxProps = {
    panelRef?: React.RefObject<HTMLDivElement | null>;
}

export const WorkspaceOfferInbox = forwardRef<HTMLDivElement, InboxProps>(({ panelRef }: InboxProps, ref) => {
    const fetchUserIncomingShareOffers = useShareOffersStore((state) => state.fetchUserWorkspaceIncomingInvites)

    const inOffers = useShareOffersStore(useShallow((state) => Object.values(state.userIncomingShareOffersById)))

    useEffect(() => {
        //console.log("USE-EFFECT: Fetching user incoming share offers details");
        fetchUserIncomingShareOffers();
    }, [fetchUserIncomingShareOffers])


    const style: React.CSSProperties = {
        position: "fixed",
        width: "800px",
        height: "100vh",
        zIndex: 1000,
        //backgroundColor: "bg-menu/80",
    }



    return (
        <div
            ref={ref}
            className="theme-dark w-full h-60vh flex bg-main flex-col
            overflow-hidden rounded-lg shadow-lg 
            items-center justify-start p-6 
            font-grotesk text-neutral-200"
        >
            <div className="w-full max-w-5xl flex flex-col gap-2 mb-4">
                <p className="text-2xl font-semibold tracking-tight text-text">Inbox</p>
                <p className="text-sm text-text/70">Condivisioni ricevute, stato e mittenti in un colpo d'occhio.</p>
            </div>

            <div className="w-full max-w-5xl flex flex-col gap-3 animate-rise-in">
                <div className="hidden md:grid grid-cols-[32px_2fr_1fr_1fr_1.2fr_2fr_140px] gap-3 items-center px-4 py-2 text-xs uppercase tracking-wide text-text/60">
                    <div />
                    <div>Workspace</div>
                    <div className="flex justify-center">Stato</div>
                    <div className="flex justify-center">Ruolo</div>
                    <div>Data</div>
                    <div className="flex justify-center">Mittente</div>
                    <div className="flex justify-center">Azione</div>
                </div>

                {inOffers.length === 0 && (
                    <div className="w-full rounded-xl border border-border/40 p-6 text-sm text-text/70">
                        Nessuna condivisione ricevuta per te.
                    </div>
                )}
                {inOffers.length > 0 && inOffers.map((offer) => (
                    <ShareOfferRow key={offer.ID} shareOffer={offer} />
                ))}
            </div>
        </div>
    )
})


function ShareOfferRow({ shareOffer }: { shareOffer: ShareOffer }) {
    const iso = shareOffer.CreatedAt;
    const d = new Date(iso);

    const readable = new Intl.DateTimeFormat("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(d);

    const statusBadgeClass = getStatusBadgeClass(shareOffer.Status);
    const roleBadgeClass = getRoleBadgeClass(shareOffer.OfferedRole);
    const respondToShareOffer = useShareOffersStore((state) => state.respondToShareOffer)
    const openOverlay = useOverlayStore((state) => state.open)
    const onMenuClose = useOverlayStore((state) => state.close)
    const workspaceHoverCardRef = useRef<HTMLDivElement | null>(null)

    async function handleAccept() {
        // console.log("Accepting offer", typeof respondToShareOffer, respondToShareOffer)
        await respondToShareOffer(shareOffer.ID, true)
    }
    async function handleReject() {
        await respondToShareOffer(shareOffer.ID, false)
    }

    const anchorMapRef = useRef<Map<string, RefObject<HTMLDivElement | null> | undefined>>(new Map())
    const registerAnchor = (key: string, ref: RefObject<HTMLDivElement | null> | undefined) => {
        anchorMapRef.current.set(key, ref)
    }

    const handleOnWorkspaceClick = (id: string) => {
        const anchorRef = anchorMapRef.current.get(id) || undefined
        ///console.log("Clicked workspace", shareOffer.TargetID)
        const descriptor: OverlayDescriptor = {
            id: `workspace-${shareOffer.TargetID}`,
            render: () => <WorkspaceHoverCard workspaceID={shareOffer.TargetID} ref={workspaceHoverCardRef} />,
            panelRef: workspaceHoverCardRef,
            anchorRef: anchorRef,
            type: "popover",
            renderType: "anchored",
            opts: {
                closeOnMouseLeave: false,
                closeOnClickOutside: true,
                closeOnEscape: true,
                lockBackdrop: true,
            }
        }

        openOverlay(descriptor)
    }

    const shareActionModalRef = useRef<HTMLDivElement>(null)
    function handleOpenRespondModal(shareOfferID: string) {
        // console.log("Opening respond modal for share offer", shareOfferID);
        const id = "respondModal-" + shareOfferID;
        const descriptor: OverlayDescriptor = {
            id: id,
            render: () => <ShareActionModal ref={shareActionModalRef} shareOfferID={shareOfferID} actionType="respond" onClose={() => onMenuClose(id)} />,
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
        openOverlay(descriptor);

    }

    return (
        <div className="w-full rounded-xl border border-border/40 bg-transparent shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-[32px_2fr_1fr_1fr_1.2fr_2fr_140px] gap-3 items-center p-3 md:p-4">
                <div className="hidden md:grid place-items-center text-text/60">
                    <EnvelopeIcon className="w-5 h-5" />
                </div>

                <div className="flex flex-col gap-1">
                    <span className="md:hidden text-[11px] uppercase tracking-wide text-text/60">Destinatario</span>
                    <WorkspaceRow workspaceID={shareOffer.TargetID}
                        shareID={shareOffer.ID} onClick={handleOnWorkspaceClick}
                        registerAnchor={registerAnchor} />
                </div>

                <div className="flex flex-col gap-1 md:items-center">
                    <span className="md:hidden text-[11px] uppercase tracking-wide text-text/60">Stato</span>
                    <span className={`w-fit rounded-full border px-2 py-1 text-xs font-medium ${statusBadgeClass}`}>
                        {shareOffer.Status}
                    </span>
                </div>

                <div className="flex flex-col gap-1 md:items-center">
                    <span className="md:hidden text-[11px] uppercase tracking-wide text-text/60">Ruolo</span>
                    <span className={`w-fit rounded-full border px-2 py-1 text-xs font-medium ${roleBadgeClass}`}>
                        {shareOffer.OfferedRole}
                    </span>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="md:hidden text-[11px] uppercase tracking-wide text-text/60">Data</span>
                    <span className="text-sm text-text">{readable}</span>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="md:hidden text-[11px] uppercase tracking-wide text-text/60">Mittente</span>
                    <UserComponent ID={shareOffer.FromUserID} shareId={shareOffer.ID} />
                </div>

                <div className="flex flex-col md:justify-center">
                    <LabeledButtonCustom label="Respond" onClick={() => handleOpenRespondModal(shareOffer.ID)}>
                        <PencilIcon className="w-5 h-5" />
                    </LabeledButtonCustom>

                </div>
            </div>
        </div>
    )
}
/*
<LabeledButtonCustom label="Accept" onClick={handleAccept}>
                        <ExclamationCircleIcon className="w-5 h-5" />
                    </LabeledButtonCustom>
                    <LabeledButtonCustom label="Reject" onClick={handleReject}>
                        <ExclamationCircleIcon className="w-5 h-5" />
                    </LabeledButtonCustom>*/



type WorkspaceRowProps = {
    workspaceID: string;
    shareID: string;
    onClick: (id: string) => void;
    registerAnchor?: (key: string, ref: RefObject<HTMLDivElement | null> | null) => void;
}

function WorkspaceRow({ workspaceID, shareID, onClick, registerAnchor }: WorkspaceRowProps) {
    //const [workspace, setWorkspace] = useState<Workspace | null>(null)
    const cachedWorkspace = useCacheStore(useShallow((state) => state.offerWorkspaceById[workspaceID]))
    const cachedSubscription = useCacheStore(useShallow((state) => state.offerSubscriptionByWorkspaceId[workspaceID]))

    const workspace = cachedWorkspace ?? useWorkspaceStore(useShallow((state) => state.workspacesById[workspaceID]))


    const subscription = cachedSubscription?.Plan ?? useWorkspaceStore((state) => state.wSubscriptionsById[workspaceID]?.Plan) ?? "free"
    const workspaceHoverCardRef = useRef<HTMLDivElement | null>(null)

    /* useEffect(() => {
         //const ws = getWorkspace(workspaceID)
         //setWorkspace(ws)
     }, [workspaceID])*/

    useEffect(() => {
        if (registerAnchor) {
            registerAnchor(`${workspaceID}:${shareID}`, workspaceHoverCardRef)
        }
    }, [registerAnchor, workspaceID, shareID])

    return (
        <div
            ref={workspaceHoverCardRef}
            onClick={() => onClick(`${workspaceID}:${shareID}`)}
            className="flex flex-row items-center overflow-hidden hover:bg-main/20 hover:cursor-pointer rounded-lg w-full px-3 py-2">
            <div className="bg-gray-500 min-w-9 min-h-9 rounded-full flex items-center justify-center mr-3">
                <p className="text-white text-sm">{workspace?.Name[0].toUpperCase() ?? "U"}</p>
            </div>
            <div className="flex flex-col min-h-12 items-start">
                <p className="font-semibold text-text">{workspace?.Name}</p>
                <SubscriptionBadge plan={subscription} />
            </div>
        </div >
    )
}
