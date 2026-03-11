import { forwardRef, useEffect, useRef, useState } from "react";
import { CommonMenuWrapper } from "../menuElements/menuWrapper"
import { useShareOffersStore } from "@/stores/shareOffersStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useCacheStore } from "@/stores/cacheStore";
import { useWorkspaceDerivedProps } from "@/hooks/useWorkspaceDerivedProps";
import { XCircle } from "lucide-react";
import type { UserBoard, UserWorkspace } from "@/stores/types";
import { UserRoleBadge, type Role } from "../badges/UserRoleBadge";
import { useDateTimeParser } from "@/hooks/useDateTimeParser";
import { useUiStore, type DomainModalData } from "@/stores/uiStore";
import { ConfirmDeletionPopover } from "./ConfirmDeletion";
import { ShareOfferRespondHeadless } from "./ShareOfferRespondHeadless";
import { EntityOverviewPanel } from "../common/EntityOverviewCard";
import { ShowMoreArrow } from "../common/ShowMoreArrow";
import { MembersList } from "../common/MemberList";
import { useBoardsStore } from "@/stores/boardsStore";
import { useBoardBackground } from "@/hooks/useBoardBackground";
import { useBoardDescription } from "@/hooks/useBoardDescription";
import { useAuthStore } from "@/stores/auth";
import type { IconId } from "@/icons/iconCatalog";

type ShareOfferDetailsProps = {
    onClose: () => void;
    workspaceId?: string;
    offerId?: string;

}

type WorkspaceOverviewPanelProps = {
    onClose: () => void;
    onClick: () => void;
    wrapperRef: React.Ref<HTMLDivElement>;
    iconId?: IconId;
    coverType?: "color" | "image";
    coverImage?: string;
    coverColor?: string;
    entityName?: string;
    description?: string;
    plan: string;
    requestedRole?: Role;
    formattedSentDate: string;
    isOffered?: boolean;
    onRevoke: () => void;
    revokeRef: React.RefObject<HTMLDivElement | null>;
    isOpen?: boolean;
}

const WorkspaceOverviewPanel = ({ onClick, onClose, wrapperRef, iconId, coverType, coverImage, coverColor,
    entityName, description,
    plan, requestedRole, formattedSentDate, isOffered, onRevoke,
    isOpen, revokeRef }: WorkspaceOverviewPanelProps) => {

    return (
        <EntityOverviewPanel
            onClick={onClick}
            onClose={onClose}
            wrapperRef={wrapperRef}
            iconId={iconId}
            coverType={coverType}
            coverImage={coverImage}
            coverColor={coverColor}
            entityName={entityName}
            description={description}
            plan={plan}
            isOffered={isOffered}
            isOpen={isOpen}
            headerChildren={
                <RevokeButton
                    ref={revokeRef}
                    label={isOffered ? "Respond" : "Revoke"}
                    intent={isOffered ? "neutral" : "danger"}
                    className={`${isOffered ? "text-neutral-800/80" : "text-red-800/80"} scale-90 translate-x-1 -translate-y-1`}
                    hidden={isOpen} onClick={onRevoke} />
            } bodyChildren={<RequestSentState
                flip={true}
                textClassName="!justify-between w-full"
                lightBg={true}
                requestedRole={requestedRole}
                formattedSentDate={formattedSentDate}
                label={isOffered ? "Invite received" : "Request sent"}
                hidden={isOpen}
            />}
        />
    )
}



type ShareRequestPanelProps = {
    onClose: () => void;
    onClick?: () => void;
    wrapperRef: React.Ref<HTMLDivElement>;
    members: UserWorkspace[] | UserBoard[];
    entityLabel?: string;
    requestedRole?: Role;
    formattedSentDate: string;
    offerMessage?: string;
    isOffered?: boolean;
    isOpen?: boolean;
    revokeRef: React.RefObject<HTMLDivElement | null>;
    onRevoke?: () => void;

}

