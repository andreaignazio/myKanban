import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry";
import { LabeledButtonPresetB } from "@/components/buttons/labeledButton";
import { CardDatesMenu } from "@/components/cardMenus/cardDatesMenu";
import { CardMoveToListMenu } from "@/components/cardMenus/cardMoveToListMenu";
import { CardRowMenuBtn } from "@/components/cardMenus/cardRowMenus";
import { CardFilterMenu, type CardFilterState } from "@/components/cardMenus/cardFilterMenu";
import { CardDatesField, type DataTextClasses } from "@/components/cardRowElements/CardDatesField";
import { CardDoneIcon } from "@/components/cardRowElements/CardDoneIcon";
import { CardLabelsRenderer } from "@/components/cardRowElements/CardLabelsRenderer";
import { BoardCoverRenderer } from "@/components/menuElements/BoardCoverRenderer";
import { CustomDropDown } from "@/components/menuElements/CustomDropDown";
import { CommonMenuWrapper } from "@/components/menuElements/menuWrapper";
import { useBuildPublicURL } from "@/hooks/useBuildPublicURL";
import { useOverlayStore } from "@/overlays/overlayStore";
import { useBoardsStore } from "@/stores/boardsStore";
import { useCardsStore } from "@/stores/cardsStore";
import { useLabelsStore } from "@/stores/labelsStore";
import type { Board, Workspace } from "@/stores/types";
import { useUserMemberCardsStore } from "@/stores/userMemberCardsStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { Filter, XIcon } from "lucide-react";
import React, { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useShallow } from "zustand/shallow";
import { UserPagesWrapper } from "./userPagesWrapper";



