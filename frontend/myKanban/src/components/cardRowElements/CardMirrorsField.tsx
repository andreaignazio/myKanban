import { api } from "@/api/api"
import { CardRowMenuBtn } from "@/components/cardMenus/cardRowMenus"
import { ActionMenuWrapper } from "@/components/modals/ActionMenuWrapper"
import { useBuildPublicURL } from "@/hooks/useBuildPublicURL"
import { useBoardDetailStore } from "@/stores/boardDetailStore"
import { useExternalRefStore } from "@/stores/externaRefStore"
import { useUserInboxStore } from "@/stores/userInboxStore"
import type { ExternalRootRef } from "@/stores/types"
import { useEffect, useState, type RefObject } from "react"
import { useNavigate, useParams } from "react-router-dom"



type CardMirrorsFieldProps = {
    listcardID: string
    mode: "board" | "inbox-mirror" | "inbox"
    mirrors?: string[]
    placement?: "default" | "cover"
}

type ListCardMirrorReference = {
    BoardListID: string
    BoardID: string
    WorkspaceID: string
    BoardName: string
    IsRootList: boolean
    ListCardID: string
    RootListCardID: string
    ListID: string
    ListTitle: string
    CardID: string
    CardTitle: string
    IsRoot: boolean
    IsCurrent: boolean
}

type ListCardMirrorsResponse = {
    RootListCardID: string
    CurrentListCardID: string
    Items: ListCardMirrorReference[]
}

type MirrorDetailsMenuProps = {
    ref: RefObject<HTMLDivElement | null>
    boardID: string
    listCardID: string
    onClose: () => void
}