const ShareRequestPanel = ({ onClose, wrapperRef, members, entityLabel = "workspace", requestedRole, formattedSentDate, offerMessage, isOffered, isOpen, revokeRef, onRevoke }: ShareRequestPanelProps) => {
    const padding = 20
    const radius = 32

    return (
        <CommonMenuWrapper ref={wrapperRef} onClose={onClose}
            style={{ borderRadius: `${radius}px`, padding: `${0}px` }}
            className=" rounded-none
        w-fit h-full !bg-menu !flex !flex-row">
            <div className={` h-full flex flex-row justify-between transition-all duration-300 ease-in-out
                 ${isOpen ? 'opacity-100 w-[800px]' : 'opacity-0 w-0'}`}>

                <div
                    style={{ borderRadius: `${radius}px`, paddingTop: `${padding}px` }}
                    className=" w-[300px] h-full flex flex-col gap-2 bg-fuchsia-500/10
                        shadow-md shadow-black/60 border-[1.5px] border-fuchsia-500/40
                         rounded-md p-4">
                    <div className="text-md font-normal font-grotesk text-neutral-200">Members</div>
                    <div className="h-px bg-neutral-400/20 w-full" />
                    <MembersList members={members} />

                </div>
                <div style={{ padding: padding, paddingBottom: 48 }}
                    className="flex flex-col items-end justify-between gap-4 w-[400px] h-full  pr-8">
                    <RevokeButton
                        ref={revokeRef}
                        label={isOffered ? "Respond" : "Revoke"}
                        intent={isOffered ? "neutral" : "danger"}
                        onClick={onRevoke ? onRevoke : () => { }} />
                    <div className="flex flex-col gap-4 items-end">
                        <div className="h-px bg-neutral-400/20 w-full" />
                        <div className="text-sm text-neutral-400/80">
                            {isOffered ? `You received an invite to join this ${entityLabel} with the role` : `You sent a request to join this ${entityLabel} with the role`}
                            of <span className="">{requestedRole}
                            </span> on {formattedSentDate}.
                        </div>
                        <div className="h-px bg-neutral-400/20 w-full" />
                        <div className="text-neutral-300/80 text-sm">
                            {offerMessage}
                        </div>
                    </div>


                    <RequestSentState
                        requestedRole={requestedRole}
                        formattedSentDate={formattedSentDate}
                        label={isOffered ? "Invite received" : "Request sent"}
                    />
                </div>
            </div>
        </CommonMenuWrapper>
    )
}

type RequestSentStateProps = {
    requestedRole?: Role;
    formattedSentDate: string;
    label?: string;
    flip?: boolean;
    textClassName?: string;
    lightBg?: boolean;
    hidden?: boolean;
}

const RequestSentState = ({ requestedRole, formattedSentDate, label, flip, textClassName, lightBg, hidden }: RequestSentStateProps) => {

    return (
        <div className={` ${hidden ? 'opacity-0 !h-0' : 'opacity-100 h-[40px]'} transition-all duration-600 ease-in-out
        flex flex-row gap-4 items-center ${textClassName} justify-end `}>
            {!flip && <UserRoleBadge
                role={requestedRole} lightBg={lightBg} />}
            <div className={`flex flex-col ${flip ? "items-start" : "items-end"}`}>
                <div className={`text-md font-normal font-grotesk ${lightBg ? 'text-neutral-800' : 'text-neutral-200'} `}>
                    {label || "Request sent"}</div>

                <div className={`text-xs ${lightBg ? 'text-neutral-500/80' : 'text-neutral-400/80'}`}>{formattedSentDate}</div>
            </div>
            {flip && <UserRoleBadge
                role={requestedRole} lightBg={lightBg} />}
        </div>
    )
}


type RevokeButtonProps = {
    onClick: () => void;
    label?: string;
    intent?: "danger" | "neutral";
    hidden?: boolean;
    className?: string;
}

const RevokeButton = forwardRef<HTMLDivElement, RevokeButtonProps>(({ onClick, label, intent = "danger", hidden, className }, ref) => {
    if (hidden) return null;



    return (
        <div ref={ref} className={`${hidden ? 'opacity-0' : 'opacity-100'}
        opacity-80
        ${intent === "danger" ? "hover:bg-red-500/10" : "hover:bg-neutral-500/20"} p-1 ps-2 hover:opacity-100 rounded-full 
        transition-[background-color,opacity,transform] ease-in-out duration-300 flex flex-row gap-2 items-center
         ${intent === "danger" ? "text-red-500/80" : "text-neutral-300/90"} cursor-pointer ${className}`}
            onClick={onClick}>
            <span className="text-md font-normal font-grotesk ">{label || "Revoke"}</span>
            {intent === "danger" && <XCircle className="" size={24} />}
        </div>
    )
})

