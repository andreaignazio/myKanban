import { useCardMirrorsStore, type MirrorRenderData } from "@/stores/cardMirrorsStore";
import { forwardRef, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useShallow } from "zustand/shallow";
import { CommonMenuWrapper } from "../menuElements/menuWrapper";
import { useBoardBackground } from "@/hooks/useBoardBackground";
import { ImageColorRenderer } from "../menuElements/ImageColorRenderer";
import { useCardBackground } from "@/hooks/useCardBackground";
import { CardLabelsRenderer } from "../cardRowElements/CardLabelsRenderer";
import { UserRoleBadge, type Role } from "../badges/UserRoleBadge";
import { useIsDarkBackground } from "@/hooks/useIsDarkBackground";
import { Crown, ExternalLink } from "lucide-react";
import { SmallLabel } from "../common/smallLabel";
import { CardRowMenuBtn } from "./cardRowMenus";
import { RequestAccessModal } from "../modals/RequestAccessModal";
import { useListTheme } from "@/hooks/useListTheme";

type CardMirrorsMenuProps = {
    cardId: string;
    listCardId?: string;
    onClose: () => void;
}

export const CardMirrorsMenuV2 = forwardRef<HTMLDivElement, CardMirrorsMenuProps>(({ cardId, listCardId, onClose }, ref) => {
    const workspaceId = useParams().workspaceId as string
    const fetchMirrorData = useCardMirrorsStore(state => state.fetchCardMirrors)
    const getOrderedMirrorData = useCardMirrorsStore(state => state.getOrderedDataForCardId)

    useEffect(() => {
        if (cardId && workspaceId) {
            fetchMirrorData(workspaceId, cardId);
        }
    }, [cardId, workspaceId, fetchMirrorData]);

    const fetchOpCounter = useCardMirrorsStore(state => state.fetchOpCounterByCardId[cardId] ?? 0)
    const data = useMemo(() => getOrderedMirrorData(cardId), [cardId, getOrderedMirrorData, fetchOpCounter])
    const boardIds = useMemo(() => Object.keys(data.BoardListCardIdsByBoard), [data])
    //const mirrorIds = useCardMirrorsStore(useShallow((state) => state.boardListCardIdsByCardId[cardId] ?? []))



    return (
        <CommonMenuWrapper ref={ref} Title="Mirrors" onClose={onClose}
            className="w-[300px] h-[400px] !overflow-auto scrollbar-hidden">
            <div className="flex flex-col gap-2 w-full min-h-0 py-4 px-2 ">
                {boardIds.length === 0 && (
                    <div className="text-sm text-gray-500 italic">No mirrors found for this card.</div>
                )}
                {boardIds.map(boardId => (
                    <MirrorBoardSection key={boardId}
                        cardId={cardId}
                        onMirrorMenuClose={onClose}
                        renderData={data.MirrorDataById}
                        boardId={boardId} mirrorIds={data.BoardListCardIdsByBoard[boardId]} />
                ))}
            </div>

        </CommonMenuWrapper>

    )

})

type MirrorBoardSectionProps = {
    cardId: string;
    boardId: string;
    mirrorIds: string[];
    renderData: Record<string, MirrorRenderData>
    onMirrorMenuClose: () => void;
}

