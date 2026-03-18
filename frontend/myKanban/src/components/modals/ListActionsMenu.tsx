import { forwardRef, useEffect, useMemo, useState } from "react";
import type { MenuItemExtended } from "@/types/uiTypes";
import { DropDown } from "../menuElements/DropDown";
import { useListActionRegistry } from "@/actionRegistry/listActionRegistry";
import { useParams } from "react-router";
import type { BoardListAccessMode, MirrorBoardListRequest, MoveBoardListRequest } from "@/stores/types";
import { ActionMenuWrapper } from "./ActionMenuWrapper";
import { ListColorSelector } from "./ListColorSelector";
import { CustomInput } from "../menuElements/CustomInput";
import { LabeledButtonPresetBSubmit } from "../buttons/labeledButton";
import { CustomDropDown } from "../menuElements/CustomDropDown";
import { useBoardsStore } from "@/stores/boardsStore";
import { useBoardDetailStore } from "@/stores/boardDetailStore";
import { useUserWatchStore } from "@/stores/userWatchStore";
import { useListsStore } from "@/stores/listsStore";
import { useShallow } from "zustand/shallow";
import { CheckIcon } from "@heroicons/react/24/solid";
import { useAsyncRequestGroup } from "@/hooks/useAsyncRequestGroup";
import { useAsyncKey } from "@/stores/asyncRequestStore";
import { useOverlayStore } from "@/overlays/overlayStore";

export { ActionMenuWrapper } from "./ActionMenuWrapper";
export { ListColorSelector } from "./ListColorSelector";

type ListActionsMenuProps = {
    onClose: () => void;
    listID: string;
    overlayId?: string;
}

