
import { forwardRef, useEffect, useState } from "react";
import type { MenuItemExtended } from "@/types/uiTypes";
import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry";
import { useParams } from "react-router";
import { DropDown } from "../menuElements/DropDown";
import { ActionMenuWrapper } from "../modals/ListActionsMenu";
import { LabeledButtonPresetBSubmit } from "../buttons/labeledButton";
import { headerStyle } from "./cardMenuStyle";
import { CustomDropDown } from "../menuElements/CustomDropDown";
import { useBoardsStore } from "@/stores/boardsStore";
import { useShallow } from "zustand/shallow";
import { useBoardDetailStore } from "@/stores/boardDetailStore";
import type { CopyCardToListRequest, CopyInboxToListRequest, List, MirrorCardToInboxRequest, MirrorCardToListRequest, MoveInboxToListRequest } from "@/stores/types";
import { useCardsStore } from "@/stores/cardsStore";
import { CustomInput } from "../menuElements/CustomInput";
import { useUserInboxStore } from "@/stores/userInboxStore";

type cardMoveMenuMode = "move" | "copy" | "mirror" | "moveInboxCard" | "copyInboxCard";

type CardMoveMenuProps = {
    onClose: () => void;
    cardId?: string;
    listId?: string;
    mode?: cardMoveMenuMode;
    headless?: boolean;
    onMoveSubmitSuccess?: () => void;
}

export const CardMoveMenu = forwardRef<HTMLDivElement, CardMoveMenuProps>(({ onClose, cardId, listId, mode = "move", headless = false, onMoveSubmitSuccess }, ref) => {
    const [activeTab, setActiveTab] = useState("board")


    useEffect(() => {
        if (mode !== "mirror" && activeTab === "inbox") {
            setActiveTab("board");
        }
    }, [mode, activeTab]);



    const tabs: Tab[] = [
        { id: "board", label: `Board` },
        ...(mode === "mirror" ? [{ id: "inbox", label: "Inbox" }] : []),
    ]



    const content = (
        <>
            <div className="relative w-full h-full mb-0" />
            <div className="w-full" >
                <TabSelector activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
            </div>
            {activeTab === "board" && <MoveToBoardTab onClose={onClose} cardId={cardId} listId={listId} mode={mode} onMoveSubmitSuccess={onMoveSubmitSuccess} />}
            {activeTab === "inbox" && <MoveToInboxTab onClose={onClose} cardId={cardId} mode={mode} />}
        </>
    );

    if (headless) {
        return <div className="px-[10px] pt-[10px]">{content}</div>;
    }

    const Title = mode === "move" || mode === "moveInboxCard"
        ? "Move card to..."
        : mode === "copy" || mode === "copyInboxCard"
            ? "Copy card to..."
            : "Mirror card to...";
    return (
        <>
            <ActionMenuWrapper

                Title={Title}
                onClose={onClose}
                width={300}
                style={{ paddingTop: "10px", paddingInline: "10px" }}
                titleStyle={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "14px", fontWeight: 600 }}>
                {content}

            </ActionMenuWrapper>

        </>
    )
});

type Tab = {
    id: string;
    label: string;
}

type TableSelectorProps = {
    tabs: Tab[];
    activeTab: string;
    setActiveTab: (tabId: string) => void;
}

export const TabSelector = ({ activeTab, setActiveTab, tabs }: TableSelectorProps) => {

    return (
        <div className="w-full h-60vh flex bg-transparent flex-col font-grotesk">
            <div className="w-full cursor-default flex flex-row items-center justify-start gap-6 pt-6   ">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={`relative cursor-pointer h-[28px] text-sm text-text/70 hover:text-text transition-colors
                            ${activeTab === tab.id ? " text-[#6297e7] font-bold" : ""}`}
                        onClick={() => setActiveTab(tab.id)}
                    >{tab.label}
                        <div className={` ${activeTab === tab.id ? "absolute mt-2 bottom-0 w-full h-[3px] bg-[#6297e7]" : "hidden"}`} />

                    </div>
                ))}

            </div>
            <div className="flex w-full  h-[0.5px] bg-neutral-600" />

        </div>

    )
}