const gridClass = "grid [grid-template-columns:minmax(9rem,1fr)_minmax(6rem,1fr)_minmax(0,1.8fr)_minmax(6rem,0.5fr)_minmax(11rem,1.7fr)] items-center justify-start gap-4 w-full"
export const UserCardsPage = () => {

    const userMemberCardsStore = useUserMemberCardsStore();
    const fetchUserCards = userMemberCardsStore.fetchMyMemberCards;
    const cardIds = useUserMemberCardsStore(useShallow((state) => state.cardIds));
    const cardsById = useCardsStore((state) => state.cardsById)

    const defaultFilterState: CardFilterState = {
        asDoneFilter: null,
        dueDateFilter: null,
        activityFilter: null,
        statusFilter: null,
        searchQuery: "",
        selectedBoardId: null,
    }
    const [filterState, setFilterState] = useState<CardFilterState>(defaultFilterState)
    const setPartialFilterState = (updater: React.SetStateAction<Partial<CardFilterState>>) => {
        setFilterState((prevState) => {
            const nextPartialState = typeof updater === "function"
                ? updater(prevState)
                : updater;

            return { ...prevState, ...nextPartialState };
        });
    }

    const allAvailableBoardIds = useUserMemberCardsStore(useShallow((state) => state.getAllBoardIdsForCardIdsFlat(cardIds)))
    const boardsById = useBoardsStore((state) => state.boardsById)

    const boardMenuItems = allAvailableBoardIds.map((boardId) => ({
        id: boardId,
        label: boardsById[boardId]?.Name ?? "Unknown board"
    }))
    boardMenuItems.unshift({ id: "all", label: "All boards" })


    const handleFetchCards = async () => {
        try {
            await fetchUserCards();
        } catch (error) {
            console.error("Error fetching user cards:", error);
        }
    };

    useEffect(() => {
        handleFetchCards();
        //console.log("Fetching user cards...");
    }, [fetchUserCards]);
    //console.log("User cards:", cardIds);

    const cols = [
        { id: "card", label: "Card" },
        { id: "list", label: "List" },
        { id: "labels", label: "Labels" },
        { id: "dueDate", label: "Due Date" },
        { id: "board", label: "Board" },


    ]
    const getList = useUserMemberCardsStore().getListByCardId
    const getBoard = useUserMemberCardsStore().getBoardByListId
    const getAllBoardIdsForCardId = useUserMemberCardsStore().getAllBoardIdsForCardId
    const getBoardStatus = useBoardsStore((state) => state.getBoardStatus)


    const visibleCardIds = cardIds.filter((cardId) => {
        const card = cardsById[cardId]
        if (filterState.asDoneFilter === "markedAsDone") {
            return card.Done === true
        } else if (filterState.asDoneFilter === "notMarkedAsDone") {
            return card.Done === false
        } else {
            return true
        }
    }).filter((cardId) => {
        const card = cardsById[cardId]
        const now = new Date()
        if (filterState.dueDateFilter === "overdue") {
            if (!card.EndDate) return false

            const endDate = new Date(card.EndDate)
            return endDate < now
        } else if (filterState.dueDateFilter === "dueInNextDay") {
            if (!card.EndDate) return false
            const endDate = new Date(card.EndDate)
            const nextDay = new Date()
            nextDay.setDate(now.getDate() + 1)
            return endDate >= now && endDate <= nextDay
        } else if (filterState.dueDateFilter === "dueInNextWeek") {
            if (!card.EndDate) return false
            const endDate = new Date(card.EndDate)
            const nextWeek = new Date()
            nextWeek.setDate(now.getDate() + 7)
            return endDate >= now && endDate <= nextWeek
        } else if (filterState.dueDateFilter === "dueInNextMonth") {
            if (!card.EndDate) return false
            const endDate = new Date(card.EndDate)
            const nextMonth = new Date()
            nextMonth.setMonth(now.getMonth() + 1)
            return endDate >= now && endDate <= nextMonth
        } else {
            return true
        }
    }).filter((cardId) => {
        const card = cardsById[cardId]
        if (filterState.searchQuery) {
            return card.Title.toLowerCase().includes(filterState.searchQuery.toLowerCase())
        } else {
            return true
        }
    }).filter((cardId) => {
        const boardIdsForCard = getAllBoardIdsForCardId(cardId) || []
        if (!filterState.statusFilter) {
            return true
        }

        return boardIdsForCard.some((boardId) => {
            const boardStatus = getBoardStatus(boardId)
            if (filterState.statusFilter === "accessible") {
                return boardStatus === null
            }

            return boardStatus === filterState.statusFilter
        })
    }).filter((cardId) => {
        const boardIdsForCard = getAllBoardIdsForCardId(cardId) || []
        if (filterState.selectedBoardId) {
            return boardIdsForCard.includes(filterState.selectedBoardId)
        } else {
            return true
        }
    }).filter((cardId) => {
        const card = cardsById[cardId]
        const now = new Date()
        if (filterState.activityFilter === "activeInLastDay") {
            const lastActivity = new Date(card.UpdatedAt)
            const lastDay = new Date()
            lastDay.setDate(now.getDate() - 1)
            return lastActivity >= lastDay
        } else if (filterState.activityFilter === "activeInLastWeek") {
            const lastActivity = new Date(card.UpdatedAt)
            const lastWeek = new Date()
            lastWeek.setDate(now.getDate() - 7)
            return lastActivity >= lastWeek
        } else if (filterState.activityFilter === "activeInLastMonth") {
            const lastActivity = new Date(card.UpdatedAt)
            const lastMonth = new Date()
            lastMonth.setMonth(now.getMonth() - 1)
            return lastActivity >= lastMonth
        } else {
            return true
        }
    })

    return (
        <UserPagesWrapper Title="Cards"
            iconId="cards"
            description="View and manage your cards across different workspaces. This includes actions such as creating, updating, and deleting tasks, as well as other interactions within your workspaces."
        >

            <div className="flex flex-row h-12 itmes-center justify-end w-full">
                <CustomDropDown
                    className="!w-[200px] !h-10 rounded-md "
                    btnId="sortByDate" />
                <CardRowMenuBtn menuComponent={({ onClose, ref }) =>
                    <CardFilterMenu ref={ref} onClose={onClose} filterState={filterState} setFilterState={setPartialFilterState} boardMenuItems={boardMenuItems} />} desiredBackdropOpacity={0.1}>
                    <LabeledButtonPresetB iconAtLeft={true}
                        label="Filter cards" onClick={handleFetchCards} className="!h-10 ml-2" >
                        <Filter size={16} />
                    </LabeledButtonPresetB>
                </CardRowMenuBtn>

            </div>

            <div className={`${gridClass} text-sm font-semibold text-neutral-400`}>
                {cols.map((col) => (
                    <div key={col.id} className="grid col-span-1">{col.label}</div>
                ))}
            </div>
            <div className="w-full h-px bg-neutral-700/50 mb-4 mt-1" />
            <div className="w-full flex flex-col !text-neutral-300 " >
                {
                    visibleCardIds.map((cardId) => {
                        const list = getList(cardId)
                        const board = getBoard(cardId, list?.ID ?? "")
                        if (!board) return null
                        return (<React.Fragment key={cardId} >
                            <CardTableRow cardId={cardId} />
                            <div className="w-full h-px bg-neutral-700/50 my-2" />
                        </React.Fragment>)
                    }
                    )
                }
            </div>
        </UserPagesWrapper>
    );
}

const EMPTY_IDS: string[] = []

