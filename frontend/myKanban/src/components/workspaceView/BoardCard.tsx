
type BoardRowProps = {
    boardID: string
    workspaceId?: string
}
import { useNavigate, useParams } from "react-router";
import { useBoardsStore } from "@/stores/boardsStore";
import { BoardCardWrapper } from "@/components/workspaceView/BoardCardWrapper";
import { useRef } from "react";
import { StarIcon } from "@heroicons/react/24/outline";
import { LockKeyholeIcon } from "lucide-react";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { ShareActionModal } from "@/components/modals/ShareActionModal";
import { gradientColorTokens, getClassNamesForColorToken } from "@/domain/colorTokens";
import { InfoIcon } from "lucide-react";
import { RoundButton } from "../buttons/RoundButton";
import { CardRowMenuBtn } from "../cardMenus/cardRowMenus";
import { BoardHoverCard } from "../hoverCards/BoardHoverCard";
import { ShareOfferDetails } from "../modals/shareOfferDetails";

function getStableIndexFromString(value: string, length: number): number {
    if (length <= 0) return 0;

    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }

    return hash % length;
}

export function BoardCard({ boardID: boardID, workspaceId: overrideWorkspaceId }: BoardRowProps) {
    const name = useBoardsStore(state => state.boardsById[boardID]?.Name)
    const isStarred = useBoardsStore((state) => !!state.userBoardsById[boardID]?.Props?.Starred)
    const boardStatus = useBoardsStore((state) => state.getBoardStatus(boardID));
    const offerIdByBoardId = useBoardsStore((state) => state.offerIdByBoardId);
    const isRequested = boardStatus === "requested"
    const isOffered = boardStatus === "offered"
    const pendingAccessRequestsCount = useBoardsStore((state) => state.getPendingAccessRequestCountByBoardId(boardID));

    const isLocked = boardStatus !== null;
    const navigate = useNavigate()

    const { open: openMenu, close: onMenuClose } = useOverlayStore()
    const shareActionModalRef = useRef<HTMLDivElement>(null)
    const shareOfferDetailsRef = useRef<HTMLDivElement>(null)

    const workspaceId = overrideWorkspaceId ?? (useParams().workspaceId as string);
    const handleOpenBoard = () => {

        if (isLocked) {
            const pendingOfferId = offerIdByBoardId[boardID]
            if ((isRequested || isOffered) && pendingOfferId) {
                handleOpenShareOfferDetails(pendingOfferId)
                return
            }
            handleOpenRevokeModal(boardID)
        } else {
            navigate(`/workspaces/${workspaceId}/boards/${boardID}`)
        }

    }

    function handleOpenShareOfferDetails(offerID: string) {
        const id = "board-share-offer-details-" + boardID;
        const descriptor: OverlayDescriptor = {
            id,
            render: () => <ShareOfferDetails ref={shareOfferDetailsRef} onClose={() => onMenuClose(id)} offerId={offerID} />,
            panelRef: shareOfferDetailsRef,
            type: "modal",
            renderType: "virtual",
            exclusiveGroup: "share-offer-details",
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
        openMenu(descriptor)
    }

    function handleOpenRevokeModal(boardId: string) {
        //console.log("Opening revoke modal for share offer", boardId);
        const id = "boardCreateRequest-" + boardId;
        const descriptor: OverlayDescriptor = {
            id: id,
            render: () => <ShareActionModal ref={shareActionModalRef} targetID={boardId} actionType="createAccessRequest" onClose={() => onMenuClose(id)} />,
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

    const board = useBoardsStore((state) => state.boardsById[boardID]);
    const backgroundType = board?.Props?.Background?.Type
    const bgImage = backgroundType === "image" ? board?.Props?.Background?.Image?.Url : null;
    let bgColor = backgroundType === "color" ? board?.Props?.Background?.Color?.Token : null;
    if (bgColor) {
        bgColor = getClassNamesForColorToken(bgColor)
    }
    const gradientIndex = getStableIndexFromString(boardID, gradientColorTokens.length);
    const fallbackGradient = gradientColorTokens[gradientIndex];

    return (
        <>

            <BoardCardWrapper
                className={`
                    ${isRequested ? "ring-2 hover:ring-fuchsia-500/80" : ""}
                    ${isOffered ? "ring-2 ring-yellow-500/80" : ""}
                    `}
            >
                <CardRowMenuBtn
                    menuComponent={
                        ({ onClose, ref }) => <BoardHoverCard boardID={boardID} />
                    }
                    customId="board-overview-card"
                    exclusiveGroup="entity-hover-card"
                    renderType="virtual"
                >

                    <RoundButton className="absolute top-2 right-2 opacity-0 
                group-hover:opacity-100 transition-opacity z-20">
                        <InfoIcon className=" h-5 w-5
                 text-white/70 opacity-0 group-hover:opacity-100 
                 transition-opacity" />
                    </RoundButton>
                </CardRowMenuBtn>

                {isLocked && (
                    <div
                        onClick={() => handleOpenBoard()}
                        className="absolute inset-0 z-10 
                        group-hover:backdrop-blur-sm transition-all ease-in-out duration-300
                        bg-gradient-to-t from-black/60 to-transparent
                         flex items-center justify-center" >
                        <LockKeyholeIcon
                            className={` absolute
                                h-7 w-7 text-gray-300 
                        group-hover:opacity-0
                         transition-all ease-in-out duration-300`}
                            strokeWidth={3} />
                        <span className=" absolute mt-2 text-sm font-medium
                         text-gray-300 opacity-0 
                         group-hover:opacity-100 transition-opacity">
                            {isRequested ? "Access requested" : isOffered ? "Access offered" : "Request access"}
                        </span>

                    </div>
                )}
                <div
                    onClick={() => handleOpenBoard()}
                    className="absolute inset-0 z-10 hover:bg-black/20 cursor-pointer" />


                <div
                    onClick={() => handleOpenBoard()}
                    className="grid h-full min-h-0 grid-rows-[3fr_32px] overflow-hidden"
                >


                    <div className=" relative min-h-0 overflow-hidden 
                    group-hover:scale-110 transition-all duration-500 ease-in-out
                    ">
                        {backgroundType === "image" && <img
                            src={bgImage || "/board-placeholder.png"}
                            alt="Board placeholder"
                            className="h-full w-full object-cover"
                        />}
                        {backgroundType === "color" && <div
                            className={`h-full w-full ${bgColor}`}

                        />}
                        {!backgroundType && <div
                            className={fallbackGradient.className + " h-full w-full"}
                        />}


                    </div>

                    <div className="flex items-center  justify-start pt-0.5 pb-0.5 px-3">
                        <h3 className="text-sm font-normal"> {name}</h3>
                        <div className="ml-auto flex items-center gap-2">
                            {pendingAccessRequestsCount > 0 && (
                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white">
                                    {pendingAccessRequestsCount}
                                </span>
                            )}
                            {false && <span className="text-xs text-red-500 capitalize">{boardStatus}</span>}
                            {!isLocked && <StarIcon
                                className={`h-4 w-4 ${isStarred ? "text-yellow-400" : "text-white/50"}`}
                                fill={isStarred ? "currentColor" : "none"}
                            />}
                        </div>
                    </div>
                </div>

            </BoardCardWrapper>

        </>
    )
}

