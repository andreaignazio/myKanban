import { useCardsStore } from "@/stores/cardsStore"
import { useState } from "react"
import { AddForm } from "./common/AddForm"
import { useBoardDetailStore, type ListCard } from "@/stores/boardDetailStore"
import type { Card } from "@/stores/types"
import { useShallow } from "zustand/shallow"
import { useEventStore } from "@/stores/eventStore"

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
        addOptisticEntity<Card, ListCard>({
            tempID,
            title,
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



type addOptisticEntityArgs<T extends { ID: string }, R extends { ID: string }> = {
    tempID: string
    title?: string
    containerID: string
    relationIdsByContainerId: Record<string, string[]>
    relationById: Record<string, R>
    entityById: Record<string, T>
    createEntity: (tempID: string) => T
    createRelation: (tempID: string, containerID: string) => R
    setRelationIdsByContainerId: (relationIdsByContainerId: Record<string, string[]>) => void
    setRelationById: (relationById: Record<string, R>) => void
    setEntityById: (entityById: Record<string, T>) => void
}


function addOptisticEntity<T extends { ID: string }, R extends { ID: string }>({ tempID, title, containerID,
    relationIdsByContainerId,
    relationById,
    entityById,
    setRelationIdsByContainerId, setRelationById, setEntityById,
    createEntity, createRelation }: addOptisticEntityArgs<T, R>) {

    const tempEntity: T = createEntity(tempID)

    const tempRelation: R = createRelation(tempID, containerID)

    const nextEntityById = { ...entityById, [tempID]: tempEntity }
    const nextRelationById = { ...relationById, [tempID]: tempRelation }
    const nextRelationIdsByContainerId = {
        ...relationIdsByContainerId,
        [containerID]: [...(relationIdsByContainerId[containerID] ?? []), tempID]
    }

    setEntityById(nextEntityById)
    setRelationById(nextRelationById)
    setRelationIdsByContainerId(nextRelationIdsByContainerId)

}

type reconcileOptimisticEntityArgs<T extends { ID: string }, R extends { ID: string }> = {
    createdEntity: T
    createdRelation: R
    tempID: string
    containerID: string
    entityById: Record<string, T>
    relationById: Record<string, R>
    relationIdsByContainerId: Record<string, string[]>
    setEntityById: (entityById: Record<string, T>) => void
    setRelationById: (relationById: Record<string, R>) => void
    setRelationIdsByContainerId: (relationIdsByContainerId: Record<string, string[]>) => void
}

function reconcileOptimisticEntity<T extends { ID: string }, R extends { ID: string }>(
    {
        createdEntity,
        createdRelation,
        tempID,
        containerID,
        entityById,
        relationById,
        relationIdsByContainerId,
        setEntityById,
        setRelationById,
        setRelationIdsByContainerId

    }: reconcileOptimisticEntityArgs<T, R>) {

    const nextEntityById = { ...entityById, [createdEntity.ID]: createdEntity }
    delete nextEntityById[tempID]
    setEntityById(nextEntityById)

    const nextRelationById = { ...relationById, [createdRelation.ID]: createdRelation }
    delete nextRelationById[tempID]
    setRelationById(nextRelationById)

    const idx = relationIdsByContainerId[containerID]?.findIndex((id) => id === tempID) ?? -1
    if (idx !== -1) {
        const nextRelationIds = [...(relationIdsByContainerId[containerID] ?? [])]
        nextRelationIds.splice(idx, 1, createdRelation.ID)
        const nextRelationIdsByContainerId = {
            ...relationIdsByContainerId,
            [containerID]: nextRelationIds
        }
        setRelationIdsByContainerId(nextRelationIdsByContainerId)
    } else {
        setRelationIdsByContainerId({
            ...relationIdsByContainerId,
            [containerID]: [...(relationIdsByContainerId[containerID] ?? []), createdRelation.ID]
        })
    }
}

type rollbackOptimisticEntityArgs<T extends { ID: string }, R extends { ID: string }> = {
    tempID: string,
    containerID: string,
    relationIdsByContainerId: Record<string, string[]>
    relationById: Record<string, R>
    entityById: Record<string, T>
    setRelationIdsByContainerId: (relationIdsByContainerId: Record<string, string[]>) => void
    setRelationById: (relationById: Record<string, R>) => void
    setEntityById: (entityById: Record<string, T>) => void

}

function rollbackOptimisticEntity<T extends { ID: string }, R extends { ID: string }>(
    {
        tempID,
        containerID,
        relationIdsByContainerId,
        relationById,
        entityById,
        setRelationIdsByContainerId, setRelationById, setEntityById
    }: rollbackOptimisticEntityArgs<T, R>
) {

    const nextEntityById = { ...entityById }
    delete nextEntityById[tempID]
    setEntityById(nextEntityById)
    const nextRelationById = { ...relationById }
    delete nextRelationById[tempID]
    setRelationById(nextRelationById)

    const nextRelationIds = (relationIdsByContainerId[containerID] ?? []).filter((id) => id !== tempID)
    setRelationIdsByContainerId({
        ...relationIdsByContainerId,
        [containerID]: nextRelationIds
    })

}

