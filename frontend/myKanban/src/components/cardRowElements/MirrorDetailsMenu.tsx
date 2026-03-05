import { api } from "@/api/api"
import { ActionMenuWrapper } from "@/components/modals/ActionMenuWrapper"
import { useBoardBackground, useBoardBg } from "@/hooks/useBoardBackground"

import { useBuildPublicURL } from "@/hooks/useBuildPublicURL"

import { useEffect, useState, type RefObject } from "react"
import { useNavigate, useParams } from "react-router-dom"


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

export type MirrorDetailsMenuProps = {
    ref: RefObject<HTMLDivElement | null>
    boardID: string
    listCardID: string
    onClose: () => void
}

function getStableIndexFromString(value: string, length: number): number {
    if (length <= 0) return 0

    let hash = 0
    for (let index = 0; index < value.length; index++) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0
    }

    return hash % length
}

export const MirrorDetailsMenu = ({ ref, boardID, listCardID, onClose }: MirrorDetailsMenuProps) => {
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

    const useBoardBack = useBoardBg();

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

                {data?.Items?.map((item) => {
                    const boardURL = buildPublicURL.buildPublicURLFromBoardID(item.WorkspaceID, item.BoardID)
                    const cardURL = buildPublicURL.buildPublicURLFromCardID(item.WorkspaceID, item.BoardID, item.CardID)



                    return (
                        <MirrorEntityRow
                            key={item.ListCardID}
                            item={item}
                            navigate={navigate}
                            onClose={onClose}
                            boardURL={boardURL}
                            cardURL={cardURL}
                            isLoading={isLoading}
                            error={error}
                        />
                    )
                })}
            </div>
        </ActionMenuWrapper>
    )
}



type MirrorEntityRowProps = {
    item: ListCardMirrorReference;

    navigate: ReturnType<typeof useNavigate>;
    onClose: () => void;
    boardURL: string;
    cardURL: string;
    isLoading?: boolean;
    error?: string | null;
}
const MirrorEntityRow = ({ item, navigate, onClose, boardURL, cardURL, isLoading, error }: MirrorEntityRowProps) => {

    const { resolvedColor } = useBoardBg().useBoardBackground({ boardId: item.BoardID })
    if (isLoading || error) return null;
    return (
        <div className=" relative">
            <div className="absolute z-0 left-1/2 -bottom-0.5 -translate-x-1/2 w-[310px] h-[85px] rounded-lg"
                style={{
                    backgroundColor: resolvedColor ?? undefined,
                    boxShadow: resolvedColor ? `0 0 0 2px ${resolvedColor}` : undefined,
                }} />
            <div key={item.ListCardID}


                className={`relative ms-1 z-10 rounded-xl transition-all duration-200 ease-in-out 
           bg-menusec shadow-md shadow-black/20
            border border-neutral-700/20 p-2 flex flex-col gap-2`}>
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
        </div>
    )
}