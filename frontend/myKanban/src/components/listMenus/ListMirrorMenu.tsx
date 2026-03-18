import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import type { RefObject } from "react"
import { api } from "@/api/api"
import { useListActionRegistry } from "@/actionRegistry/listActionRegistry"
import { useListsStore } from "@/stores/listsStore"

import type { BoardListAccessMode, BoardListMirrorsResponse, MirrorBoardListRequest } from "@/stores/types"
import { ActionMenuWrapper, MoveListTab } from "@/components/modals/ListActionsMenu"
import { CustomDropDown, type MenuItem } from "@/components/menuElements/CustomDropDown"
import { CardRowMenuBtn } from "@/components/cardMenus/cardRowMenus"
import { RequestAccessModal } from "@/components/modals/RequestAccessModal"

type ListMirrorMenuProps = {
    boardID: string
    listID: string
    boardListID: string
    isRootBoardList: boolean
    onClose: () => void
    ref: RefObject<HTMLDivElement | null>
}

const accessModeItems: MenuItem[] = [
    { id: "editable", label: "Editable" },
    { id: "readonly", label: "Readonly" },
]

const externalAccessItems: MenuItem[] = [
    { id: "open", label: "Open" },
    { id: "restricted", label: "Restricted" },
]

export const ListMirrorMenu = ({ boardID, listID, boardListID, isRootBoardList, onClose, ref }: ListMirrorMenuProps) => {
    const navigate = useNavigate()
    const workspaceId = useParams().workspaceId as string
    const listActions = useListActionRegistry()
    const patchListExternalAccess = useListsStore((state) => state.patchListExternalAccess)
    const list = useListsStore((state) => state.listsById[listID])

    const [activeTab, setActiveTab] = useState<"instances" | "createMirror">("instances")
    const [isLoading, setIsLoading] = useState(false)
    const [isUpdatingExternalAccess, setIsUpdatingExternalAccess] = useState(false)
    const [updatingAccessModeByBoardListID, setUpdatingAccessModeByBoardListID] = useState<Record<string, boolean>>({})
    const [data, setData] = useState<BoardListMirrorsResponse | null>(null)

    const fetchMirrors = async () => {
        setIsLoading(true)
        try {
            const response = await api.get<BoardListMirrorsResponse>(`/boards/${boardID}/boardlists/${boardListID}/mirrors`)
            setData(response.data)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        void fetchMirrors()
    }, [boardID, boardListID])

    const handleMirrorSubmit = async (payload: MirrorBoardListRequest) => {
        await listActions.mirrorBoardList(boardID, listID, payload)
        setActiveTab("instances")
        await fetchMirrors()
    }

    const handleSetMirrorAccessMode = async (targetBoardID: string, targetListID: string, targetBoardListID: string, accessMode: BoardListAccessMode) => {
        setUpdatingAccessModeByBoardListID((prev) => ({ ...prev, [targetBoardListID]: true }))
        try {
            await listActions.setListAccessMode(targetBoardID, targetListID, accessMode)
            setData((prev) => {
                if (!prev) return prev
                return {
                    ...prev,
                    Items: prev.Items.map((item) =>
                        item.BoardList.ID === targetBoardListID
                            ? { ...item, BoardList: { ...item.BoardList, AccessMode: accessMode } }
                            : item
                    )
                }
            })
            await fetchMirrors()
        } finally {
            setUpdatingAccessModeByBoardListID((prev) => ({ ...prev, [targetBoardListID]: false }))
        }
    }

    const handleSetExternalAccess = async (value: string) => {
        if (value !== "open" && value !== "restricted") return
        setIsUpdatingExternalAccess(true)
        try {
            await patchListExternalAccess(listID, boardID, value)
        } finally {
            setIsUpdatingExternalAccess(false)
        }
    }

    const currentExternalAccess = list?.ExternalAccess ?? "open"

    return (
        <ActionMenuWrapper
            ref={ref}
            onBack={activeTab === "createMirror" ? () => setActiveTab("instances") : undefined}
            width={330}
            Title={activeTab === "instances" ? "Mirror Menu" : "Create Mirror"}
            onClose={onClose}
        >
            {activeTab === "instances" && (
                <div className="px-3 py-2 flex flex-col gap-3 max-h-[380px] overflow-y-auto scrollbar-hidden">

                    {isRootBoardList && (
                        <div className="flex flex-col gap-1 pb-2 border-b border-neutral-700">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-neutral-400">External access</span>
                            </div>
                            <CustomDropDown
                                btnId={`list-external-access-${listID}`}
                                items={externalAccessItems}
                                activeId={currentExternalAccess}
                                onClick={handleSetExternalAccess}
                                showChevron={true}
                                className="!h-9"
                                chevronClassName="w-4 h-4"
                                isLocked={isUpdatingExternalAccess}
                                disableGlobalState={true}
                            />
                            <span className="text-[11px] text-neutral-500">
                                {currentExternalAccess === "restricted"
                                    ? "Mirror instances are read-only for non-members of this board."
                                    : "Mirror instances inherit the access mode set per board."}
                            </span>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-400">
                            {isRootBoardList ? "Root list instances" : "Mirror list instances"}
                        </span>
                        <button
                            className="w-6 h-6 rounded-md border border-neutral-600 text-neutral-300 hover:bg-neutral-700/40"
                            onClick={() => setActiveTab("createMirror")}
                            title="Create mirror"
                        >
                            +
                        </button>
                    </div>

                    {isLoading && <span className="text-sm text-neutral-400">Loading...</span>}
                    {!isLoading && (data?.Items?.length ?? 0) === 0 && (
                        <span className="text-sm text-neutral-400">No mirror instances found.</span>
                    )}
                    {!isLoading && data?.Items?.map((item) => {
                        const isCurrentBoard = item.Board.ID === boardID
                        const itemAccessMode: BoardListAccessMode = item.BoardList.AccessMode === "readonly" ? "readonly" : "editable"
                        const isUpdating = updatingAccessModeByBoardListID[item.BoardList.ID] === true
                        return (
                            <div
                                key={item.BoardList.ID}
                                className={`w-full px-2 py-2 rounded-md transition-colors ${item.HasAccess ? "hover:bg-neutral-700/40" : "opacity-60"}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    {item.HasAccess ? (
                                        <button
                                            className="text-sm text-neutral-200 truncate text-left"
                                            onClick={() => {
                                                if (!isCurrentBoard) {
                                                    navigate(`/workspaces/${workspaceId}/boards/${item.Board.ID}`)
                                                }
                                                onClose()
                                            }}
                                        >
                                            {item.Board.Name}
                                        </button>
                                    ) : (
                                        <span className="text-sm text-neutral-400 truncate">{item.Board.Name}</span>
                                    )}
                                    <div className="flex items-center gap-1">
                                        {item.IsRoot && <span className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-600 text-neutral-300">ROOT</span>}
                                        {!item.IsRoot && <span className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-600 text-neutral-300">MIRROR</span>}
                                        {isCurrentBoard && <span className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-600 text-neutral-300">CURRENT</span>}
                                        {!item.HasAccess && (
                                            <CardRowMenuBtn
                                                enableOwnBackdrop={true}
                                                renderType="virtual"
                                                customId={`request-access-list-${item.Board.ID}`}
                                                exclusiveGroup="request-access-modal"
                                                menuComponent={({ onClose: onModalClose, ref }) =>
                                                    <RequestAccessModal ref={ref} targetType="board" targetID={item.Board.ID}
                                                        onClose={onModalClose} />
                                                }
                                            >
                                                <span className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-500 text-neutral-400 hover:bg-neutral-700/40 cursor-pointer">
                                                    Request access
                                                </span>
                                            </CardRowMenuBtn>
                                        )}
                                    </div>
                                </div>
                                {item.HasAccess && (
                                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                        <CustomDropDown
                                            btnId={`mirror-access-mode-${item.BoardList.ID}`}
                                            items={accessModeItems}
                                            activeId={itemAccessMode}
                                            onClick={(id) => {
                                                if (id !== "readonly" && id !== "editable") return
                                                void handleSetMirrorAccessMode(item.Board.ID, item.BoardList.ListID, item.BoardList.ID, id)
                                            }}
                                            showChevron={true}
                                            className="!h-9"
                                            chevronClassName="w-4 h-4"
                                            isLocked={isUpdating}
                                            disableGlobalState={true}
                                        />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {activeTab === "createMirror" && (
                <div className="text-neutral-300 h-[235px] transition-all duration-200">
                    <MoveListTab
                        sourceBoardID={boardID}
                        sourceListID={listID}
                        submitLabel="Mirror"
                        mode="mirror"
                        onSubmit={(payload) => handleMirrorSubmit(payload as MirrorBoardListRequest).then(() => onClose())}
                    />
                </div>
            )}
        </ActionMenuWrapper>
    )
}
