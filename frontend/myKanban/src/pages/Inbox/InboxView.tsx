import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry"
import { LabeledButtonPresetBSubmit, LabeledButtonPresetB } from "@/components/buttons/labeledButton"
import { CardRow } from "@/components/CardRow"

import { type CustomInputHandle, CustomInput } from "@/components/menuElements/CustomInput"
import { useUserInboxStore } from "@/stores/userInboxStore"
import { Droppable } from "@hello-pangea/dnd"
import { WalletCardsIcon } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { useShallow } from "zustand/shallow"

const PADDING_X = 8

type InboxViewProps = {
    draggedRootListCardId?: string | null
}

export const InboxView = ({ draggedRootListCardId = null }: InboxViewProps) => {
    const inboxCardIds = useUserInboxStore(useShallow((state) => state.inboxCardsIds))
    const fetchInboxCards = useUserInboxStore((state) => state.fetchInboxCards)
    const inboxCardById = useUserInboxStore((state) => state.inboxCardsById)
    const alreadyContainsDraggedRootCard = !!draggedRootListCardId
        && inboxCardIds.some((id) => inboxCardById[id]?.RootListCardID === draggedRootListCardId)

    useEffect(() => {
        fetchInboxCards()
    }, [fetchInboxCards])



    return (
        <div className="flex relative h-full w-full min-h-0
        border border-neutral-500/30 
         bg-[#182f53] overflow-hidden 
         rounded-2xl shadow">
            <div
                style={{ paddingInline: PADDING_X }}
                className={`flex flex-col min-h-0 h-full w-full px-[${PADDING_X}px] overflow-hidden gap-4 pb-3`}>
                <div
                    style={{ marginInline: `calc(${PADDING_X}px * -1)`, width: `calc(100% + ${PADDING_X * 2}px)` }}
                    className="shrink-0 flex items-center gap-2 mb-4 bg-[#142137] h-16 w-full py-2 px-4 rounded">
                    <WalletCardsIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Inbox</span>
                </div>
                <InboxAddCard />


                <div
                    className="relative flex-1 min-h-0 w-full overflow-hidden"
                >

                    <Droppable droppableId={"inbox"} type="card" isDropDisabled={alreadyContainsDraggedRootCard}>
                        {(provided) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="flex h-full min-h-full w-full flex-col overflow-y-auto overflow-x-hidden pr-3 pt-2 pb-6 scrollbar-hidden">

                                <div className="flex flex-col gap-2 min-h-full w-full">
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