type MoveToBoardTabProps = {
    onClose: () => void;
    cardId?: string;
    listId?: string;
    mode?: cardMoveMenuMode;
    onMoveSubmitSuccess?: () => void;
}


const MoveToBoardTab = ({ onClose, cardId, listId, mode, onMoveSubmitSuccess }: MoveToBoardTabProps) => {
    const boardID = useParams().boardId as string;
    const workspaceId = useParams().workspaceId as string;
    const cardActions = useCardActionRegistry();
    const moveInboxCardToListInBoard = useUserInboxStore((state) => state.moveInboxCardToListInBoard)
    const copyInboxCardToListInBoard = useUserInboxStore((state) => state.copyInboxCardToListInBoard)
    const isInboxMove = mode === "moveInboxCard"
    const isInboxCopy = mode === "copyInboxCard"


    const fetchBoardsForWorkspace = useBoardsStore((state) => state.fetchBoardsForWorkspace)
    const boardIds = useBoardsStore(useShallow((state) => state.boardIdsByWorkspaceId[workspaceId] ?? []))
    const boardsById = useBoardsStore((state) => state.boardsById)
    const canModifyByBoardID = useBoardsStore(useShallow((state) => state.canModifyByBoardIDByWorkspaceId[workspaceId] ?? {}))
    const getListsForBoard = useBoardDetailStore((state) => state.getListsForBoard)
    const getListCardIds = useBoardDetailStore((state) => state.listCardIdsByListId)
    const listCardById = useBoardDetailStore((state) => state.listCardById)
    const boardListIdsByBoardId = useBoardDetailStore((state) => state.boardListIdsByBoardId)
    const boardListById = useBoardDetailStore((state) => state.boardListById)

    const [activeBoard, setActiveBoard] = useState<string | null>(boardIds[0] ?? null);

    const activeBoardLists = useBoardDetailStore(useShallow((state) => state.selectListsForBoard(activeBoard)))

    const getCardsForList = useBoardDetailStore((state) => state.getCardsForList)

    const [activeList, setActiveList] = useState<string | null>(activeBoardLists[0]?.ID ?? null);

    const activeListCards = useBoardDetailStore(useShallow((state) => state.selectCardsForList(activeList)))

    const selectSourceLists = useBoardDetailStore((state) => state.selectSourceListsForCard)
    const [sourceLists, setSourceLists] = useState<List[] | undefined>([])

    const moveCardToBoard = cardActions.moveCardToBoard;



    const [activePosition, setActivePosition] = useState<string | null>("end");
    const [activeSourceList, setActiveSourceList] = useState<string | null>(null);

    const [keepComments, setKeepComments] = useState(true);
    const [keepMembers, setKeepMembers] = useState(true);
    const [keepLabels, setKeepLabels] = useState(true);
    const [keepChecklists, setKeepChecklists] = useState(true);
    const [titleInput, setTitleInput] = useState(useCardsStore((state) => state.cardsById[cardId ?? ""]?.Title ?? ""));

    const [isTargetBoardSameAsSource, setIsTargetBoardSameAsSource] = useState(activeBoard === boardID);

    useEffect(() => {
        setIsTargetBoardSameAsSource(activeBoard === boardID);
    }, [activeBoard, boardID]);

    useEffect(() => {
        if (isInboxMove || isInboxCopy) {
            setSourceLists([])
            return
        }
        if (!cardId) return
        const sourceLists = selectSourceLists(cardId, boardID)
        setSourceLists(sourceLists)
    }, [cardId, selectSourceLists, boardID, isInboxMove])

    useEffect(() => {
        if (mode !== "move") {
            setActiveSourceList(null)
        }
    }, [mode])

    useEffect(() => {
        const fetchData = async () => {
            await fetchBoardsForWorkspace(workspaceId);
        };
        void fetchData();
    }, [fetchBoardsForWorkspace, workspaceId, boardID]);

    useEffect(() => {
        if (mode === "move" && !activeSourceList) {
            setActiveBoard(null)
            setActiveList(null)
            setActivePosition("end")
            return
        }

        const firstAllowedBoardID = boardIds.find((id) => canModifyByBoardID[id] === true) ?? boardIds[0] ?? null
        setActiveBoard((prev) => {
            if (prev && boardIds.includes(prev) && canModifyByBoardID[prev] === true) {
                return prev
            }
            return firstAllowedBoardID
        })
    }, [boardIds, canModifyByBoardID, mode, activeSourceList])

    useEffect(() => {
        // console.log("Active board changed: ", activeBoard);
        if (!activeBoard) return;
        setActiveList(null)
        setActivePosition("end")
        void getListsForBoard(activeBoard)
    }, [activeBoard, getListsForBoard]);

    useEffect(() => {
        if (!activeBoard) return
        const fetchAllListCards = async () => {
            await Promise.all(activeBoardLists.map((list) => getCardsForList(activeBoard, list.ID).catch(() => undefined)))
        }
        void fetchAllListCards()
    }, [activeBoard, activeBoardLists, getCardsForList])

    useEffect(() => {
        if (!activeBoard) {
            setActiveList(null)
            return
        }
        if (activeList && activeBoardLists.some((list) => list.ID === activeList)) {
            return
        }
        setActiveList(activeBoardLists[0]?.ID ?? null)
    }, [activeBoard, activeBoardLists, activeList])

    useEffect(() => {
        if (!activeBoard || !activeList) return
        setActivePosition("end")
        void getCardsForList(activeBoard, activeList)
    }, [activeList, activeBoard, getCardsForList]);

    useEffect(() => {
        if (!activeList) {
            setActivePosition("end")
            return
        }

        if (activePosition === "end") {
            return
        }

        const isValidPosition = activeListCards.some((card) => card.ID === activePosition)
        if (!isValidPosition) {
            setActivePosition("end")
        }
    }, [activeList, activeListCards, activePosition])

    function getListAccessMode(boardId: string, targetListID: string): "readonly" | "editable" {
        const relIDs = boardListIdsByBoardId[boardId] ?? []
        const rel = relIDs.map((id) => boardListById[id]).find((r) => r?.ListID === targetListID)
        return rel?.AccessMode === "readonly" ? "readonly" : "editable"
    }

    const isCardAlreadyInList = (targetListID: string): boolean => {
        if (!cardId || mode === "copy") return false
        const relIDs = getListCardIds[targetListID] ?? []
        return relIDs.some((relID) => listCardById[relID]?.CardID === cardId)
    }

    const getBoardDisableReason = (targetBoardID: string): string | undefined => {
        const noModify = canModifyByBoardID[targetBoardID] !== true
        if (noModify) return "No edit permission"
        return undefined
    }

    const getListDisableReason = (targetListID: string): string | undefined => {
        if (!activeBoard) return "Select board"
        const accessMode = getListAccessMode(activeBoard, targetListID)
        if (accessMode !== "editable") return "List is readonly"
        if (isCardAlreadyInList(targetListID)) return "Card already present"
        return undefined
    }

    function getSourceListDisableReason(sourceListID: string): string | undefined {
        if (mode !== "move") return undefined
        if (canModifyByBoardID[boardID] !== true) return "No edit permission"
        const accessMode = getListAccessMode(boardID, sourceListID)
        if (accessMode !== "editable") return "Source list is readonly"
        return undefined
    }

    useEffect(() => {
        if (mode !== "move") return
        if (!activeSourceList) return
        const exists = (sourceLists ?? []).some((list) => list.ID === activeSourceList)
        if (!exists || getSourceListDisableReason(activeSourceList)) {
            setActiveSourceList(null)
        }
    }, [mode, activeSourceList, sourceLists, canModifyByBoardID, boardID, boardListIdsByBoardId, boardListById])

    const boardReason = activeBoard ? getBoardDisableReason(activeBoard) : "Select board"
    const listReason = activeList ? getListDisableReason(activeList) : "Select list"
    const sourceReason = mode === "move"
        ? (activeSourceList ? getSourceListDisableReason(activeSourceList) : "Select source list")
        : undefined
    const isTargetInvalid = !!boardReason || !!listReason
    const isSubmitInvalid = isTargetInvalid || !!sourceReason
    // console.log("Active board: ", activeBoard);
    //console.log("Active board lists: ", activeBoardLists);
    //console.log("Active list cards: ", activeListCards);


    const menuItemsSourceLists: MenuItemExtended[] = (sourceLists ?? []).map((list) => ({
        id: list.ID,
        label: list.Title,
        disabled: !!getSourceListDisableReason(list.ID),
        description: getSourceListDisableReason(list.ID),
        kind: "standard"
    }))

    const menuItemsBoards: MenuItemExtended[] = boardIds.map((boardId) => ({
        id: boardId,
        label: boardsById[boardId]?.Name ?? "Unknown",
        disabled: !!getBoardDisableReason(boardId),
        description: getBoardDisableReason(boardId),
        kind: "standard"
    }))

    const menuItemsLists: MenuItemExtended[] = activeBoardLists.map((list) => ({
        id: list.ID,
        label: list.Title,
        disabled: !!getListDisableReason(list.ID),
        description: getListDisableReason(list.ID),
        kind: "standard"
    }))

    const menuItemsPositions: MenuItemExtended[] = activeListCards.map((card, index) => ({
        id: card.ID,
        label: (index + 1).toString(),
        kind: "standard"
    }))
    menuItemsPositions.push({
        id: "end",
        label: "End",
        kind: "standard"
    })

    const delayedExecute = (action: () => Promise<void>, delay: number) => {
        onClose();
        setTimeout(() => {
            void action();
        }, delay);
    }

    const handleMove = async () => {
        // console.log("Moving card with details: ", { cardId, listId, activeBoard, activeList, activePosition })
        if (isSubmitInvalid) return
        if (!activeBoard || !activeList || !cardId || !activePosition) return;
        const targetBoardId = activeBoard;
        const targetListId = activeList;

        let beforeId: string | null = activePosition;
        let insertAtEnd = false;
        if (activePosition === "end") {
            beforeId = null;
            insertAtEnd = true;
        }

        const execMove = async () => {
            if (isInboxMove) {
                const payload: MoveInboxToListRequest = {
                    BeforeID: beforeId,
                    InsertAt: insertAtEnd ? "end" : null,
                }
                await moveInboxCardToListInBoard(cardId, workspaceId, targetBoardId, targetListId, payload)
                onMoveSubmitSuccess?.();
                onClose();
                return
            }

            if (!activeSourceList) return
            const sourceListId = activeSourceList;
            const result = await moveCardToBoard(boardID, cardId, sourceListId, targetBoardId, targetListId, beforeId, insertAtEnd)
            if (result !== null) {
                onMoveSubmitSuccess?.();
                onClose();
            }
        }

        delayedExecute(execMove, 300);
    }

    const handleMirror = async () => {
        // console.log("Mirroring card with details: ", { cardId, listId, activeBoard, activeList, activePosition })
        if (isTargetInvalid) return
        if (!activeBoard || !activeList || !cardId || !activePosition) return;
        // console.log("Mirroring card with details: ", { cardId, listId, activeBoard, activeList, activePosition })
        const insertAtEnd = activePosition === "end";
        const beforeId = insertAtEnd ? null : activePosition;
        const payload: MirrorCardToListRequest = {
            TargetBoardID: activeBoard,
            TargetListID: activeList,
            BeforeID: beforeId,
            InsertAt: insertAtEnd ? "end" : null
        }
        const execMirror = async () => {
            const result = await cardActions.mirrorCardToList(boardID, cardId, payload)
            if (result !== null) onClose();
        }
        delayedExecute(execMirror, 300);
    }

    const handleCopy = async () => {
        // console.log("Copying card with details: ", { cardId, listId, activeBoard, activeList, activePosition })
        if (isTargetInvalid) return
        if (!activeBoard || !activeList || !cardId || !activePosition) return;
        const insertAtEnd = activePosition === "end";
        const beforeId = insertAtEnd ? null : activePosition;
        const execCopy = async () => {
            if (isInboxCopy) {
                const payload: CopyInboxToListRequest = {
                    BeforeID: beforeId,
                    InsertAt: insertAtEnd ? "end" : null,
                    Title: titleInput,
                    KeepComments: keepComments,
                    KeepMembers: keepMembers,
                    KeepLabels: keepLabels,
                    KeepChecklists: keepChecklists,
                }
                await copyInboxCardToListInBoard(cardId, workspaceId, activeBoard, activeList, payload)
                onClose();
                return
            }

            const payload: CopyCardToListRequest = {
                TargetBoardID: activeBoard,
                TargetListID: activeList,
                BeforeID: beforeId,
                InsertAt: insertAtEnd ? "end" : null,
                Title: titleInput,
                KeepComments: keepComments,
                KeepMembers: keepMembers,
                KeepLabels: keepLabels,
                KeepChecklists: keepChecklists,
            }
            const result = await cardActions.copyCardToList(boardID, cardId, payload)
            if (result !== null) onClose();
        }
        delayedExecute(execCopy, 300);
    }


    const dropdownMenu = (
        items: MenuItemExtended[],
        placeholder: string,
        activeId: string | null,
        setActiveId: (id: string) => void,
        style?: React.CSSProperties,
        label?: string,
        isLocked?: boolean,
    ) => {
        return (
            <>
                <div
                    style={style}
                    className="flex flex-col gap-1 items-start mb-3">
                    <span style={{ ...headerStyle, paddingTop: 0 }}>{label}</span>
                    <CustomDropDown items={items}
                        btnId={"id" + placeholder}
                        activeId={activeId}
                        placeholderCustom={placeholder}
                        disableGlobalState={true}
                        onClick={(id: string) => { setActiveId(id); }}
                        isLocked={isLocked}

                        showChevron={true}
                    />
                </div>
            </>
        )
    }

    const requiresSourceSelection = mode === "move"
    const hasSourceSelection = !requiresSourceSelection || !!activeSourceList
    const hasBoardSelection = !!activeBoard
    const hasListSelection = !!activeList

    const doubleDropdownMenu = () => {
        return (
            <div className="flex mt-18 flex-row justify-between gap-1">
                {dropdownMenu(menuItemsLists, "Select list...", activeList, setActiveList, { width: "100%" }, "List", !hasSourceSelection || !hasBoardSelection)}
                {dropdownMenu(menuItemsPositions, "1", activePosition, setActivePosition, { width: "120px" }, "Position", !hasSourceSelection || !hasBoardSelection || !hasListSelection)}
            </div>
        )
    }

    const headerDouble = (className: string, label: string) => {
        return (
            <div className={`flex flex-row mt-8 mb-2 gap-1 items-center ${className}`}>
                <span style={{ ...headerStyle, fontSize: "14px", fontWeight: 600, paddingTop: 0 }}>{label}</span>

            </div>
        )
    }

    const menuItems: MenuItemExtended[] = [
        {
            id: "copyCard", label: "Copy card instead", kind: "custom",
            customElement: () => (
                <CopyCard
                    keepComments={keepComments}
                    keepMembers={keepMembers}
                    keepLabels={keepLabels}
                    keepChecklists={keepChecklists}
                    titleInput={titleInput}
                    setKeepComments={setKeepComments}
                    setKeepMembers={setKeepMembers}
                    setKeepLabels={setKeepLabels}
                    setKeepChecklists={setKeepChecklists}
                    setTitleInput={setTitleInput}
                    isTargetBoardSameAsSource={isTargetBoardSameAsSource}
                />
            ),
            hide: () => mode !== "copy" && mode !== "copyInboxCard"
        },
        {
            id: "selectDetination", label: "Select destination", kind: "custom",
            customElement: () => headerDouble("!mt-0 mb-6", "Select destination")
        },
        {
            id: "sourceList", label: "Select source list", kind: "custom",
            customElement: () => dropdownMenu(menuItemsSourceLists, "Select source list...", activeSourceList, setActiveSourceList, undefined, "Source List"),
            hide: () => mode !== "move"
        },
        {
            id: "boardDropdown", label: "Select board", kind: "custom",
            customElement: () => dropdownMenu(menuItemsBoards, "Select board...", activeBoard, setActiveBoard, undefined, "Board", !hasSourceSelection)
        },

        { id: "listDropdown", label: "Select list and position", kind: "custom", customElement: doubleDropdownMenu },

        {
            id: "moveButton", label: "Move", kind: "custom", customElement: () => <Footer onClick={handleMove} label="Move" disabled={isSubmitInvalid} />, style: { marginTop: "16px" },
            hide: () => mode !== "move" && mode !== "moveInboxCard"
        },
        {
            id: "mirrorButton", label: "Mirror", kind: "custom", customElement: () => <Footer onClick={handleMirror} label="Mirror" disabled={isSubmitInvalid} />, style: { marginTop: "16px" },
            hide: () => mode !== "mirror"
        },
        {
            id: "copyButton", label: "Copy", kind: "custom", customElement: () => <Footer onClick={handleCopy} label="Copy" disabled={isSubmitInvalid} />, style: { marginTop: "16px" },
            hide: () => mode !== "copy" && mode !== "copyInboxCard"
        },

    ]

    return (
        <div className="w-full h-full flex flex-col pt-4 ">
            <DropDown items={menuItems} onClick={onClose} />
        </div>
    )
}

