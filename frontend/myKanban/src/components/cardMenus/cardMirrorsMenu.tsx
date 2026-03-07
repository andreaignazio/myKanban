import { forwardRef, useEffect, useState } from "react";
import { CommonMenuWrapper } from "../menuElements/menuWrapper";
import { useCardMirrorsStore } from "@/stores/cardMirrorsStore";
import { useParams } from "react-router";
import { useShallow } from "zustand/shallow";
import { useBoardBackground } from "@/hooks/useBoardBackground";
import { useCardBackground } from "@/hooks/useCardBackground";
import { ImageColorRenderer } from "../menuElements/ImageColorRenderer";
import { CardLabelsRenderer } from "../cardRowElements/CardLabelsRenderer";
import type { BoardLabel, User } from "@/stores/types";
import { MemberRow } from "../common/MemberRow";
import { useListTheme } from "@/hooks/useListTheme";
import { useDateTimeParser } from "@/hooks/useDateTimeParser";
import { DummyMirrorUI } from "../cardRowElements/CardMirrorsField";

type CardMirrorsMenuProps = {
    cardId: string;
    listCardId?: string;
    onClose: () => void;
}

export const CardMirrorsMenu = forwardRef<HTMLDivElement, CardMirrorsMenuProps>(({
    cardId, listCardId, onClose }, ref) => {

    const workspaceId = useParams().workspaceId as string
    const fetchMirrorData = useCardMirrorsStore(state => state.fetchCardMirrors)
    useEffect(() => {
        if (cardId && workspaceId) {
            fetchMirrorData(workspaceId, cardId);
        }
    }, [cardId, workspaceId, fetchMirrorData]);

    const mirrorIds = useCardMirrorsStore(useShallow((state) => state.boardListCardIdsByCardId[cardId] ?? []))

    return (
        <CommonMenuWrapper

            onClose={onClose} className="!w-[420px] h-[350px] min-h-0 !bg-menusec"
            ref={ref}>
            <div className="flex flex-col w-full h-full min-h-0 py-4 gap-3 items-center">
                <div className="">Mirrors</div>

                <div className="w-full flex-1 min-h-0 overflow-y-auto  scrollbar-hidden pr-1">
                    <div className="flex flex-col gap-3 items-center pb-4 pt-4">
                        {mirrorIds.length === 0 &&
                            <div className="text-sm text-neutral-500 mt-2">
                                No mirrors for this card
                            </div>}
                        {mirrorIds.map(mirrorId => (
                            <MirrorRow key={mirrorId} mirrorId={mirrorId} cardId={cardId} />
                        ))}
                    </div>
                </div>
            </div>

        </CommonMenuWrapper>

    )

})

type MirrorRowProps = {
    mirrorId: string;
    cardId: string;
}

