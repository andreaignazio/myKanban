import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry"
import { LabeledButtonPresetBSubmit, LabeledButtonPresetB } from "@/components/buttons/labeledButton"
import { CardRow } from "@/components/CardRow"

import { CardRowInbox } from "@/components/cardRowInbox"
import { type CustomInputHandle, CustomInput } from "@/components/menuElements/CustomInput"
import { useUserInboxStore } from "@/stores/userInboxStore"
import { DragDropContext, Droppable } from "@hello-pangea/dnd"
import { WalletCardsIcon } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { useShallow } from "zustand/shallow"

const PADDING_X = 8

export const InboxView = () => {
    const inboxCardIds = useUserInboxStore(useShallow((state) => state.inboxCardsIds))
    const fetchInboxCards = useUserInboxStore((state) => state.fetchInboxCards)
    const inboxCardById = useUserInboxStore((state) => state.inboxCardsById)

    useEffect(() => {
        fetchInboxCards()
    }, [fetchInboxCards])

    const handleDragEnd = () => {
        // We don't need to handle drag end in the inbox, because cards can't be moved from the inbox. They can only be moved from the inbox to a list, and that is handled by the onDragEnd of the BoardView.
    }



    return (
        <div className=" flex relative h-full w-full  min-h-0
        border border-neutral-500/30 
         bg-[#182f53] overflow-hidden 
         rounded-2xl  shadow pb-2">
            <div
                style={{ paddingInline: PADDING_X }}
                className={`flex flex-col min-h-0 h-full w-full px-[${PADDING_X}px] overflow-hidden gap-4`}>
                <div
                    style={{ marginInline: `calc(${PADDING_X}px * -1)`, width: `calc(100% + ${PADDING_X * 2}px)` }}
                    className="flex items-center gap-2 mb-4 bg-[#142137] h-16 w-full py-2 px-4 rounded">
                    <WalletCardsIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Inbox</span>
                </div>
                <InboxAddCard />

                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="lists" type="list" direction="horizontal">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="relative flex h-full min-h-0 w-full flex-row items-start pt-2 pb-2 mb-1 !pr-8
                            overflow-x-auto overflow-y-hidden scrollbar-hidden "
                            >

                                <Droppable droppableId={"inbox"} type="card" isDropDisabled={true}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className="flex flex-1 min-h-0 flex-col pt-2 
                        overflow-y-auto scrollbar-hidden">

                                            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full space-y-2 scrollbar-hidden">
                                                {inboxCardIds.length > 0 && inboxCardIds.map((id, index) => {
                                                    const inboxCard = inboxCardById[id]
                                                    if (!inboxCard) return null
                                                    const isInboxMirror = inboxCard.RootListCardID !== undefined && inboxCard.RootListCardID !== null
                                                    const source = isInboxMirror ? "inbox-mirror" : "inbox"
                                                    const rootListCardId = inboxCard.RootListCardID ?? null
                                                    return (
                                                        <CardRow key={id}
                                                            rootListCardId={rootListCardId}
                                                            source={source}
                                                            inboxCardId={id}
                                                            cardId={inboxCardById[id]?.CardID ?? ""}
                                                            index={index} />
                                                    )
                                                })}
                                            </div>
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>


            </div>
        </div>
    )
}

const InboxAddCard = () => {
    const useCardsActions = useCardActionRegistry()
    const addInboxCard = useCardsActions.createInboxCard
    const [isEditing, setIsEditing] = useState(false)
    const [newCardTitle, setNewCardTitle] = useState("")
    const inputRef = useRef<CustomInputHandle | null>(null)
    const handleAddCard = () => {
        if (newCardTitle.trim() === "") {
            return
        }
        addInboxCard({ Title: newCardTitle })
        setNewCardTitle("")
        setIsEditing(false)
    }
    const handleCancel = () => {
        setIsEditing(false)
        setNewCardTitle("")
    }

    return (
        <div className="flex flex-col items-center gap-2 cursor-pointer">
            <CustomInput ref={inputRef} placeholder="Add card to inbox"
                className={"rounded-xl"} onFocus={() => setIsEditing(true)} onInputChange={(inputRef) => setNewCardTitle(inputRef?.current?.value ?? "  ")} />
            {isEditing && <div className=" w-full flex flex-row gap-2" >
                <LabeledButtonPresetBSubmit label="Add" onClick={handleAddCard} />
                <LabeledButtonPresetB label="Cancel" onClick={() => { handleCancel }} />
            </div>}
        </div>
    )


}