const MoveToInboxTab = ({ onClose, cardId, mode }: { onClose: () => void; cardId?: string; mode: string }) => {
    const boardID = useParams().boardId as string;
    const cardActions = useCardActionRegistry();

    const handleMirror = async () => {

        const Payload: MirrorCardToInboxRequest = {
            InsertAt: "end"
        }
        if (!cardId) return;
        try {
            await cardActions.mirrorCardToInbox(boardID, cardId, Payload)
            onClose();
        } catch (error) {
            // console.error("Error mirroring card to inbox: ", error);
        }
    }


    const menuItems: MenuItemExtended[] = [
        {
            id: "mirrorButton", label: "Mirror", kind: "custom", customElement: () => <Footer onClick={handleMirror} label="Mirror" />, style: { marginTop: "16px" },
            hide: () => mode !== "mirror"
        },
    ]
    return (
        <div className="w-full h-full flex flex-col pt-4 ">
            <DropDown items={menuItems} onClick={onClose} />
        </div>
    )
}

const Footer = ({ cardId, onClick, label, disabled = false }: { cardId?: string; onClick: () => void; label: string; disabled?: boolean }) => {
    return (

        <div className="w-full mt-4 flex items-center justify-end">
            <LabeledButtonPresetBSubmit label={label}
                className="w-full h-[35px] rounded-[3px]" onClick={onClick} disabled={disabled} />
        </div>
    )
}