const MirrorRow = ({ mirrorId, cardId }: MirrorRowProps) => {
    const mirrorData = useCardMirrorsStore(useShallow(state => state.getMirrorRenderDataForBoardListCard(mirrorId)))

    if (!mirrorData) return null

    const {
        backgroundType: mirrorBoardBgType,
        backgroundColorClassName: mirrorBoardBgColorClass,
        backgroundImageUrl: mirrorBoardBgImageUrl } = useBoardBackground({ board: mirrorData.board })

    const { cardCoverURL } = useCardBackground({ cardId })

    const { listColor, listGradient } = useListTheme(mirrorData.list)

    const hoverClassMain = "mb-0 hover:mb-[13px] transition-all duration-300"
    const hoverClassMirror = "-bottom-[5px] group-hover:!-bottom-[20px] group-hover:w-[95%]  transition-all duration-300"

    const [boardDetailMode, setBoardDetailMode] = useState<boolean>(false)

    const toggleBoardDetailMode = () => {
        setBoardDetailMode(prev => !prev)
    }

    const labels: BoardLabel[] = [
        {
            ID: "1",
            BoardID: mirrorData.board.ID,
            Title: "Label 1",
            Color: "rgb(217, 119, 6)",
            CreatedAt: "2024-01-01T00:00:00Z",
            UpdatedAt: "2024-01-01T00:00:00Z",
            DeletedAt: null,
        },
        {
            ID: "2",
            BoardID: mirrorData.board.ID,
            Title: "Label 2",
            Color: "rgb(34, 197, 94)",
            CreatedAt: "2024-01-01T00:00:00Z",
            UpdatedAt: "2024-01-01T00:00:00Z",
            DeletedAt: null,
        },
        {
            ID: "3",
            BoardID: mirrorData.board.ID,
            Title: "Label 3",
            Color: "rgb(59, 130, 246)",
            CreatedAt: "2024-01-01T00:00:00Z",
            UpdatedAt: "2024-01-01T00:00:00Z",
            DeletedAt: null,
        },

    ]

    const boardOwner: User = {
        ID: "mock-board-owner-1",
        Name: "Board Owner",
        Username: "board.owner",
        AvatarUrl: "",
        Email: "board.owner@example.com",
        Props: {
            Initials: "BO",
            Avatar: {
                Type: "color",
                Color: "#0ea5e9",
            },
            Bio: "Mock owner for mirror row preview",
        },
        CreatedAt: "2024-01-01T00:00:00Z",
        UpdatedAt: "2024-01-01T00:00:00Z",
        DeletedAt: null,
    }

    const formattedRole = mirrorData.userBoard.Role.slice(0, 1).toUpperCase() + mirrorData.userBoard.Role.slice(1).toLowerCase()
    const formattedRoleDate = mirrorData.userBoard.CreatedAt ? new Date(mirrorData.userBoard.CreatedAt) : null
    const formattedRoleDateFormatted = formattedRoleDate ? useDateTimeParser().stringifyDatePretty(formattedRoleDate)?.date : null
    const formattedRoleWithDate = formattedRoleDateFormatted ? `since ${formattedRoleDateFormatted}` : formattedRole

    return (
        <>
            <div className={` ${boardDetailMode ? "opacity-100 z-10" : "opacity-0 pointer-events-none"} 
            transition-opacity duration-300 ease-in-out
                absolute inset-0 w-full h-full bg-black/20 backdrop-blur-sm`} />

            <div className={`
        ${boardDetailMode ? "z-30" : "z-0"}
        group relative w-[340px] h-fit `}>



                <div onClick={toggleBoardDetailMode}
                    className={`${boardDetailMode
                        ? "opacity-100 w-[110%] h-[140%] translate-y-8 shadow-lg shadow-black/35 group-hover:scale-105 cursor-pointer"
                        : "opacity-100 group-hover:w-[95%] "} 
                        transition-all duration-300 ease-in-out

                absolute w-[92%] h-[100%] -bottom-1 left-1/2
                 -translate-x-1/2 rounded-lg z-0 overflow-hidden`}>
                    <ImageColorRenderer
                        overrideClassName
                        className="h-full w-full"
                        bgImage={mirrorBoardBgImageUrl}
                        bgColor={mirrorBoardBgColorClass}
                        fallbackGradient={{ className: "bg-gradient-to-r from-slate-500 to-slate-700" }}
                        backgroundType={mirrorBoardBgType}
                    >
                        <div className={` ${boardDetailMode ? "opacity-100" : "opacity-0"} transition-opacity duration-300 ease-in-out
                    flex flex-col items-start justify-start z-20 absolute inset-0
                    w-full h-full text-white text-center p-4 gap-2`}>
                            <div className="flex flex-row w-full items-start gap-3">
                                <div className="flex flex-col items-start">
                                    <div className="text-lg font-bold">{mirrorData.board.Name}</div>
                                    <div className="text-sm">{mirrorData.list.Title}</div>
                                </div>
                                <MemberRow user={boardOwner} />
                            </div>
                            <span className="text-sm text-neutral-300 mt-2">
                                {mirrorData.board.Props?.Description || "No description provided"}
                            </span>
                        </div>
                    </ImageColorRenderer>



                </div>

                <div className={`hidden ${boardDetailMode ? "opacity-0" : "opacity-100"} transition-opacity duration-300 ease-in-out
                absolute -right-2 -top-2 text-sm z-20
                             bg-stone-300/80 px-2 py-0.5 rounded-md
                             shadow shadow-black/20
                             text-neutral-500`}
                >{mirrorData.list.Title}</div>

                <div className={`
                    relative group ${hoverClassMain}
                    ${boardDetailMode ? "opacity-0 !mb-[20px] -translate-y-[30px] scale-y-0" : "opacity-100"}
                `}>
                    <div
                        className="relative z-10 flex flex-col text-gray-100 bg-[#242528] rounded-lg min-h-[40px] justify-center !overflow-hidden shadow-md shadow-black/40 group ring-2 ring-white/0 mx-1 hover:ring-white/100"
                        style={{
                            backgroundColor: listColor,
                            backgroundImage: cardCoverURL ? `url(${cardCoverURL})` : listGradient,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                        }}
                    >

                        <div className={`absolute inset-0 w-full h-full pointer-events-none
                    ${mirrorData.isRootBoardCard ? "bg-transparent" : "bg-[#101010]/30"}`} />



                        <div onClick={toggleBoardDetailMode}
                            className="p-2 rounded hover:bg-neutral-600/20 cursor-pointer">

                            <DummyMirrorUI
                                name={formattedRole}
                                detailLabel={formattedRoleWithDate}
                                bgImage={mirrorBoardBgImageUrl}
                                bgColorClass={mirrorBoardBgColorClass}
                                bgColorType={mirrorBoardBgType === "color" ? "color" : mirrorBoardBgType === "image" ? "image" : null}
                                wrapperClassName="w-[200px]"
                            />
                            <div className="flex flex-row justify-between">
                                <div className="flex flex-col">
                                    <div className="font-medium">{mirrorData.board.Name}</div>
                                    <div className="text-xs text-neutral-100/50">{mirrorData.list.Title}</div>
                                </div>
                                <div className="w-fit h-fit px-2 py-0.5 text-sm font-grotesk shadow-sm shadow-black/20 text-neutral-300  
                              border-2 rounded-md border-stone-200/20 bg-slate-400/20 " >
                                    {!mirrorData.isRootBoardList && <span>MIRROR LIST</span>}
                                    {mirrorData.isRootBoardList && <span>PRIMARY</span>}
                                </div>
                            </div>
                            <CardLabelsRenderer cardLabels={labels} />


                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}