export const ListActionsMenu = forwardRef<HTMLDivElement, ListActionsMenuProps>(({ onClose, listID, overlayId }, ref) => {
    const boardID = useParams().boardId as string;
    const listActions = useListActionRegistry();
    const isWatched = useUserWatchStore((state) => state.isListWatched(listID));
    const visibilityRole = useBoardDetailStore((state) => state.VisibilityRole)
    const boardListRelation = useBoardDetailStore(useShallow((state) => {
        const ids = state.boardListIdsByBoardId[boardID] ?? []
        for (const relID of ids) {
            const rel = state.boardListById[relID]
            if (rel?.ListID === listID) return rel
        }
        return null
    }))
    const boardListRelationAccessMode = (boardListRelation as { AccessMode?: BoardListAccessMode } | null)?.AccessMode
    const currentAccessMode: BoardListAccessMode = boardListRelationAccessMode === "readonly" ? "readonly" : "editable"
    const isReadonly = currentAccessMode === "readonly"
    const canPatchAccessMode = visibilityRole === "admin" || visibilityRole === "owner"
    // const { executeCopyListOptimistic } = useListCopyOptimistic(listID, boardID)
    const isRootBoardList = boardListRelation ? boardListRelation.RootID === boardListRelation.ID : false
    const getListById = useListsStore((state) => state.getListById)
    const currentExternalAccess = getListById(boardListRelation?.ListID ?? "")?.ExternalAccess ?? "open"

    const [activeTab, setActiveTab] = useState<"main" | "copyList" | "moveList" | "mirrorList" | "moveAllCards" | "accessMode" | "externalAccess">("main")

    const asyncKeys = [
        useAsyncKey("list:copy:bulk", listID),
        useAsyncKey("list:move:crossboard", listID),
        useAsyncKey("list:mirror", listID),
        useAsyncKey("list:detach", listID),
        useAsyncKey("list:edit:externalAccess", listID),
        useAsyncKey("list:edit:props", listID),
        useAsyncKey("list:edit:access", listID),
        useAsyncKey("card:detach:bulk", listID),
        useAsyncKey("card:move"),
    ] as const
    const { isLoading } = useAsyncRequestGroup([...asyncKeys])



    const CLOSE_TIMEOUT = 200;
    const scheduleClose = (timeout: number = CLOSE_TIMEOUT) => {
        if (overlayId) useOverlayStore.getState().freezeAnchor(overlayId);
        setTimeout(() => {
            onClose();
        }, timeout)
    }

    const handleCopyList = async (title: string) => {
        //executeCopyListOptimistic(title)
        const result = await listActions.copySingleListAfterSelf(boardID, listID, { title, keepMembers: false })
        if (result !== null) scheduleClose(600)
    }

    const handleMoveList = async (payload: MoveBoardListRequest) => {
        if (overlayId) useOverlayStore.getState().freezeAnchor(overlayId);
        // onClose()
        const result = await listActions.moveBoardList(boardID, listID, payload)
        if (result !== null) scheduleClose(300)
    }

    const handleMirrorList = async (payload: MirrorBoardListRequest) => {
        const result = await listActions.mirrorBoardList(boardID, listID, payload)
        if (result !== null) scheduleClose(1200)
    }

    const handleMoveAllCards = async (targetListID: string) => {
        const result = await listActions.moveAllCardsInList(boardID, listID, targetListID)
        if (result !== null) scheduleClose(0)
    }

    const handleArchiveList = async () => {
        if (overlayId) useOverlayStore.getState().freezeAnchor(overlayId);

        // scheduleClose(600)
        const result = await listActions.archiveList(boardID, listID)
        if (result !== null) onClose()
    }

    const handleArchiveAllCards = async () => {
        const result = await listActions.archiveAllCardsInList(boardID, listID)
        if (result !== null) scheduleClose(1200)
    }

    const handleAccessMode = async (mode: BoardListAccessMode) => {
        const result = await listActions.setListAccessMode(boardID, listID, mode)
        if (result !== null) scheduleClose(1200)
    }

    const handleExternalAccess = async (value: "open" | "restricted") => {
        const res = await useListsStore.getState().patchListExternalAccess(listID, boardID, value)
        if (res !== null) scheduleClose(1200)
    }

    const handleAddCard = async () => {
        const result = await listActions.addCard(boardID, listID)
        if (result !== null) scheduleClose(0)
    }

    const h = 32;
    const menuItems: MenuItemExtended[] = [
        { id: "addCard", label: "Add Card", kind: "standard", height: h, disabled: isReadonly, onClick: () => handleAddCard() },
        { id: "copyList", label: "Copy List", kind: "standard", height: h, onClick: () => setActiveTab("copyList") },
        { id: "moveList", label: "Move List", kind: "standard", height: h, onClick: () => setActiveTab("moveList") },
        { id: "mirrorList", label: "Mirror List", kind: "standard", height: h, onClick: () => setActiveTab("mirrorList") },
        { id: "moveAllCards", label: "Move All Cards in This List", kind: "standard", height: h, onClick: () => setActiveTab("moveAllCards") },
        {
            id: "accessMode",
            label: `Access Mode: ${currentAccessMode}`,
            kind: "standard" as const,
            height: h,
            disabled: !canPatchAccessMode,
            description: !canPatchAccessMode ? "Admin only" : undefined,
            onClick: () => setActiveTab("accessMode")
        },
        {
            id: "externalAccess",
            label: `External Access: ${currentExternalAccess}`,
            kind: "standard" as const,
            height: h,
            disabled: !isRootBoardList || !canPatchAccessMode,
            description: !isRootBoardList ? "Only available on root lists" : !canPatchAccessMode ? "Admin only" : undefined,
            onClick: () => setActiveTab("externalAccess")
        },
        { id: "sortby", label: "Sort By...", kind: "standard", height: h, disabled: true },
        {
            id: "watch",
            label: "Watch",
            kind: "standard",
            height: h,
            endIcon: isWatched ? <CheckIcon className="w-4 h-4" /> : undefined,
            onClick: () => listActions.watchList(boardID, listID)
        },
        { id: "labels", label: "Labels", kind: "custom", customElement: () => <ListColorSelector boardID={boardID} listID={listID} disabled={isReadonly} /> },
        { id: "archiveList", label: "Archive List", kind: "standard", height: h, onClick: () => handleArchiveList() },
        { id: "archiveCards", label: "Archive All Cards in This List", kind: "standard", height: h, onClick: () => handleArchiveAllCards() },
    ]

    const Title = "List Actions";
    return (
        <>
            <ActionMenuWrapper
                titleClassName="!font-grotesk !text-sm font-normal !text-neutral-400"
                requestGroups={[
                    {
                        requestKey: ["list:copy:bulk", "list:mirror",
                            "list:edit:externalAccess", "list:edit:props", "list:edit:access",
                            "card:detach:bulk", "card:move:bulk"],
                        minLoadingMs: 0, maxErrorMs: 3000, minSuccessMs: 1000, show: ["loading", "success", "error"]
                    },
                    { requestKey: [], minLoadingMs: 0, maxErrorMs: 3000, minSuccessMs: 1000, show: ["loading", "error"] },
                ]} isLoading={isLoading} onBack={activeTab !== "main" ? () => setActiveTab("main") : undefined}
                width={300}
                Title={Title} onClose={onClose}>
                <div className={`text-neutral-300 ${activeTab !== "main" ? "opacity-0 h-0 pointer-events-none" : "opacity-100 h-[485px]"} transition-all duration-200`}>
                    <DropDown items={menuItems} onClick={() => { }} />
                </div>
                <div className={`text-neutral-300 ${activeTab !== "copyList" ? "opacity-0 h-0 pointer-events-none" : "opacity-100 h-[146px]"} transition-all duration-200`}>
                    <CopyListTab onSubmit={(title) => handleCopyList(title)} />
                </div>
                <div className={`text-neutral-300 ${activeTab !== "moveList" ? "opacity-0 h-0 pointer-events-none" : "opacity-100 h-[235px]"} transition-all duration-200`}>
                    <MoveListTab sourceBoardID={boardID} sourceListID={listID} submitLabel="Move" onSubmit={handleMoveList} />
                </div>
                <div className={`text-neutral-300 ${activeTab !== "mirrorList" ? "opacity-0 h-0 pointer-events-none" : "opacity-100 h-[235px]"} transition-all duration-200`}>
                    <MoveListTab
                        sourceBoardID={boardID}
                        sourceListID={listID}
                        submitLabel="Mirror"
                        mode="mirror"
                        onSubmit={(payload) => {
                            if (!payload.TargetBoardID) {
                                return
                            }
                            handleMirrorList({
                                TargetBoardID: payload.TargetBoardID,
                                BeforeID: payload.BeforeID ?? null,
                                InsertAt: payload.InsertAt ?? null,
                            })
                        }}
                    />
                </div>
                <div className={`text-neutral-300 ${activeTab !== "moveAllCards" ? "opacity-0 h-0 pointer-events-none" : "opacity-100 h-[260px]"} transition-all duration-200`}>
                    <MoveAllCardsTab sourceBoardID={boardID} sourceListID={listID} onSelectTargetList={handleMoveAllCards} />
                </div>
                <div className={`text-neutral-300 ${activeTab !== "accessMode" ? "opacity-0 h-0 pointer-events-none" : "opacity-100 h-[125px]"} transition-all duration-200`}>
                    <AccessModeTab currentAccessMode={currentAccessMode} onSubmit={handleAccessMode} />
                </div>
                <div className={`text-neutral-300 ${activeTab !== "externalAccess" ? "opacity-0 h-0 pointer-events-none" : "opacity-100 h-[125px]"} transition-all duration-200`}>
                    <ExternalAccessTab currentValue={currentExternalAccess} onSubmit={handleExternalAccess} />
                </div>
            </ActionMenuWrapper>
        </>

    )
});

