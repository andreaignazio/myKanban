import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import type { RefObject } from "react"
import { api } from "@/api/api"
import { useListActionRegistry } from "@/actionRegistry/listActionRegistry"
import { useListsStore } from "@/stores/listsStore"
import type { BoardListAccessMode, BoardListMirrorItem, BoardListMirrorsResponse, MirrorBoardListRequest } from "@/stores/types"
import { ActionMenuWrapper, MoveListTab } from "@/components/modals/ListActionsMenu"
import { CustomDropDown, type MenuItem } from "@/components/menuElements/CustomDropDown"
import { CardRowMenuBtn } from "@/components/cardMenus/cardRowMenus"
import { RequestAccessModal } from "@/components/modals/RequestAccessModal"
import { SmallLabel } from "@/components/common/smallLabel"
import { ImageColorRenderer } from "@/components/menuElements/ImageColorRenderer"
import { useBoardBackground } from "@/hooks/useBoardBackground"
import { ExternalLink, PackagePlus } from "lucide-react"

type ListMirrorMenuV2Props = {
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

export const ListMirrorMenuV2 = ({ boardID, listID, boardListID, isRootBoardList, onClose, ref }: ListMirrorMenuV2Props) => {
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
            width={340}
            titleClassName="!text-[12px]  font-semibold"
            Title={activeTab === "instances" ? "Mirror Menu" : "Create Mirror"}
            onClose={onClose}
        >
            {activeTab === "instances" && (
                <div className="px-3 py-2 flex flex-col gap-3 max-h-[420px] overflow-y-auto scrollbar-hidden">

                    {isRootBoardList && (
                        <div className="flex flex-col gap-1 pb-2 border-b border-neutral-700">
                            <span className="text-xs text-neutral-400">External access</span>
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
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-zinc-100">Instances</span>
                            <span className=" max-w-[180px] text-xs text-neutral-400">
                                {isRootBoardList ? "Boards where this list is mirrored" : "Mirror list instances"}
                            </span>
                        </div>
                        <button
                            style={{ borderRadius: 10 }}
                            className=" transition-all duration-300 ease-in-out
                            gap-1 flex flex-row  items-center justify-center w-fit py-2 px-3
                             bg-zinc-700 rounded-md  text-neutral-300 hover:bg-neutral-700/40"
                            onClick={() => setActiveTab("createMirror")}
                            title="Create mirror"
                        >

                            <PackagePlus size={16} className="-translate-y-[0px]" />
                            <span className="text-sm font-plex font-normal">Create mirror</span>
                        </button>
                    </div>

                    {isLoading && <span className="text-sm text-neutral-400">Loading...</span>}
                    {!isLoading && (data?.Items?.length ?? 0) === 0 && (
                        <span className="text-sm text-neutral-400">No mirror instances found.</span>
                    )}
                    {!isLoading && data?.Items?.map((item) => (
                        <MirrorInstanceCard
                            key={item.BoardList.ID}
                            item={item}
                            currentBoardID={boardID}
                            isUpdating={updatingAccessModeByBoardListID[item.BoardList.ID] === true}
                            onSetAccessMode={(id) => handleSetMirrorAccessMode(item.Board.ID, item.BoardList.ListID, item.BoardList.ID, id)}
                            onClose={onClose}
                        />
                    ))}
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

type MirrorInstanceCardProps = {
    item: BoardListMirrorItem
    currentBoardID: string
    isUpdating: boolean
    onSetAccessMode: (id: BoardListAccessMode) => void
    onClose: () => void
}

const MirrorInstanceCard = ({ item, currentBoardID, isUpdating, onSetAccessMode, onClose }: MirrorInstanceCardProps) => {
    const { workspaceId, } = useParams()
    const navigate = useNavigate()
    const isCurrentBoard = item.Board.ID === currentBoardID

    const { backgroundType, backgroundColorClassName, backgroundImageUrl } = useBoardBackground({ board: item.Board })

    const itemAccessMode: BoardListAccessMode = item.BoardList.AccessMode === "readonly" ? "readonly" : "editable"

    return (
        <div
            style={{ borderRadius: 14, padding: 4 }}
            className="relative  group flex flex-col overflow-hidden w-full gap-2"
        >
            <ImageColorRenderer
                overrideClassName
                className="w-full h-full absolute inset-0 z-0"
                bgImage={backgroundImageUrl}
                bgColor={backgroundColorClassName}
                fallbackGradient={{ className: "bg-gradient-to-r from-slate-500 to-slate-700" }}
                backgroundType={backgroundType}
            />
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-black/40 to-black/10" />

            {item.HasAccess ? (
                <SmallLabel
                    className="opacity-0 group-hover:opacity-100"
                    text={isCurrentBoard ? "This board" : "Go to board"}
                    onClick={() => {
                        if (!isCurrentBoard) navigate(`/workspaces/${workspaceId}/boards/${item.Board.ID}`)
                        onClose()
                    }}
                >
                    <ExternalLink size={16} className="text-white/80 -translate-y-[1px]" />
                </SmallLabel>
            ) : (
                <CardRowMenuBtn
                    enableOwnBackdrop={true}
                    renderType="virtual"
                    customId={`request-access-list-${item.Board.ID}`}
                    exclusiveGroup="request-access-modal"
                    menuComponent={({ onClose: onModalClose, ref }) =>
                        <RequestAccessModal ref={ref} targetType="board" targetID={item.Board.ID} onClose={onModalClose} />
                    }
                >
                    <SmallLabel className="opacity-0 group-hover:opacity-100" text="Request access">
                        <ExternalLink size={16} className="text-white/80 -translate-y-[1px]" />
                    </SmallLabel>
                </CardRowMenuBtn>
            )}

            <div style={{ borderRadius: 10 }}
                className="h-full w-full relative z-10 bg-zinc-900/50 rounded-xl px-3 py-2 flex flex-row items-center justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-sm font-semibold text-zinc-100 truncate">{item.Board.Name}</span>
                    <div className="flex items-center gap-1 flex-wrap">
                        {item.IsRoot
                            ? <span className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-600 text-neutral-300">ROOT</span>
                            : <span className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-600 text-neutral-300">MIRROR</span>
                        }
                        {isCurrentBoard && <span className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-600 text-neutral-300">CURRENT</span>}
                        {!item.HasAccess && <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-700/60 text-amber-400/80">No access</span>}
                    </div>
                </div>

                {item.HasAccess && (
                    <div className="shrink-0 h-full flex items-center justify-center w-[110px]" onClick={(e) => e.stopPropagation()}>
                        <CustomDropDown
                            btnId={`mirror-access-mode-${item.BoardList.ID}`}
                            items={accessModeItems}
                            activeId={itemAccessMode}
                            onClick={(id) => {
                                if (id !== "readonly" && id !== "editable") return
                                onSetAccessMode(id)
                            }}
                            showChevron={true}
                            className="
                            transition-all duration-300 ease-in-out rounded-lg
                            !h-8 !text-xs !border-none !bg-zinc-800/50 hover:!bg-zinc-800/70"
                            chevronClassName="w-3 h-3"
                            isLocked={isUpdating}
                            disableGlobalState={true}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