const defaultTextColorClass = "text-neutral-300"
const notInBoardTextColorClass = "text-neutral-600"
const notInBoardBgColorClass = "bg-neutral-700/50"
const columnClasses = ` overflow-hidden text-ellipsis whitespace-wrap justify-items-start`
const hoverClasses = `hover:bg-neutral-400/10 transition-all duration-300 min-h-12 h-full flex items-center rounded-md px-2`
const CardTableRow = ({ cardId }: { cardId: string }) => {
    const card = useCardsStore(useShallow((state) => state.cardsById[cardId]));
    const list = useUserMemberCardsStore().getListByCardId(cardId);
    const board = useUserMemberCardsStore().getBoardByListId(cardId, list?.ID ?? "")
    const workspace = useWorkspaceStore((state) => state.workspacesById[board?.WorkspaceID ?? ""])
    const labelsById = useLabelsStore((state) => state.BoardLabelsById)
    const cardLabelIdsByBoard = useLabelsStore((state) => state.cardLabelsIdsByCardIdAndBoardId)
    const cardActions = useCardActionRegistry()
    const isInboxCard = useUserMemberCardsStore().isInboxCard(cardId)

    const isInBoard = !!board
    const resolvedTextColorClass = isInBoard ? defaultTextColorClass : notInBoardTextColorClass
    const dateClasses: DataTextClasses = {
        defaultTextColorClass: resolvedTextColorClass,
        isDoneTextColorClass: isInBoard ? "text-[#8cae59]" : notInBoardTextColorClass,
        isDoneColorClass: isInBoard ? "bg-[#28311b]" : notInBoardBgColorClass,
        isOverdueColorClass: isInBoard ? "bg-[#41221f]" : notInBoardBgColorClass,
        isOverdueTextColorClass: isInBoard ? "text-[#c87771]" : notInBoardTextColorClass,

    }

    const allBoardIds = Array.from(new Set(useUserMemberCardsStore().getAllBoardIdsForCardId(cardId) || EMPTY_IDS))
    const labelsByBoardForCard = allBoardIds.reduce<Record<string, string[]>>((acc, boardId) => {
        acc[boardId] = cardLabelIdsByBoard[boardId]?.[cardId] ?? EMPTY_IDS
        return acc
    }, {})


    const setCardDone = cardActions.setCardDone
    const toggleDone = () => {
        if (!card) return
        if (!board) return
        setCardDone(board.ID, card.ID, !card.Done)
    }

    const clostAllOverlay = useOverlayStore((state) => state.closeAll)

    const buildURL = useBuildPublicURL()
    const cardURL = workspace?.ID && board?.ID && card?.ID
        ? buildURL.buildPublicURLFromCardID(workspace.ID, board.ID, card.ID)
        : ""
    const navigate = useNavigate()

    const handleNavigateToCard = () => {
        if (!cardURL) return
        navigate(cardURL)
    }

    const handleNavigateToBoardById = (boardId: string) => {
        if (!workspace?.ID) return
        const url = buildURL.buildPublicURLFromBoardID(workspace.ID, boardId)
        navigate(url)
    }

    const boardById = useBoardsStore((state) => state.boardsById)


    return (
        <div className={`${gridClass} ${resolvedTextColorClass} relative text-sm font-normal`}>

            <div onClick={handleNavigateToCard}
                className={` ${columnClasses} ${hoverClasses} min-h-12 items-center group flex flex-row gap-2`}>
                <CardDoneIcon done={!!card?.Done} showWhenNotDone={true}
                    disabled={!board}
                    disabledColorClasses={{
                        borderColorClass: "border-gray-500",
                        bgColorClass: "bg-gray-500",
                        textColorClass: "text-gray-500"
                    }}
                    handleDoneToggle={toggleDone} />
                {card?.Title}
            </div>
            <CardRowMenuBtn
                menuComponent={({ onClose, ref }) => <CardMoveToListMenu
                    ref={ref}
                    onClose={clostAllOverlay}
                    boardID={board?.ID ?? ""}
                    listId={list?.ID ?? ""}
                    cardId={card?.ID ?? ""} />}
                desiredBackdropOpacity={0.1}
            >
                <div className={` ${columnClasses} ${hoverClasses}`}>


                    {list?.Title.trimStart().trimEnd()}

                </div>
            </CardRowMenuBtn>


            <div className={` ${columnClasses} w-fit flex gap-2 flex-col `} >
                {
                    allBoardIds.map((boardId) => {
                        const labelsForBoard = (labelsByBoardForCard[boardId] ?? EMPTY_IDS)
                            .map((labelId) => labelsById[labelId])
                            .filter(Boolean)
                        const board = boardById[boardId]
                        if (labelsForBoard.length === 0) return null
                        return (
                            <div onClick={() => handleNavigateToBoardById(boardId)}
                                title={board?.Name}
                                key={boardId} className="bg-slate-500/10 rounded-md w-fit py-1 px-1 text-xs text-slate-400">

                                <CardLabelsRenderer
                                    key={boardId}
                                    className=" !p-0  [grid-template-columns:repeat(auto-fit,minmax(clamp(30px,18vw,30px),1fr)) gap-0] "
                                    classNameLabelItem="max-w-[50px] min-w-[30px]"
                                    cardLabels={labelsForBoard} />
                            </div>
                        )
                    })
                }
            </div>

            <CardRowMenuBtn
                disableClick={!board}
                menuComponent={({ onClose, ref }) => <CardDatesMenu ref={ref}
                    onClose={clostAllOverlay}
                    cardId={card?.ID ?? ""}
                    boardId={board?.ID ?? ""} />}>

                <div className={` ${columnClasses}`}>
                    <CardDatesField className="w-fit px-2 !font-semibold"

                        card={card} rowHeight={28}
                        cardHasDates={!!card?.StartDate || !!card?.EndDate}
                        dataTextClasses={dateClasses}
                        showIfNoDates={!card?.Done}
                    />
                </div>
            </CardRowMenuBtn>


            <CardRowMenuBtn
                desiredBackdropOpacity={0.1}
                menuComponent={
                    ({ onClose, ref }) => <MirrorInBoardDropdown
                        ref={ref} onClose={clostAllOverlay}
                        workspace={workspace}
                        onClick={(id) => handleNavigateToBoardById(id)}
                        boards={allBoardIds.map((id) => boardById[id]).filter(Boolean) as Board[]} />
                }>
                <div onClick={() => { }}
                    className={` ${columnClasses} ${hoverClasses} `} >
                    {board ? <BoardComponent board={board} workspace={workspace} /> : <CardNotInBoardComponent isInboxCard={isInboxCard} />}
                </div>
            </CardRowMenuBtn>
        </div>
    )

}

