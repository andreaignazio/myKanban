

import { useBoardDetailStore, type ListCard } from "@/stores/boardDetailStore"
import { useCardsStore } from "@/stores/cardsStore"
import { useNavigate, useLocation, useParams } from "react-router-dom"
import type { CardContext } from "@/domain/cardContext"

import { TrashIcon } from "@heroicons/react/24/outline"
import { useEffect, useRef, useState } from "react"

import type { Card } from "@/stores/types"
import { useLabelsStore } from "@/stores/labelsStore"
import { useUserWatchStore } from "@/stores/userWatchStore"
import { ArchiveIcon, Clock, EyeIcon, List, SquareCheckBig, SquarePenIcon, TextAlignStartIcon } from "lucide-react"
import type { Location as RouterLocation } from "react-router-dom"
import { CardFieldsLabels } from "./cardRowElements/CardFieldsLabels"
import { Mirrors } from "./cardRowElements/CardMirrorsField"
import { CardRowTitle } from "./cardRowElements/CardRowTitle"
import { CardRowFields } from "./cardRowElements/CardRowFields"
import { useCardRootBoardContext } from "@/hooks/useCardRootBoardContext"

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
    listCardID: string
    cardId?: string
    index: number
    isDragDisabled?: boolean
}

export const CardRow = ({ boardID, listId, listCardID: listCardID, cardId, index, isDragDisabled = false }: CardRowProps) => {

    const [editMode, setEditMode] = useState(false)
    //const boardId = useParams().boardId as string
    const cardsStore = useCardsStore()

    const listCardsById = useBoardDetailStore((state) => state.listCardById)
    const listcard = listCardsById[listCardID]
    const navigate = useNavigate()
    const location = useLocation()
    const { workspaceId, boardId } = useParams<{ workspaceId: string; boardId: string }>()


    const listID = listId ?? listcard?.ListID
    const cardID = cardId ?? listCardsById[listCardID]?.CardID
    const card = useCardsStore(state => state.cardsById[cardID!])
    const title = card?.Title

    //console.log("CardRow:ListCardID:", listCardID, "CardID:", cardID, "Title:", title)
    function handleRemoveCard(e: React.MouseEvent) {
        if (!boardID || !listID || !cardID) return
        e.stopPropagation()
        cardsStore.removeCardFromList(boardID, listID, cardID)
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
    const rootBoardContext = useCardRootBoardContext({
        boardId,
        source: "board",
        listCard: listcard,
        listCardID,
    })


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
        const cardContext: CardContext = {
            cardId: cardID,
            sourceListId: listID,
            source: "board",
            listCardId: listCardID,
        }
        // console.log("Opening respond modal for share offer");
        const id = editMenutID;
        const descriptor: OverlayDescriptor = {
            id: id,
            render: () => <CardEditMenu ref={ActionsMenuRef} cardContext={cardContext} onClose={() => onMenuClose(id)} />,
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

    return (


        <div

            style={{
                zIndex: editMode ? 1000 : 0,
            }}
            onClick={() => openCard(cardID!)}
            data-list-card-id={listCardID}
            className="relative -mt-2 pt-2 "
        >

            <Draggable draggableId={listCardID} index={index} isDragDisabled={isDragDisabled}>
                {(provided) => (
                    <div
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        ref={provided.innerRef}
                        className="flex flex-col pb-2">


                        <CardRowCoverWrapper mode={mode}
                            cardColor={cardColor}
                            cardCoverURL={cardCoverURL} ref={cardRowRef}>

                            <div className="flex flex-col ">
                                <Mirrors cardId={cardID!} listCardId={listcard.ID} rootBoardContext={rootBoardContext} mode={"board"} />
                                <CardFieldsLabels hasLabels={cardHasLabels} cardID={cardID} />
                                <CardRowTitle
                                    minHeight={rowHeight}
                                    title={title || ""} done={done}
                                    editMode={editMode} setDone={handleDoneToggle} />
                            </div>
                            <CardRowFields cardID={cardID!} />

                            <div className="absolute top-[14px] right-[11px] 
                            flex flex-row gap-2
                             z-10 opacity-0 group-hover:opacity-100 transition-all duration-200">

                                <ArchiveIcon className="w-5 h-5 text-neutral-300 cursor-pointer "
                                    onClickCapture={(e) => {
                                        e.stopPropagation()
                                        handleRemoveCard(e)
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
                )}
            </Draggable>
            <div>
                {editMode === true && <LabeledButtonPresetBSubmit label="Save" onClick={() => { }} />}
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