export const ShareOfferDetails = forwardRef<HTMLDivElement, ShareOfferDetailsProps>(({ onClose, workspaceId, offerId }, ref) => {
    const fetchShareOfferDetails = useShareOffersStore((state) => state.fetchShareOfferDetailsByID)
    const offerIdByWorkspaceId = useWorkspaceStore((state) => state.offerIdByWorkspaceId)
    const getWorkspaceStatus = useWorkspaceStore((state) => state.getWorkspaceStatus)
    const getBoardStatus = useBoardsStore((state) => state.getBoardStatus)
    const offerById = useCacheStore((state) => state.offerById)
    const authUserID = useAuthStore((state) => state.userID)

    const resolvedOfferId = offerId ?? (workspaceId ? offerIdByWorkspaceId[workspaceId] : undefined)

    const revokeOffer = useShareOffersStore((state) => state.revokeWorkspaceShareOffer)
    const respondToShareOffer = useShareOffersStore((state) => state.respondToShareOffer)
    const setDomainModalOpen = useUiStore((state) => state.setDomainModalOpen)

    useEffect(() => {
        if (!resolvedOfferId) return
        void fetchShareOfferDetails(resolvedOfferId)
    }, [resolvedOfferId, fetchShareOfferDetails]);

    const compactRevokeRef = useRef<HTMLDivElement | null>(null)
    const detailsRevokeRef = useRef<HTMLDivElement | null>(null)

    const handleRevoke = (anchorRef?: React.RefObject<HTMLDivElement | null>) => {
        if (!resolvedOfferId) return

        const data: DomainModalData = {
            componentent: (closeDomainModal) => (
                <ConfirmDeletionPopover
                    onClose={closeDomainModal}
                    onSubmit={() => {
                        closeDomainModal()
                        onClose()
                        void revokeOffer(resolvedOfferId, "")
                    }}
                    title="Revoke request?"
                    body="Are you sure you want to revoke this request? This action cannot be undone."
                    theme={showDetails ? "dark" : "light"}
                />
            ),
            renderType: anchorRef?.current ? "anchored" : "virtual",
            anchorRef: anchorRef?.current ? anchorRef : null,
            theme: showDetails ? "dark" : "light",
        }
        setDomainModalOpen(true, data)
    }

    function handleRespond(anchorRef?: React.RefObject<HTMLDivElement | null>) {
        if (!resolvedOfferId) return

        const data: DomainModalData = {
            componentent: (closeDomainModal) => (
                <ShareOfferRespondHeadless
                    onClose={closeDomainModal}
                    onAccept={() => {
                        closeDomainModal()
                        onClose()
                        void respondToShareOffer(resolvedOfferId, true)
                    }}
                    onReject={() => {
                        closeDomainModal()
                        onClose()
                        void respondToShareOffer(resolvedOfferId, false)
                    }}
                    theme={showDetails ? "dark" : "light"}
                />
            ),
            renderType: anchorRef?.current ? "anchored" : "virtual",
            anchorRef: anchorRef?.current ? anchorRef : null,
            theme: showDetails ? "dark" : "light",
        }
        setDomainModalOpen(true, data)
    }

    const offerDetails = resolvedOfferId ? offerById[resolvedOfferId] : null;
    const sentDate = offerDetails?.CreatedAt ? new Date(offerDetails.CreatedAt) : null
    const formattedSentDate = sentDate ? useDateTimeParser().stringifyDatePretty(sentDate)?.date ?? "" : ""
    const workspaceById = useCacheStore((state) => state.offerWorkspaceById)
    const boardsById = useCacheStore((state) => state.offerBoardById)
    const subscriptionById = useCacheStore((state) => state.offerSubscriptionByWorkspaceId)
    const membersByWorkspaceId = useCacheStore((state) => state.offerUserWorkspacesByWorkspaceId)
    const membersByBoardId = useCacheStore((state) => state.offerUserBoardsByBoardId)

    const isBoardOffer = offerDetails?.TargetType === "board"
    const boardId = isBoardOffer ? offerDetails?.TargetID : undefined
    const board = boardId ? boardsById[boardId] : undefined
    const inferredWorkspaceId = workspaceId ?? board?.WorkspaceID ?? undefined
    const workspace = inferredWorkspaceId ? workspaceById[inferredWorkspaceId] : undefined
    const subscription = inferredWorkspaceId ? subscriptionById[inferredWorkspaceId] : undefined

    const workspaceMembersById = inferredWorkspaceId ? membersByWorkspaceId[inferredWorkspaceId] : undefined
    const boardMembersById = boardId ? membersByBoardId[boardId] : undefined
    const members = isBoardOffer
        ? (boardMembersById ? Object.values(boardMembersById) : [])
        : (workspaceMembersById ? Object.values(workspaceMembersById) : [])

    const requestedRole = offerDetails?.OfferedRole
    const isInviteForMe = offerDetails?.Kind === "invite" && offerDetails?.ToUserID === authUserID
    const isWorkspaceOffered = inferredWorkspaceId ? getWorkspaceStatus(inferredWorkspaceId) === "offered" : false
    const isBoardOffered = boardId && inferredWorkspaceId ? getBoardStatus(boardId, inferredWorkspaceId) === "offered" : false
    const isOffered = isInviteForMe || isWorkspaceOffered || isBoardOffered
    const offerMessage = offerDetails?.Message


    const { headerProps, avatarProps } = useWorkspaceDerivedProps(inferredWorkspaceId, workspace)
    const { backgroundColorClassName, backgroundImageUrl, backgroundType } = useBoardBackground({ board })
    const boardDescription = useBoardDescription({ boardID: boardId ?? "" })

    const iconId = isBoardOffer ? "boards" : avatarProps.iconId
    const coverType = isBoardOffer ? backgroundType : headerProps.coverType
    const coverImage = isBoardOffer ? backgroundImageUrl : headerProps.coverImage
    const coverColor = isBoardOffer ? backgroundColorClassName : headerProps.coverColor
    const entityName = isBoardOffer ? board?.Name : workspace?.Name
    const description = isBoardOffer ? boardDescription : workspace?.Props?.Description
    const plan = subscription?.Plan ?? "free"
    const entityLabel = isBoardOffer ? "board" : "workspace"

    const [showDetails, setShowDetails] = useState(false)

    return (
        <CommonMenuWrapper ref={ref} onClose={onClose}
            className="relative !h-[400px]
            !bg-transparent !w-fit !shadow-none flex-row gap-4 overflow-visible">

            <WorkspaceOverviewPanel
                onClose={onClose}
                wrapperRef={ref}
                iconId={iconId}
                coverType={coverType as "color" | "image" | undefined}
                coverImage={coverImage}
                coverColor={coverColor}
                entityName={entityName}
                description={description}
                plan={plan}
                requestedRole={requestedRole}
                formattedSentDate={formattedSentDate}
                isOffered={isOffered}
                onRevoke={() => isOffered ? handleRespond(compactRevokeRef) : handleRevoke(compactRevokeRef)}
                revokeRef={compactRevokeRef}
                onClick={() => setShowDetails(false)}
                isOpen={showDetails}
            />
            <ShareRequestPanel
                onClose={onClose}
                wrapperRef={ref}
                members={members}
                entityLabel={entityLabel}
                requestedRole={requestedRole}
                formattedSentDate={formattedSentDate}
                offerMessage={offerMessage}
                isOffered={isOffered}
                onRevoke={() => isOffered ? handleRespond(detailsRevokeRef) : handleRevoke(detailsRevokeRef)}
                revokeRef={detailsRevokeRef}
                isOpen={showDetails}
            />

            <ShowMoreArrow setShowMore={setShowDetails} showMore={showDetails} />




        </CommonMenuWrapper>
    )
})