type BoardComponentProps = {
    board: Board,
    workspace?: Workspace
    onClick?: () => void
}

const BoardComponent = ({ board, workspace, onClick }: BoardComponentProps) => {

    return (
        <div onClick={onClick}
            className="grid grid-cols-[50px_1fr] gap-2">
            <BoardCoverRenderer board={board}
                className="!grid !grid-cols-1 rounded-md overflow-hidden" overrideClassName />
            <div className="flex flex-col">
                <span className="text-sm font-semibold text-neutral-400">{board.Name}</span>
                <span className="text-xs text-neutral-500">{workspace ? workspace.Name : "Personal board"}</span>
            </div>

        </div>
    )
}

type CardNotInBoardComponentProps = {
    isInboxCard?: boolean;
}

const CardNotInBoardComponent = ({ isInboxCard }: CardNotInBoardComponentProps) => {
    const colorClass = "border-red-800/30 bg-red-800/10 text-red-800/60"
    const inboxColor = "border border-neutral-700/50 bg-neutral-700/10 text-neutral-500/70"
    const borderColor = isInboxCard ? inboxColor : colorClass
    const textColor = isInboxCard ? inboxColor : colorClass
    return (
        <div className={`flex items-center gap-2 ${borderColor} ${textColor} px-1 rounded-md`}>
            <span className="text-sm font-semibold ">{isInboxCard ? "Card in inbox" : "Card not in a board"}</span>
        </div>
    )
}


type MirrorInBoardDropdownProps = {
    boards: Board[];
    workspace?: Workspace;
    onClose: () => void;
    ref: React.RefObject<HTMLDivElement | null>;
    onClick?: (boardId: string) => void;
}

const MirrorInBoardDropdown = ({ boards, workspace, onClose, onClick, ref }: MirrorInBoardDropdownProps) => {
    return (
        <CommonMenuWrapper>

            <div className="flex flex-col p-1 gap-3 w-[280px]">
                <div className="text-bold flex flex-row items-center justify-between
                 gap-1 text-neutral-400 px-2 py-3">
                    <span className="text-[13px] font-semibold">Boards containing this card</span>
                    <XIcon onClick={onClose} className="cursor-pointer" size={18} />
                </div>
                {boards.map((board) => (
                    <div className="hover:!bg-neutral-400/20 p-1
                    transition-all duration-300 rounded-md"
                        key={board.ID} onClick={onClick ? () => onClick(board.ID) : undefined}>
                        <BoardComponent key={`simple-row-${board.ID}`} board={board} workspace={workspace} onClick={onClose} />
                    </div>
                ))}
            </div>
        </CommonMenuWrapper>
    )
}