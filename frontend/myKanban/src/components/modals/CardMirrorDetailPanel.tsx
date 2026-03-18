import { forwardRef, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { useShallow } from "zustand/shallow";
import { CommonMenuWrapper } from "../menuElements/menuWrapper";
import { DummyMirrorUI } from "../cardRowElements/CardMirrorsField";
import { useCardMirrorsStore } from "@/stores/cardMirrorsStore";
import { useBoardBackground } from "@/hooks/useBoardBackground";
import { useUserStore } from "@/stores/userStore";
import { useDateTimeParser } from "@/hooks/useDateTimeParser";

const EMPTY_IDS: string[] = [];

// ─── MirrorListItem ─────────────────────────────────────────────────────────

type MirrorListItemProps = {
    mirrorId: string
    isSelected: boolean
    onSelect: () => void
}

const MirrorListItem = ({ mirrorId, isSelected, onSelect }: MirrorListItemProps) => {
    const { mirrorCardData, boardsById, listsById, listcardsById } = useCardMirrorsStore(useShallow(
        state => ({
            mirrorCardData: state.mirrorCardDataByBoardListCardId[mirrorId] ?? null,
            boardsById: state.boardsById,
            listsById: state.listsById,
            listcardsById: state.listcardsById,
        })
    ))
    const mirrorData = useMemo(() => {
        if (!mirrorCardData) return null

        const board = boardsById[mirrorCardData.BoardID]
        const list = listsById[mirrorCardData.ListID]
        const listCard = listcardsById[mirrorCardData.ListCardID]
        if (!board || !list || !listCard) return null

        return {
            board,
            list,
            isRootBoardCard: listCard.ID === listCard.RootID,
        }
    }, [mirrorCardData, boardsById, listsById, listcardsById])
    const { backgroundType, backgroundColorClassName, backgroundImageUrl } = useBoardBackground({ board: mirrorData?.board })

    if (!mirrorData) return null

    return (
        <div
            onClick={onSelect}
            className={`w-full cursor-pointer rounded-lg p-2 transition-all duration-150
                ${isSelected
                    ? 'bg-fuchsia-500/20 ring-1 ring-fuchsia-400/40'
                    : 'hover:bg-neutral-500/10'
                }`}
        >
            <DummyMirrorUI
                name={mirrorData.board.Name}
                detailLabel={mirrorData.list.Title}
                bgImage={backgroundImageUrl}
                bgColorClass={backgroundColorClassName}
                bgColorType={backgroundType === "color" ? "color" : backgroundType === "image" ? "image" : null}
                wrapperClassName="w-full"
                className="!w-full !max-w-none !h-[36px] !pe-3 !gap-2"
                imageSize="32px"
                nameClassName="!text-[11px]"
                labelClassName="!text-[9px]"
            />
            {mirrorData.isRootBoardCard && (
                <div className="mt-0.5 px-1">
                    <span className="text-[9px] text-amber-400/70 font-semibold tracking-wide uppercase">Primary</span>
                </div>
            )}
        </div>
    )
}

// ─── SelectedMirrorDescription ───────────────────────────────────────────────

const SelectedMirrorDescription = ({ mirrorId }: { mirrorId: string }) => {
    const usersById = useUserStore(state => state.usersById)
    const { mirrorCardData, boardsById, listsById, listcardsById } = useCardMirrorsStore(useShallow(state => ({
        mirrorCardData: state.mirrorCardDataByBoardListCardId[mirrorId] ?? null,
        boardsById: state.boardsById,
        listsById: state.listsById,
        listcardsById: state.listcardsById,
    })))
    const data = useMemo(() => {
        if (!mirrorCardData) return null

        const board = boardsById[mirrorCardData.BoardID]
        const list = listsById[mirrorCardData.ListID]
        const listCard = listcardsById[mirrorCardData.ListCardID]
        if (!board || !list || !listCard) return null

        return {
            boardName: board.Name,
            listTitle: list.Title,
            creatorUserID: mirrorCardData.UserID,
            createdAt: listCard.CreatedAt,
            isRoot: listCard.ID === listCard.RootID,
        }
    }, [mirrorCardData, boardsById, listsById, listcardsById])
    const dateParser = useDateTimeParser()

    if (!data) return null

    const creatorUser = data.creatorUserID ? usersById[data.creatorUserID] : null
    const creatorName = creatorUser?.Name
    const createdAtDate = data.createdAt ? new Date(data.createdAt) : null
    const formattedCreatedAt = createdAtDate
        ? dateParser.stringifyDatePretty(createdAtDate, true)?.date ?? ""
        : ""

    return (
        <div className="flex flex-col gap-4 items-end w-full">
            <div className="h-px bg-neutral-400/20 w-full" />
            <div className="text-sm text-neutral-400/80 text-right leading-relaxed">
                {data.isRoot ? (
                    <>Original card on board{' '}
                        <span className="text-neutral-200 font-medium">{data.boardName}</span>
                    </>
                ) : (
                    <>Card mirrored from board{' '}
                        <span className="text-neutral-200 font-medium">{data.boardName}</span>
                        {creatorName && (
                            <>{' '}by{' '}<span className="text-neutral-200 font-medium">{creatorName}</span></>
                        )}
                        {formattedCreatedAt && (
                            <>{' '}on{' '}<span className="text-neutral-200 font-medium">{formattedCreatedAt}</span></>
                        )}
                    </>
                )}
            </div>
            <div className="h-px bg-neutral-400/20 w-full" />
            <div className="text-xs text-neutral-500/80 text-right">
                in list <span className="text-neutral-300">{data.listTitle}</span>
            </div>
        </div>
    )
}

// ─── CardMirrorDetailPanel ───────────────────────────────────────────────────

export type CardMirrorDetailPanelProps = {
    cardId: string
    onClose: () => void
}

export const CardMirrorDetailPanel = forwardRef<HTMLDivElement, CardMirrorDetailPanelProps>(
    ({ cardId, onClose }, ref) => {
        const workspaceId = useParams().workspaceId as string
        const fetchMirrorData = useCardMirrorsStore(state => state.fetchCardMirrors)
        const fetchUsersByIDs = useUserStore(state => state.fetchUsersByIDs)

        const boardListCardIds = useCardMirrorsStore(useShallow(
            state => state.boardListCardIdsByCardId[cardId] ?? EMPTY_IDS
        ))
        const mirrorCardDataById = useCardMirrorsStore(useShallow(state => state.mirrorCardDataByBoardListCardId))
        const listcardsById = useCardMirrorsStore(useShallow(state => state.listcardsById))

        useEffect(() => {
            if (!cardId || !workspaceId) return
            void fetchMirrorData(workspaceId, cardId).then(() => {
                const s = useCardMirrorsStore.getState()
                const ids = s.boardListCardIdsByCardId[cardId] ?? []
                const userIDs = [...new Set(
                    ids.map(id => s.mirrorCardDataByBoardListCardId[id]?.UserID).filter(Boolean) as string[]
                )]
                if (userIDs.length > 0) void fetchUsersByIDs(userIDs)
            })
        }, [cardId, workspaceId, fetchMirrorData, fetchUsersByIDs])

        const sortedIds = useMemo(() => {
            return [...boardListCardIds].sort((a, b) => {
                const lcA = listcardsById[mirrorCardDataById[a]?.ListCardID ?? '']
                const lcB = listcardsById[mirrorCardDataById[b]?.ListCardID ?? '']
                const isRootA = !!(lcA?.ID && lcA.ID === lcA.RootID)
                const isRootB = !!(lcB?.ID && lcB.ID === lcB.RootID)
                if (isRootA && !isRootB) return -1
                if (!isRootA && isRootB) return 1
                const timeA = lcA ? new Date(lcA.CreatedAt).getTime() : 0
                const timeB = lcB ? new Date(lcB.CreatedAt).getTime() : 0
                return timeA - timeB
            })
        }, [boardListCardIds, mirrorCardDataById, listcardsById])

        const [selectedId, setSelectedId] = useState<string | null>(null)

        useEffect(() => {
            if (sortedIds.length === 0) {
                if (selectedId !== null) {
                    setSelectedId(null)
                }
                return
            }

            if (!selectedId || !sortedIds.includes(selectedId)) {
                setSelectedId(sortedIds[0])
            }
        }, [selectedId, sortedIds])

        return (
            <CommonMenuWrapper
                ref={ref}
                onClose={onClose}
                style={{ height: 380 }}
                className="!rounded-2xl
                !bg-[rgba(36,37,40,1)] !flex !flex-row !w-fit !p-0 !overflow-visible"
            >
                {/* Left: mirror list */}
                <div style={{ boxShadow: "8px 0 12px 6px rgba(0,0,0,0.1)" }}
                    className=" w-[260px] h-full flex flex-col gap-2 bg-fuchsia-500/10 
                ring-inset ring-2 ring-fuchsia-400/20 
                    border-2 border-fuchsia-500/20 rounded-2xl p-4">
                    <div className="text-sm font-normal font-grotesk text-neutral-200">Mirrored on</div>
                    <div className="h-px bg-neutral-400/20 w-full" />
                    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden flex flex-col gap-1 pt-1 px-1">
                        {sortedIds.length === 0 && (
                            <div className="text-xs text-neutral-500 mt-4 text-center">No mirrors found</div>
                        )}
                        {sortedIds.map(id => (
                            <MirrorListItem
                                key={id}
                                mirrorId={id}
                                isSelected={id === selectedId}
                                onSelect={() => setSelectedId(id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Right: description */}
                <div className="flex flex-col flex-1 items-end justify-end gap-4 h-full p-6 pb-8 
                w-[280px]">
                    {selectedId ? (
                        <SelectedMirrorDescription mirrorId={selectedId} />
                    ) : (
                        <div className="text-sm text-neutral-500 text-center w-full">Select a mirror to see details</div>
                    )}
                </div>
            </CommonMenuWrapper>
        )
    }
)
