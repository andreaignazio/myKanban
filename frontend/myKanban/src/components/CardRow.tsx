

import { useBoardDetailStore, type ListCard } from "@/stores/boardDetailStore"
import { useCardsStore } from "@/stores/cardsStore"
import { useNavigate, useLocation, useParams } from "react-router-dom"

import { TrashIcon } from "@heroicons/react/24/outline"
import { use, useEffect, useRef, useState } from "react"

import type { Board, Card } from "@/stores/types"
import { useLabelsStore } from "@/stores/labelsStore"
import { useUserWatchStore } from "@/stores/userWatchStore"
import { ArchiveIcon, Clock, EyeIcon, List, SquareCheckBig, SquarePenIcon, TextAlignStartIcon } from "lucide-react"
import type { Location as RouterLocation } from "react-router-dom"
import { CardFieldsLabels } from "./cardRowElements/CardFieldsLabels"
import { Mirrors } from "./cardRowElements/CardMirrorsField"
import { CardRowTitle } from "./cardRowElements/CardRowTitle"
import { CardRowFields } from "./cardRowElements/CardRowFields"

import { Draggable } from "@hello-pangea/dnd"

export type CardRouteState = {
    backgroundLocation: RouterLocation
    sourceListId: string
    openedFrom?: "card-row" | "direct-url" | "card-edit-menu"
}

export type CardRowMode = "default" | "detailed" | "compact" | "edit"

type CardRowProps = {
    boardID?: string
    listId?: string
    listCardID?: string
    cardId?: string
    index: number
    isDragDisabled?: boolean
    source?: "board" | "inbox" | "inbox-mirror"
    inboxCardId?: string
    rootListCardId?: string
}

function getStableIndexFromString(value: string, length: number): number {
    if (length <= 0) return 0

    let hash = 0
    for (let index = 0; index < value.length; index++) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0
    }

    return hash % length
}