type CopyListTabProps = {
    onSubmit?: (title: string) => void;
}

const CopyListTab = ({ onSubmit }: CopyListTabProps) => {
    const [title, setTitle] = useState("")


    return (
        <>
            <div className="px-3 py-2 gap-0 flex flex-col mt-1">
                <span className="text-sm font-medium text-neutral-400 mb-1">Title</span>
                <CustomInput
                    onInputChange={(inputRef) => setTitle(inputRef?.current?.value ?? "")}
                    useTextArea={true}
                    placeholder="New List Title"
                    className={"text-[15px]"}

                />

                <LabeledButtonPresetBSubmit
                    className="w-fit !h-10 mt-3"
                    label="Create Copy" onClick={() => { onSubmit?.(title) }} />
            </div>
        </>
    )
}

type AccessModeTabProps = {
    currentAccessMode: BoardListAccessMode;
    onSubmit?: (mode: BoardListAccessMode) => void;
}

const AccessModeTab = ({ currentAccessMode, onSubmit }: AccessModeTabProps) => {
    const [accessMode, setAccessMode] = useState<BoardListAccessMode>(currentAccessMode)

    useEffect(() => {
        setAccessMode(currentAccessMode)
    }, [currentAccessMode])

    const accessModeItems: MenuItemExtended[] = [
        { id: "editable", label: "Editable", kind: "standard" },
        { id: "readonly", label: "Readonly", kind: "standard" },
    ]

    return (
        <div className="px-3 py-2 gap-0 flex flex-col mt-1">
            <span className="text-sm font-medium text-neutral-400 mb-1">Access mode</span>
            <CustomDropDown
                btnId={`list-access-mode-${currentAccessMode}`}
                items={accessModeItems}
                activeId={accessMode}
                onClick={(id) => setAccessMode(id as BoardListAccessMode)}
                disableGlobalState={true}
                showChevron={true}
                className="!h-10"
                chevronClassName="w-4 h-4"
            />

            <LabeledButtonPresetBSubmit
                className="w-fit !h-10 mt-4"
                label="Save"
                onClick={() => onSubmit?.(accessMode)}
            />
        </div>
    )
}