const MirrorBoardSection = ({ cardId, boardId, mirrorIds, renderData, onMirrorMenuClose }: MirrorBoardSectionProps) => {

    const { workspaceId, boardId: currentBoardId } = useParams()
    const navigate = useNavigate()
    const isCurrentBoard = currentBoardId === boardId
    const boardData = useCardMirrorsStore(useShallow(state => state.boardsById[boardId]))
    const boardName = boardData?.Name || "Unknown Board"
    const ownerData = useCardMirrorsStore(useShallow(state => state.usersById[boardData?.CreatedByUserID ?? ""]))
    const userBoard = useCardMirrorsStore(useShallow(state => state.userBoardsByBoardId[boardId]))
    const userRole = userBoard?.Role
    const labelsForBoard = renderData[mirrorIds[0]]?.boardLabels ?? []
    const {
        backgroundType: mirrorBoardBgType,
        backgroundColorClassName: mirrorBoardBgColorClass,
        backgroundImageUrl: mirrorBoardBgImageUrl } = useBoardBackground({ board: boardData })

    const hasAccess = !!userBoard

    const radius = 14
    const padding = 4
    const innerRadius = radius - padding
    return (
        <div
            style={{
                borderRadius: radius,
                padding: padding,
            }}
            className="relative group flex flex-col rounded-xl overflow-hidden w-full gap-0">

            <ImageColorRenderer
                overrideClassName
                className="w-full h-full absolute inset-0 z-0"
                bgImage={mirrorBoardBgImageUrl}
                bgColor={mirrorBoardBgColorClass}
                fallbackGradient={{ className: "bg-gradient-to-r from-slate-500 to-slate-700" }}
                backgroundType={mirrorBoardBgType}
            />
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-black/40 to-black/10" />

            {hasAccess ? (
                <SmallLabel
                    className="opacity-0 group-hover:opacity-100"
                    text={isCurrentBoard ? "This board" : "Go to board"}
                    onClick={() => { onMirrorMenuClose(); navigate(`/workspaces/${workspaceId}/boards/${boardId}`) }}
                >
                    <ExternalLink size={16} className="text-white/80 -translate-y-[1px]" />
                </SmallLabel>
            ) : (
                <CardRowMenuBtn
                    enableOwnBackdrop={true}
                    renderType="virtual"
                    customId={`request-access-${boardId}`}
                    exclusiveGroup="request-access-modal"
                    menuComponent={({ onClose, ref }) =>
                        <RequestAccessModal ref={ref} targetType="board" targetID={boardId} onClose={onClose} onSuccess={onMirrorMenuClose} />
                    }
                >
                    <SmallLabel
                        className="opacity-0 group-hover:opacity-100"
                        text="Request access"
                    >
                        <ExternalLink size={16} className="text-white/80 -translate-y-[1px]" />
                    </SmallLabel>
                </CardRowMenuBtn>
            )}

            <div className="relative h-full z-10 flex flex-col items-center gap-3 ">

                <div
                    style={{ borderRadius: innerRadius }}
                    className="flex flex-col items-center gap-2 w-full h-full
                bg-zinc-900/50 px-2 py-3 shadow-sm shadow-black/30
                rounded-xl justify-between">
                    <div className="w-full flex flex-row items-center gap-2 px-2">
                        <div className=" justify-start w-full flex flex-col
                   gap-0">
                            <span className="text-lg font-manrope font-semibold text-zinc-100">{boardName}</span>
                            <span className="text-xs font-normal font-plex text-zinc-400 ">{ownerData.Name}</span>
                        </div>
                        <UserRoleBadge role={userRole as Role} />
                    </div>

                    {labelsForBoard.length > 0 && <CardLabelsRenderer cardLabels={labelsForBoard} />}
                    {mirrorIds.length > 0 && (
                        mirrorIds.map(mirrorId => {
                            const mirrorData = renderData[mirrorId]
                            if (!mirrorData) return null;
                            return (
                                <>

                                    <MirrorCardRow key={mirrorId} mirrorData={mirrorData} cardId={cardId} />
                                </>
                            )
                        })
                    )}
                </div>






            </div>

        </div>
    )
}

const MirrorCardRow = ({ mirrorData, cardId }: { mirrorData: MirrorRenderData, cardId: string }) => {

    const { cardColor, cardCoverURL } = useCardBackground({ cardId })
    const { isDark } = useIsDarkBackground({ color: cardColor, imageUrl: cardCoverURL })
    const textClass = isDark ? "text-zinc-100" : "text-neutral-900"
    const textClassMuted = isDark ? "text-zinc-400" : "text-neutral-500"
    const { listColor } = useListTheme(mirrorData.list, mirrorData.boardList.AccessMode)

    const listLabel = mirrorData.isRootBoardList ? "Root List" : "Mirrored List"
    let accessModeLabel = mirrorData.boardList.AccessMode ?? "unknown"
    accessModeLabel = accessModeLabel.charAt(0).toUpperCase() + accessModeLabel.slice(1)
    return (

        <div className="h-fit w-full flex items-center flex-row ps-1 hover:ps-2 transition-all duration-200 cursor-default relative">
            <div className=" absolute inset-0 z-0  group/list
        opacity-90 hover:opacity-100 -left-0 h-[95%] translate-y-[2.5%] w-[20px]
         flex rounded-lg  cursor-pointer
        hover:[box-shadow:0_0_0_1px_var(--list-color)]"
                style={{
                    backgroundColor: listColor ?? "#000",
                    "--list-color": listColor ?? "transparent",
                } as React.CSSProperties} />
            <div className="
        w-full shadow-md shadow-black/40
        relative z-20 flex flex-col px-2 py-2 
         rounded-lg min-h-[40px] justify-center
         !overflow-hidden  group ring-2
         ring-white/0  hover:ring-white/100"
                style={{
                    backgroundColor: cardColor ?? "#27272a",
                    backgroundImage: cardCoverURL ? `url(${cardCoverURL})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >


                <div className="grid grid-cols-[1fr_32px] w-full">
                    <div className="col-span-1 flex flex-col gap-0">
                        <div className="flex flex-row items-center  gap-1">
                            <span className={`${textClassMuted} font-mono text-xs font-normal`}>List</span>
                            <span className={`${textClassMuted} opacity-50 font-mono text-xs font-normal`}>•</span>
                            <span className={`${textClassMuted} opacity-50 font-mono text-xs font-normal`}>{listLabel}</span>
                        </div>

                        <div className="flex flex-row items-center  gap-1.5">
                            {mirrorData.isRootBoardCard && (
                                <Crown size={13} className="shrink-0 text-amber-400 drop-shadow-sm" fill="currentColor" />
                            )}
                            <span className={`${textClass} font-mono text-sm font-medium`}>{mirrorData.list.Title}</span>
                        </div>

                    </div>
                    <div className="col-span-1 h-full flex items-center justify-end">
                        <div className="w-full h-3 rounded-full"
                            style={{ backgroundColor: listColor ?? "#000000" }} />
                    </div>
                </div>
            </div>
        </div>

    )
}