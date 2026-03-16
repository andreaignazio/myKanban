import { useCardsStore } from "@/stores/cardsStore"
import { useState } from "react"
import { AddForm } from "./common/AddForm"
import { useBoardDetailStore, type ListCard } from "@/stores/boardDetailStore"
import type { Card } from "@/stores/types"
import { useShallow } from "zustand/shallow"
import { useEventStore } from "@/stores/eventStore"
import {
    addOptimisticEntity,
    reconcileOptimisticEntity,
    rollbackOptimisticEntity
} from "@/utils/optimisticEntity"

type ListRowFooterProps = {
    boardID: string
    listID: string
    isReadonly?: boolean
}

export function ListRowFooter({ boardID, listID, isReadonly = false }: ListRowFooterProps) {
    const [isAddingCard, setIsAddingCard] = useState(false)
    const cardsStore = useCardsStore()

    const listCardIdsByListId = useBoardDetailStore(useShallow((state) => state.getListCardIdsByListId()))
    const listCardById = useBoardDetailStore(useShallow((state) => state.getListCardById()))
    const getCardsById = useCardsStore(useShallow((state) => state.getCardsById()))
    const setListCardById = useBoardDetailStore((state) => state.setListCardById)
    const setListCardIdsByListId = useBoardDetailStore((state) => state.setStateListCardIdsByListId)

    const setCardsById = useCardsStore((state) => state.setCardsById)



    const handleAddCardToList = (title: string) => {
        if (isReadonly) {
            return
        }
        /*cardsStore.addCardToList(boardID, listID,
            { Title: title, InsertAt: "end", AfterID: null })*/
        handleAddCardToListOptimistic(title)
    }

    const handleAddCardToListOptimistic = async (title: string) => {
        const tempID = `temp-card-${Date.now()}`
        const correlationID = crypto.randomUUID()
        useEventStore.getState().addEvent(correlationID, "card.created")
        addOptimisticEntity<Card, ListCard>({
            tempID,
            containerID: listID,
            relationIdsByContainerId: listCardIdsByListId,
            relationById: listCardById,
            entityById: getCardsById,
            setRelationIdsByContainerId: setListCardIdsByListId,
            setRelationById: setListCardById,
            setEntityById: setCardsById,
            createEntity: (tempID) => ({
                ID: tempID,
                Title: title,
                Done: false,
                CreatedAt: new Date().toISOString(),
                UpdatedAt: new Date().toISOString(),
                DeletedAt: null
            }),
            createRelation: (tempID, listID) => ({
                ID: tempID,
                CardID: tempID,
                ListID: listID,
                Position: "",
                CreatedAt: new Date().toISOString(),
                UpdatedAt: new Date().toISOString(),
                DeletedAt: null
            })

        })
        try {
            await cardsStore.addCardToList(boardID, listID,
                { Title: title, InsertAt: "end", AfterID: null }, undefined, correlationID).then((res) => {
                    if (res) {
                        const createdCard = res.Entity
                        const createdListCard = res.Relation
                        reconcileOptimisticEntity<Card, ListCard>({
                            createdEntity: createdCard,
                            createdRelation: createdListCard,
                            tempID,
                            containerID: listID,
                            entityById: getCardsById,
                            relationById: listCardById,
                            relationIdsByContainerId: listCardIdsByListId,
                            setEntityById: setCardsById,
                            setRelationById: setListCardById,
                            setRelationIdsByContainerId: setListCardIdsByListId
                        })
                        useEventStore.getState().addEvent(res.CorrelationID, "card.created")
                    } else {
                        rollbackOptimisticEntity<Card, ListCard>({
                            tempID,
                            containerID: listID,
                            relationIdsByContainerId: listCardIdsByListId,
                            relationById: listCardById,
                            entityById: getCardsById,
                            setRelationIdsByContainerId: setListCardIdsByListId,
                            setRelationById: setListCardById,
                            setEntityById: setCardsById
                        })
                    }
                })
        } catch (error) {
            console.error("Error creating card:", error)
            rollbackOptimisticEntity<Card, ListCard>({
                tempID,
                containerID: listID,
                relationIdsByContainerId: listCardIdsByListId,
                relationById: listCardById,
                entityById: getCardsById,
                setRelationIdsByContainerId: setListCardIdsByListId,
                setRelationById: setListCardById,
                setEntityById: setCardsById
            })
        }
    }



    return (
        <>
            <AddForm
                onSubmit={(title) => handleAddCardToList(title)}
                isAdding={isAddingCard}
                setIsAdding={setIsAddingCard}
                disabled={isReadonly}
                openedHeight={30}
                onCancel={() => setIsAddingCard(false)} />
        </>
    )
}