type ExternalAccessTabProps = {
    currentValue: "open" | "restricted";
    onSubmit?: (value: "open" | "restricted") => void;
}

const ExternalAccessTab = ({ currentValue, onSubmit }: ExternalAccessTabProps) => {
    const [value, setValue] = useState<"open" | "restricted">(currentValue)

    useEffect(() => {
        setValue(currentValue)
    }, [currentValue])

    const items: MenuItemExtended[] = [
        { id: "open", label: "Open", description: "Mirror boards can edit cards in this list", kind: "standard" },
        { id: "restricted", label: "Restricted", description: "Only this board's members can edit cards", kind: "standard" },
    ]

    return (
        <div className="px-3 py-2 gap-0 flex flex-col mt-1">
            <span className="text-sm font-medium text-neutral-400 mb-1">External Access</span>
            <CustomDropDown
                btnId={`list-external-access-${currentValue}`}
                items={items}
                activeId={value}
                onClick={(id) => setValue(id as "open" | "restricted")}
                disableGlobalState={true}
                showChevron={true}
                className="!h-10"
                chevronClassName="w-4 h-4"
            />
            <LabeledButtonPresetBSubmit
                className="w-fit !h-10 mt-4"
                label="Save"
                onClick={() => onSubmit?.(value)}
            />
        </div>
    )
}

export type MoveListTabProps = {
    sourceBoardID: string;
    sourceListID: string;
    submitLabel?: string;
    mode?: "move" | "mirror";
    onSubmit?: (payload: MoveBoardListRequest | MirrorBoardListRequest) => void;
}

