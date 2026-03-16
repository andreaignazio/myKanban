export type AddOptimisticEntityArgs<T extends { ID: string }, R extends { ID: string }> = {
    tempID: string
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

export function addOptimisticEntity<T extends { ID: string }, R extends { ID: string }>({
    tempID,
    containerID,
    relationIdsByContainerId,
    relationById,
    entityById,
    setRelationIdsByContainerId,
    setRelationById,
    setEntityById,
    createEntity,
    createRelation
}: AddOptimisticEntityArgs<T, R>) {
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

export type ReconcileOptimisticEntityArgs<T extends { ID: string }, R extends { ID: string }> = {
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

export function reconcileOptimisticEntity<T extends { ID: string }, R extends { ID: string }>({
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
}: ReconcileOptimisticEntityArgs<T, R>) {
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

export type RollbackOptimisticEntityArgs<T extends { ID: string }, R extends { ID: string }> = {
    tempID: string
    containerID: string
    relationIdsByContainerId: Record<string, string[]>
    relationById: Record<string, R>
    entityById: Record<string, T>
    setRelationIdsByContainerId: (relationIdsByContainerId: Record<string, string[]>) => void
    setRelationById: (relationById: Record<string, R>) => void
    setEntityById: (entityById: Record<string, T>) => void
}

export function rollbackOptimisticEntity<T extends { ID: string }, R extends { ID: string }>({
    tempID,
    containerID,
    relationIdsByContainerId,
    relationById,
    entityById,
    setRelationIdsByContainerId,
    setRelationById,
    setEntityById
}: RollbackOptimisticEntityArgs<T, R>) {
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

// Backward-compatible alias for old typoed name.
export const addOptisticEntity = addOptimisticEntity