type copyCardProps = {
    keepComments: boolean;
    keepMembers: boolean;
    keepLabels: boolean;
    keepChecklists: boolean;
    setKeepComments: (b: boolean) => void;
    setKeepMembers: (b: boolean) => void;
    setKeepLabels: (b: boolean) => void;
    setKeepChecklists: (b: boolean) => void;
    titleInput: string;
    setTitleInput: (s: string) => void;
    isTargetBoardSameAsSource: boolean;
}

const CopyCard = ({ keepComments, keepMembers,
    keepLabels, keepChecklists, titleInput,
    setKeepComments, setKeepMembers, setKeepLabels,
    setKeepChecklists, setTitleInput, isTargetBoardSameAsSource }: copyCardProps) => {


    const input = () => {

        return (
            <div className=" py-2 text-gray-500">
                <span className="text-sm text-gray-300 mb-4">Title</span>
                <CustomInput
                    useTextArea={true}
                    value={titleInput}
                    className={" mt-0.5 mb-1"}
                    placeholder="Enter new card title..."
                    onInputChange={(labelTitleRef) => {
                        labelTitleRef?.current &&
                            setTitleInput(labelTitleRef?.current.value)
                    }} />
            </div>
        )
    }

    const menuItems: MenuItemExtended[] = [
        { id: "titleInput", label: "Title", kind: "custom", customElement: input },
        {
            id: "keepComments", label: "Keep comments", kind: "checkbox", checked: keepComments, onChange: () => setKeepComments(!keepComments)
        },
        {
            id: "keepMembers", label: "Keep members", kind: "checkbox", checked: keepMembers, onChange: () => setKeepMembers(!keepMembers),
            hide: () => !isTargetBoardSameAsSource
        },
        {
            id: "keepLabels", label: "Keep labels", kind: "checkbox", checked: keepLabels, onChange: () => setKeepLabels(!keepLabels)
        },
        {
            id: "keepChecklists", label: "Keep checklists", kind: "checkbox", checked: keepChecklists, onChange: () => setKeepChecklists(!keepChecklists)
        }
    ];

    return (
        <DropDown items={menuItems} onClick={() => { }} />
    )
}