export const CardRow = ({ boardID, listId, listCardID: listCardID, cardId, index, isDragDisabled = false, source = "board", inboxCardId, rootListCardId }: CardRowProps) => {

    const isInbox = source === "inbox"

    const [editMode, setEditMode] = useState(false)
    //const boardId = useParams().boardId as string
    const cardsStore = useCardsStore()

    const listCardsById = useBoardDetailStore((state) => state.listCardById)
    const listcard = listCardsById[listCardID ?? ""]

    const navigate = useNavigate()

    const location = useLocation()
    let { workspaceId, boardId } = useParams<{ workspaceId: string; boardId: string }>()

    boardId = boardID ?? boardId

    const listID = listId ?? listcard?.ListID ?? ""
    const cardID = cardId ?? listCardsById[listCardID ?? ""]?.CardID ?? ""
    const card = useCardsStore(state => state.cardsById[cardID ?? ""])
    const title = card?.Title

    //console.log("CardRow:ListCardID:", listCardID, "CardID:", cardID, "Title:", title)
    function handleRemoveCard(e: React.MouseEvent) {
        if (!boardID || !listID || !cardID) return
        e.stopPropagation()
        cardsStore.removeCardFromList(boardID, listID, cardID)
    }

    function handleRemoveInboxCard(e: React.MouseEvent) {
        if (!cardID) return
        e.stopPropagation()
        //  cardsStore.removeCardFromInbox(cardID)
    }

    const cardColor = card?.Props?.Props?.Display?.Cover?.Type === "color" ? card.Props.Props.Display.Cover.Color : undefined;
    const cardCoverURL = card?.Props?.Props?.Display?.Cover?.Type === "image" ? card.Props.Props.Display.Cover.URL : undefined;
    //const cardHasCover = !!card?.Props?.Props?.Display?.Cover;
    const hasCover = !!card?.Props?.Props?.Display?.Cover
    const coverSize = card?.Props?.Props?.Display?.Size
    const isDetailed = hasCover && coverSize === "large"

    const cardHasLabels = useLabelsStore((state) => {
        if (!cardID) return false;
        if (!boardId) return false;
        const cardLabelsIds = state.cardLabelsIdsByCardIdAndBoardId[boardId]?.[cardID] ?? [];
        return cardLabelsIds.length > 0;
    })


    const mode: CardRowMode = hasCover ? (isDetailed ? "detailed" : "compact") : "default"

    const effectiveListCardID = listcard?.ID ?? listCardID ?? rootListCardId ?? ""
    const resolvedRootListCardID = source === "inbox-mirror"
        ? (rootListCardId ?? effectiveListCardID)
        : (listcard?.RootID ?? rootListCardId ?? effectiveListCardID)
    const isMirrorCard = !!effectiveListCardID && !!resolvedRootListCardID && effectiveListCardID !== resolvedRootListCardID


    /*
    const rootBoardID = isMirrorCard ? (boardId ?? boardID ?? "") : ""
    const rootBoard = useBoardsStore((state) => rootBoardID ? state.boardsById[rootBoardID] : undefined)
    const rootBoardBackgroundType = rootBoard?.Props?.Background?.Type ?? null
    const rootBoardBgImage = rootBoardBackgroundType === "image" ? rootBoard?.Props?.Background?.Image?.Url : undefined
    const rootBoardBgColorToken = rootBoardBackgroundType === "color" ? rootBoard?.Props?.Background?.Color?.Token : undefined
    const rootBoardBgColorClass = rootBoardBgColorToken ? getClassNamesForColorToken(rootBoardBgColorToken) : undefined
    const fallbackIndex = getStableIndexFromString(rootBoard?.ID ?? rootBoardID ?? "fallback", gradientColorTokens.length)
    const rootBoardFallbackGradientClass = gradientColorTokens[fallbackIndex]?.className*/


    const done = card?.Done



    const openCard = (cardId: string) => {
        const nextState: CardRouteState = {
            backgroundLocation: location,
            sourceListId: listID,
            openedFrom: "card-row"
        }
        navigate(
            `/workspaces/${workspaceId}/boards/${boardId}/cards/${cardId}`,
            { state: nextState } // chiave del pattern
        );
    };






    const cardRowRef = useRef<HTMLDivElement>(null)

    const handleCardEditMode = () => {
        setEditMode(true)
        handleOpenCardActionModal()

    }

    const openOverlay = useOverlayStore((state) => state.open);
    const onMenuClose = useOverlayStore((state) => state.close);

    const ActionsMenuRef = useRef<HTMLDivElement>(null)
    const anchorRef = useRef<HTMLDivElement>(null)

    const editMenutID = "card-action-menu"
    function handleOpenCardActionModal() {
        // console.log("Opening respond modal for share offer");
        const id = editMenutID;
        const descriptor: OverlayDescriptor = {
            id: id,
            render: () => <CardEditMenu
                ref={ActionsMenuRef} cardID={cardID} listId={listID} onClose={() => onMenuClose(id)} menuId={id} />,
            anchorRef: cardRowRef,
            panelRef: ActionsMenuRef,
            type: "modal",
            renderType: "anchored",
            exclusiveGroup: "share-action-modal",
            opts: {
                closeOnMouseLeave: false,
                closeOnClickOutside: true,
                closeOnEscape: true,
                lockBackdrop: true,
            },
            position: {
                placement: "left-start",
            },
            desiredBackdropOpacity: 0.8,
        }
        openOverlay(descriptor);
    }

    const isActiveOverlay = useOverlayStore((state) => state.isActive)
    const overlayStack = useOverlayStore((state) => state.stack)
    useEffect(() => {
        if (!isActiveOverlay(editMenutID)) {
            setEditMode(false)
        }
    }, [editMode, isActiveOverlay, overlayStack])

    const cardActions = useCardActionRegistry();
    const setDone = cardActions.setCardDone

    const handleDoneToggle = () => {
        if (!cardID || !boardID) return
        setDone(boardID, cardID, !done)
    }

    const rowHeight = 36

    const fetchRootBoardForListcardId = useBoardDetailStore((state) => state.fetchRootBoardForListcardId)
    const getRootBoardForListcardId = useBoardDetailStore((state) => state.getRootBoardForListCardId)
    const rootBoardIdByListCardId = useBoardDetailStore((state) => state.rootBoardIdByListCardId)
    const invalidatedRootBoardListCardIds = useBoardDetailStore((state) => state.invalidatedRootBoardListCardIds)
    const [effectiveRootBoard, setEffectiveRootBoard] = useState<Board | undefined>(undefined)

    const [isValidRootBoard, setIsValidRootBoard] = useState(false)
    const isRootBoardCacheInvalidated = !!effectiveListCardID && !!invalidatedRootBoardListCardIds[effectiveListCardID]


    useEffect(() => {
        if (!isMirrorCard) return
        if (!effectiveListCardID) return
        if (!boardId) return

        if (effectiveRootBoard && isValidRootBoard && !isRootBoardCacheInvalidated) return

        fetchRootBoardForListcardId(boardId, effectiveListCardID)
    }, [effectiveListCardID, boardId, fetchRootBoardForListcardId, isMirrorCard, effectiveRootBoard, isValidRootBoard, isRootBoardCacheInvalidated])

    useEffect(() => {
        if (!effectiveListCardID) return
        if (!boardId) return
        if (!isMirrorCard) {
            setEffectiveRootBoard(undefined)
            setIsValidRootBoard(false)
            return
        }

        const rootBoard = getRootBoardForListcardId(effectiveListCardID)
        if (rootBoard) {
            setEffectiveRootBoard(rootBoard)
            setIsValidRootBoard(true)
        } else {
            setIsValidRootBoard(false)
        }
    }, [effectiveListCardID, boardId, getRootBoardForListcardId, rootBoardIdByListCardId, isMirrorCard])


    const { backgroundType: rootBoardBackgroundType, backgroundImageUrl: rootBoardBgImage, backgroundColorClassName: rootBoardBgColorClass, } = useBoardBackground({ board: effectiveRootBoard })

    const [draftTitle, setDraftTitle] = useState(card?.Title ?? "")
    const titleInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setDraftTitle(card?.Title ?? "")
    }, [card?.Title])

    useEffect(() => {
        if (!editMode) return
        const inputEl = titleInputRef.current
        if (!inputEl) return
        inputEl.focus()
        inputEl.select()
    }, [editMode])

    const onSubmitTitle = () => {
        if (!cardID || !boardId) return
        cardActions.setCardTitle(boardId, cardID, draftTitle, useAsyncKey("card:edit:title:inline", cardID))
        setEditMode(false)
        onMenuClose(editMenutID)
    }


    return (


        <div
            onContextMenu={(e) => {
                e.preventDefault()
                handleCardEditMode()
            }

            }
            style={{
                zIndex: editMode ? 1000 : 0,
            }}
            onClick={() => {
                if (editMode) return
                openCard(cardID!)
            }}
            data-list-card-id={listCardID}
            className="relative -mt-2 pt-2  "
        >

            <Draggable draggableId={listCardID ?? inboxCardId ?? ""} index={index} isDragDisabled={isDragDisabled}>
                {(provided, snapshot) => {
                    const draggableNode = (
                        <div
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            ref={provided.innerRef}
                            className="flex flex-col pb-2"
                            style={{
                                ...provided.draggableProps.style,
                                zIndex: snapshot.isDragging ? 9999 : undefined,
                            }}>


                            <CardRowCoverWrapper mode={mode}
                                cardColor={cardColor}
                                cardCoverURL={cardCoverURL}
                                showMirrorBackdrop={isMirrorCard}
                                mirrorBackdropBackgroundType={rootBoardBackgroundType}
                                mirrorBackdropBgImage={rootBoardBgImage}
                                mirrorBackdropBgColorClass={rootBoardBgColorClass}

                                ref={cardRowRef}>


                                {mode === "detailed" && (
                                    <Mirrors
                                        cardId={cardID!}
                                        listCardId={listCardID}
                                        board={effectiveRootBoard}
                                        mode={source}
                                        placement="cover"
                                    />
                                )}

                                <div className="flex flex-col ">

                                    {mode !== "detailed" && <Mirrors cardId={cardID!} listCardId={listCardID} board={effectiveRootBoard} mode={source} />}

                                    <CardFieldsLabels hasLabels={cardHasLabels} cardID={cardID}
                                        boardID={boardId} mode={source}
                                    />

                                    {!editMode &&
                                        <CardRowTitle
                                            minHeight={rowHeight}
                                            title={title || ""} done={done}
                                            editMode={editMode} setDone={handleDoneToggle} />}

                                    {editMode &&
                                        <div style={{ minHeight: rowHeight }}
                                            className="flex flex-col gap-1">
                                            <input
                                                ref={titleInputRef}
                                                autoFocus
                                                value={draftTitle}
                                                onChange={(e) => setDraftTitle(e.target.value)}
                                                className="bg-transparent
                                                px-2 py-2 rounded focus:outline-none text-sm" />
                                        </div>}
                                </div>

                                <CardRowFields cardID={cardID!} />

                                <div className="absolute top-[10px] right-[11px] 
                            flex flex-row gap-2
                             z-10 opacity-0 group-hover:opacity-100 transition-all duration-200">

                                    <ArchiveIcon className="w-5 h-5 text-neutral-300 cursor-pointer "
                                        onClickCapture={(e) => {
                                            e.stopPropagation()
                                            if (isInbox) {
                                                handleRemoveInboxCard(e)
                                            } else {
                                                handleRemoveCard(e)
                                            }
                                        }}

                                    />

                                    <SquarePenIcon className="w-5 h-5 text-neutral-300 cursor-pointer"
                                        onClickCapture={(e) => {
                                            e.stopPropagation()
                                            handleCardEditMode()
                                        }}
                                    />


                                </div>

                            </CardRowCoverWrapper>
                        </div>
                    )

                    if (snapshot.isDragging) {
                        return createPortal(draggableNode, document.body)
                    }

                    return draggableNode
                }}
            </Draggable>
            <div>
                {editMode === true &&

                    <LabeledButtonPresetBSubmit label="Save"
                        onClick={() => { }}
                        onPointerDownCapture={(e) => {
                            e.stopPropagation()
                        }}
                        onClickCapture={
                            (e) => {
                                e.stopPropagation()
                                onSubmitTitle()
                            }}
                    />
                }
            </div>
        </div>


    )
}





const EMPTY_IDS: string[] = []



import { useDateTimeParser } from "@/hooks/useDateTimeParser"
import { useChecklistStore } from "@/stores/checklistStore"

import { useShallow } from "zustand/shallow"
import { useCardMembersStore } from "@/stores/CardMembersStore"
import { UserAvatar } from "./badges/UserAvatar"
import { useUserStore } from "@/stores/userStore"
import { LabeledButtonPresetBSubmit } from "./buttons/labeledButton"
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore"
import { createPortal } from "react-dom"
import { ListActionsMenu } from "./modals/ListActionsMenu"
import { CardEditMenu } from "./modals/cardEditMenu"
import { useBuildPublicURL } from "@/hooks/useBuildPublicURL"
import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry"
import { CardRowCoverWrapper } from "./cardRowElements/CardRowCoverWrapper"
import { useBoardsStore } from "@/stores/boardsStore"
import { getClassNamesForColorToken, gradientColorTokens } from "@/domain/colorTokens"
import { useBoardBackground } from "@/hooks/useBoardBackground"
import { useAsyncKey } from "@/stores/asyncRequestStore"