const MirrorDetailsMenu = ({ ref, boardID, listCardID, onClose }: MirrorDetailsMenuProps) => {
    const [data, setData] = useState<ListCardMirrorsResponse | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()
    const buildPublicURL = useBuildPublicURL()

    useEffect(() => {
        if (!boardID || !listCardID) {
            setError("Missing mirror reference")
            return
        }

        const fetchMirrors = async () => {
            setIsLoading(true)
            setError(null)
            try {
                const response = await api.get<ListCardMirrorsResponse>(`/boards/${boardID}/listcards/${listCardID}/mirrors`)
                setData(response.data)
            } catch {
                setError("Unable to load mirror references")
            } finally {
                setIsLoading(false)
            }
        }

        void fetchMirrors()
    }, [boardID, listCardID])

    return (
        <ActionMenuWrapper
            ref={ref}
            Title="Mirror References"
            onClose={onClose}
            width={360}
        >
            <div className="px-3 py-2 flex flex-col gap-2 max-h-[330px] overflow-y-auto scrollbar-hidden">
                {isLoading && <span className="text-sm text-neutral-400">Loading...</span>}
                {!isLoading && error && <span className="text-sm text-rose-300">{error}</span>}
                {!isLoading && !error && (data?.Items?.length ?? 0) === 0 && (
                    <span className="text-sm text-neutral-400">No mirror references found.</span>
                )}

                {!isLoading && !error && data?.Items?.map((item) => {
                    const boardURL = buildPublicURL.buildPublicURLFromBoardID(item.WorkspaceID, item.BoardID)
                    const cardURL = buildPublicURL.buildPublicURLFromCardID(item.WorkspaceID, item.BoardID, item.CardID)

                    return (
                        <div key={item.ListCardID} className="rounded-md border border-neutral-700/70 p-2 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm text-neutral-200 truncate">{item.BoardName || "Unknown Board"}</span>
                                <div className="flex items-center gap-1">
                                    {item.IsRoot && <span className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-600 text-neutral-300">ROOT</span>}
                                    {item.IsCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-600 text-neutral-300">CURRENT</span>}
                                </div>
                            </div>
                            <div className="text-xs text-neutral-400 truncate flex items-center gap-1">
                                <span className="truncate">{item.ListTitle || "Untitled List"}</span>
                                <span className="text-[10px] px-1 py-0.5 rounded border border-neutral-600 text-neutral-300">
                                    {item.IsRootList ? "ROOT LIST" : "MIRROR LIST"}
                                </span>
                                <span>·</span>
                                <span className="truncate">{item.CardTitle || "Untitled Card"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    className="text-xs px-2 py-1 rounded border border-neutral-600 text-neutral-300 hover:bg-neutral-700/40"
                                    onClick={() => {
                                        navigate(boardURL)
                                        onClose()
                                    }}
                                >
                                    Open Board
                                </button>
                                <button
                                    className="text-xs px-2 py-1 rounded border border-neutral-600 text-neutral-300 hover:bg-neutral-700/40"
                                    onClick={() => {
                                        navigate(cardURL)
                                        onClose()
                                    }}
                                >
                                    Open Card
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </ActionMenuWrapper>
    )
}

export const Mirrors = ({ listcardID, mode, mirrors, placement = "default" }: CardMirrorsFieldProps) => {
    const getInboxCardByRootCardID = useUserInboxStore((state) => state.getInboxCardByRootCardID)
    const listcardById = useBoardDetailStore((state) => state.listCardById)
    const isListCardInBoard = useBoardDetailStore((state) => state.isListCardInBoard)
    const rootsByRootId = useExternalRefStore((state) => state.rootsByRootId)

    const inboxCardMirrors = (listcardID: string) => {
        const inboxCard = getInboxCardByRootCardID(listcardID)
        return mirrors ? mirrors : inboxCard ? inboxCard.Mirrors || [] : []
    }

    const boardListcardMirrors = listcardById[listcardID]?.Mirrors || []

    const mirrorIds = mode === "board" ? boardListcardMirrors : inboxCardMirrors(listcardID)
    const { boardId } = useParams<{ workspaceId?: string; boardId?: string }>()
    const boardID = boardId ?? ""

    const listcard = listcardById[listcardID]
    const rootListCardID = mode === "inbox-mirror"
        ? listcardID
        : (listcard?.RootID || listcardID)

    const externalRoot: ExternalRootRef | undefined = rootListCardID ? rootsByRootId[rootListCardID] : undefined
    const isRoot = rootListCardID === listcardID
    const isRootInCurrentBoard = rootListCardID && boardID
        ? isListCardInBoard(rootListCardID, boardID)
        : false

    const badgeCode = mode === "inbox-mirror" ? "I" : isRoot ? "R" : isRootInCurrentBoard ? "M" : "E"
    const hoverBoardName = externalRoot?.BoardName?.trim() ? externalRoot.BoardName : undefined
    const fetchBoardID = boardID || externalRoot?.BoardID || ""
    const fetchListCardID = mode === "board" ? listcardID : rootListCardID
    const menuId = `card-mirror-menu-${mode}-${fetchBoardID}-${fetchListCardID}`
    const wrapperClassName = placement === "cover"
        ? "absolute top-1 left-2 z-20 text-white"
        : "bg-transparent text-white pt-3 px-3"

    if (mirrorIds.length === 0) return null

    if (mode === "inbox") {
        return null
    }

    if (!fetchBoardID || !fetchListCardID) {
        return (
            <div className={wrapperClassName}>
                <div
                    title={hoverBoardName}
                    className="w-6 h-6 flex items-center justify-center rounded-md border border-neutral-400/70 bg-neutral-700/45 text-[11px] font-semibold"
                >
                    {badgeCode}
                </div>
            </div>
        )
    }

    return (
        <div className={wrapperClassName}>
            <CardRowMenuBtn
                customId={menuId}
                desiredBackdropOpacity={0}
                placement="bottom-start"
                menuComponent={({ ref, onClose }) => (
                    <MirrorDetailsMenu
                        ref={ref}
                        boardID={fetchBoardID}
                        listCardID={fetchListCardID}
                        onClose={onClose}
                    />
                )}
            >
                <div
                    title={hoverBoardName}
                    className="w-6 h-6 flex items-center justify-center rounded-md border border-neutral-400/70 bg-neutral-700/45 text-[11px] font-semibold cursor-pointer hover:bg-neutral-700/70"
                >
                    {badgeCode}
                </div>
            </CardRowMenuBtn>
        </div>

    )
}