export const MoveListTab = ({ sourceBoardID, sourceListID, submitLabel = "Move", mode = "move", onSubmit }: MoveListTabProps) => {
    const workspaceId = useParams().workspaceId as string;
    const fetchBoardsForWorkspace = useBoardsStore((state) => state.fetchBoardsForWorkspace)
    const boardIds = useBoardsStore(useShallow((state) => state.boardIdsByWorkspaceId[workspaceId] ?? []))
    const boardsById = useBoardsStore((state) => state.boardsById)
    const canModifyByBoardID = useBoardsStore(useShallow((state) => state.canModifyByBoardIDByWorkspaceId[workspaceId] ?? {}))
    const getListsForBoard = useBoardDetailStore((state) => state.getListsForBoard)
    const { boardListIdsByBoardId, boardListById } = useBoardDetailStore(useShallow((state) => ({
        boardListIdsByBoardId: state.boardListIdsByBoardId,
        boardListById: state.boardListById,
    })))

    const [targetBoardID, setTargetBoardID] = useState<string>(sourceBoardID)

    const targetBoardLists = useBoardDetailStore(useShallow((state) => state.selectListsForBoard(targetBoardID)))

    const positionCandidates = useMemo(() => {
        if (targetBoardID === sourceBoardID) {
            return targetBoardLists.filter((list) => list.ID !== sourceListID)
        }
        return targetBoardLists
    }, [targetBoardID, sourceBoardID, sourceListID, targetBoardLists])

    const currentBeforeID = useMemo(() => {
        if (targetBoardID !== sourceBoardID) {
            return "end"
        }

        const currentIndex = targetBoardLists.findIndex((list) => list.ID === sourceListID)
        if (currentIndex === -1 || currentIndex >= targetBoardLists.length - 1) {
            return "end"
        }

        return targetBoardLists[currentIndex + 1].ID
    }, [targetBoardID, sourceBoardID, sourceListID, targetBoardLists])

    const [targetBeforeID, setTargetBeforeID] = useState<string>("end")

    useEffect(() => {
        void fetchBoardsForWorkspace(workspaceId)
    }, [fetchBoardsForWorkspace, workspaceId])

    useEffect(() => {
        if (!targetBoardID) return
        void getListsForBoard(targetBoardID)
    }, [targetBoardID, getListsForBoard])

    useEffect(() => {
        const fetchAll = async () => {
            const candidateBoardIDs = boardIds.filter((id) => canModifyByBoardID[id] === true)
            await Promise.all(candidateBoardIDs.map((id) => getListsForBoard(id).catch(() => undefined)))
        }
        void fetchAll()
    }, [boardIds, canModifyByBoardID, getListsForBoard])

    useEffect(() => {
        setTargetBeforeID(currentBeforeID)
    }, [currentBeforeID])

    const hasDuplicateListByBoardID = useMemo(() => {
        const out: Record<string, boolean> = {}
        for (const id of boardIds) {
            const relIDs = boardListIdsByBoardId[id] ?? []
            out[id] = relIDs.some((relID) => boardListById[relID]?.ListID === sourceListID)
        }
        return out
    }, [boardIds, sourceListID, boardListIdsByBoardId, boardListById])

    const targetHasNoModifyPermission = canModifyByBoardID[targetBoardID] !== true
    const targetHasDuplicateList = hasDuplicateListByBoardID[targetBoardID] === true
    const isTargetInvalid = targetHasNoModifyPermission || targetHasDuplicateList

    const getBoardDisableReason = (boardID: string): string | undefined => {
        if (mode === "mirror" && boardID === sourceBoardID) {
            return "List already present"
        }

        const noModify = canModifyByBoardID[boardID] !== true
        if (noModify) {
            return "No edit permission"
        }

        const duplicated = hasDuplicateListByBoardID[boardID] === true
        if (duplicated) {
            return "List already present"
        }

        return undefined
    }

    const boardItems: MenuItemExtended[] = boardIds.map((id) => {
        const reason = getBoardDisableReason(id)

        return {
            id,
            label: boardsById[id]?.Name ?? "Unknown",
            disabled: !!reason,
            description: reason,
            kind: "standard",
        }
    })

    const positionItems: MenuItemExtended[] = positionCandidates.map((list, index) => ({
        id: list.ID,
        label: (index + 1).toString(),
        description: targetBoardID === sourceBoardID && currentBeforeID === list.ID ? "(current)" : undefined,
        kind: "standard",
    }))
    positionItems.push({
        id: "end",
        label: "End",
        description: targetBoardID === sourceBoardID && currentBeforeID === "end" ? "(current)" : undefined,
        kind: "standard"
    })

    const handleSubmit = () => {
        if (isTargetInvalid) {
            return
        }

        const basePayload: MoveBoardListRequest = {
            TargetBoardID: targetBoardID,
        }

        if (targetBeforeID === "end") {
            basePayload.InsertAt = "end"
        } else {
            basePayload.BeforeID = targetBeforeID
        }

        if (mode === "mirror") {
            const payload: MirrorBoardListRequest = {
                TargetBoardID: targetBoardID,
                BeforeID: basePayload.BeforeID ?? null,
                InsertAt: basePayload.InsertAt ?? null,
            }
            onSubmit?.(payload)
            return
        }

        onSubmit?.(basePayload)
    }

    return (
        <div className="px-3 py-2 gap-0 flex flex-col mt-1">
            <span className="text-sm font-medium text-neutral-400 mb-1">Board</span>
            <CustomDropDown
                btnId={`move-list-board-${sourceListID}`}
                items={boardItems}
                activeId={targetBoardID}
                onClick={(id) => setTargetBoardID(id)}
                showChevron={true}
                className="!h-10"
                chevronClassName="w-4 h-4"
            />

            <span className="text-sm font-medium text-neutral-400 mt-3 mb-1">Position</span>
            <CustomDropDown
                btnId={`move-list-position-${sourceListID}`}
                items={positionItems}
                activeId={targetBeforeID}
                onClick={(id) => setTargetBeforeID(id)}
                showChevron={true}
                className="!h-10"
                chevronClassName="w-4 h-4"
            />

            <LabeledButtonPresetBSubmit
                disabled={isTargetInvalid}
                className="w-fit !h-10 mt-4"
                label={submitLabel} onClick={handleSubmit} />
        </div>
    )
}

type MoveAllCardsTabProps = {
    sourceBoardID: string;
    sourceListID: string;
    onSelectTargetList?: (targetListID: string) => void;
}

const MoveAllCardsTab = ({ sourceBoardID, sourceListID, onSelectTargetList }: MoveAllCardsTabProps) => {
    const getListsForBoard = useBoardDetailStore((state) => state.getListsForBoard)
    const boardLists = useBoardDetailStore(useShallow((state) => state.selectListsForBoard(sourceBoardID)))

    useEffect(() => {
        void getListsForBoard(sourceBoardID)
    }, [getListsForBoard, sourceBoardID])

    const targetLists = useMemo(() => {
        return boardLists.filter((list) => list.ID !== sourceListID)
    }, [boardLists, sourceListID])

    const listItems: MenuItemExtended[] = targetLists.map((list) => ({
        id: list.ID,
        label: list.Title,
        kind: "standard",
        onClick: () => onSelectTargetList?.(list.ID),
    }))

    if (listItems.length === 0) {
        return (
            <div className="px-3 py-2 mt-1 text-sm text-neutral-400">
                No target lists available in this board.
            </div>
        )
    }

    return (
        <div

            className="px-0 py-2 mt-1 h-full overflow-y-auto scrollbar-hidden">
            <DropDown items={listItems} onClick={() => { }} />
        </div>
    )
}
