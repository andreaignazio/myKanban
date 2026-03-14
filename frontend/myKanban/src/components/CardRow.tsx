

import type { CardContext, CardRouteState } from "@/domain/cardContext"
import { useBoardDetailStore } from "@/stores/boardDetailStore"
import { useCardsStore } from "@/stores/cardsStore"
import { useNavigate, useLocation, useParams } from "react-router-dom"

import { useEffect, useRef, useState } from "react"

import { useLabelsStore } from "@/stores/labelsStore"
import { ArchiveIcon, SquarePenIcon } from "lucide-react"
import { CardFieldsLabels } from "./cardRowElements/CardFieldsLabels"
import { Mirrors } from "./cardRowElements/CardMirrorsField"
import { CardRowTitle } from "./cardRowElements/CardRowTitle"
import { CardRowFields } from "./cardRowElements/CardRowFields"

import { Draggable } from "@hello-pangea/dnd"

export type CardRowMode = "default" | "detailed" | "compact" | "edit"

type CardRowProps = {
    boardID?: string
    listId?: string
    listCardID?: string
    cardId?: string
    index: number
    isDragDisabled?: boolean
    source?: CardSource
    inboxCardId?: string
    rootListCardId?: string
    editMenuPrefix?: string
}

export const CardRow = ({ boardID, listId, listCardID: listCardID, cardId, index, isDragDisabled = false, source = "board", inboxCardId, rootListCardId, editMenuPrefix }: CardRowProps) => {


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


    const { cardColor, cardCoverURL, hasCover, isDetailed } = useCardBackground({ card })

    const cardHasLabels = useLabelsStore((state) => {
        if (!cardID) return false;
        if (!boardId) return false;
        const cardLabelsIds = state.cardLabelsIdsByCardIdAndBoardId[boardId]?.[cardID] ?? [];
        return cardLabelsIds.length > 0;
    })


    const mode: CardRowMode = hasCover ? (isDetailed ? "detailed" : "compact") : "default"

    const rootBoardContext = useCardRootBoardContext({
        boardId,
        source,
        listCard: listcard,
        listCardID,
        rootListCardId,
    })

    const {
        isInbox,
        isInboxMode,
        isMirrorCard,
        effectiveRootBoard,
        rootBoardBackgroundType,
        rootBoardBgImage,
        rootBoardBgColorClass,
    } = rootBoardContext

    const cardContext: CardContext = {
        cardId: cardID,
        sourceListId: listID,
        source,
        listCardId: listCardID,
        inboxCardId,
        rootListCardId,
    }

    const done = card?.Done

    const { canEdit } = useCardEditableContext({ cardContext, boardId, effectiveRootBoard })
    const isPendingCopy = (listCardID?.startsWith("copy-temp-") ?? false)



    const openCard = (cardId: string) => {
        const nextState: CardRouteState = {
            backgroundLocation: location,
            cardContext: {
                ...cardContext,
                cardId,
                openedFrom: "card-row",
            },
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

    const editMenutID = editMenuPrefix + "card-action-menu"
    function handleOpenCardActionModal() {
        // console.log("Opening respond modal for share offer");
        const id = editMenutID;
        const descriptor: OverlayDescriptor = {
            id: id,
            render: () => <CardEditMenu
                ref={ActionsMenuRef} cardContext={cardContext} onClose={() => onMenuClose(id)} menuId={id} canEdit={canEdit} />,
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
                placement: "right-start",
                offset: [8, 0],
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
        if (!cardID) return
        if (isInboxMode) {
            cardActions.setInboxCardDone(cardID, !done)
            return
        }
        if (!boardID) return
        setDone(boardID, cardID, !done, listCardID)
    }

    const rowHeight = 36

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
        if (!cardID) return
        if (isInboxMode) {
            cardActions.setInboxCardTitle(cardID, draftTitle, useAsyncKey("card:edit:title:inline", cardID))
        } else {
            if (!boardId) return
            cardActions.setCardTitle(boardId, cardID, draftTitle, useAsyncKey("card:edit:title:inline", cardID), listCardID)
        }
        setEditMode(false)
        onMenuClose(editMenutID)
    }

    const resolvedDraggableId = isInboxMode ? (`inbox:${cardId}`) : (listCardID ?? "")


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
                if (editMode || isPendingCopy) return
                openCard(cardID!)
            }}
            data-list-card-id={listCardID}
            className="relative -mt-2 pt-2 overflow-visible "
        >

            <Draggable draggableId={resolvedDraggableId} index={index} isDragDisabled={isDragDisabled || isPendingCopy}>
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
                                canEdit={canEdit}

                                ref={cardRowRef}>


                                {mode === "detailed" && (
                                    <Mirrors
                                        cardId={cardID!}
                                        listCardId={listCardID}
                                        rootBoardContext={rootBoardContext}
                                        mode={source}
                                        placement="cover"
                                    />
                                )}
                                <div className={`absolute inset-0 z-10 bg-gray-500/20 ${!canEdit ? "opacity-100" : "opacity-0"} transition-opacity ease-in-out duration-300`} />

                                <div className={`absolute inset-0 z-20 bg-black/50 ${isPendingCopy ? "opacity-100" : "opacity-0"} transition-opacity ease-in-out duration-200`} />

                                <div className="flex flex-col ">

                                    {mode !== "detailed" && <Mirrors cardId={cardID!} listCardId={listCardID} rootBoardContext={rootBoardContext} mode={source} />}

                                    <CardFieldsLabels hasLabels={cardHasLabels} cardID={cardID}
                                        boardID={boardId} mode={source}
                                    />

                                    {(!editMode || (editMode && !canEdit)) &&
                                        <CardRowTitle
                                            canEdit={canEdit}
                                            minHeight={rowHeight}
                                            title={title || ""} done={done}
                                            editMode={editMode} setDone={handleDoneToggle} />}

                                    {editMode && canEdit &&
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

                                <div className={`absolute top-[10px] right-[11px] 
                            flex flex-row gap-2
                             z-10 opacity-0 ${canEdit ? "group-hover:opacity-100" : ""} transition-all duration-200`}>

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
            <div className={` ${`/*absolute -bottom-14*/`}
                ${editMode ? "opacity-100 h-full " : "opacity-0 h-0"} transition-opacity duration-200
                ${canEdit ? "" : "filter grayscale brightness-50 pointer-events-none"}
                flex flex-row justify-start items-start ps-1`}>
                {true === true &&

                    <LabeledButtonPresetBSubmit
                        className="!w-fit px-8 !opacity-100 "
                        disabled={!canEdit}
                        label="Save"
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




import { LabeledButtonPresetBSubmit } from "./buttons/labeledButton"
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore"
import { createPortal } from "react-dom"
import { CardEditMenu } from "./modals/cardEditMenu"
import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry"
import { CardRowCoverWrapper } from "./cardRowElements/CardRowCoverWrapper"
import { useAsyncKey } from "@/stores/asyncRequestStore"
import { useCardBackground } from "@/hooks/useCardBackground"
import { useCardRootBoardContext } from "@/hooks/useCardRootBoardContext"
import type { CardSource } from "@/domain/cardContext"
import { useCardEditableContext } from "@/hooks/useCardEditableContext"



