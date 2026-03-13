import { api } from '@/api/api'
import { create } from 'zustand'
import { useAsyncRequestStore, useAsyncKey } from '@/stores/asyncRequestStore'
import type { AsyncRequestKey } from '@/stores/asyncRequestTypes'

import type { BulkDetatchListCardsResponse, BulkMoveListCardsInBoardRequest, BulkMoveListCardsInBoardResponse, Card, CardProps, CopyCardToListRequest, CreateCardInListResponse, MirrorCardToListRequest, MoveCardToBoardRequest, PatchCardDetailsRequest, PatchCardPropsRequest } from './types'

type cardsById = Record<string, Card>



export type CreateCardPayload = {
    Title: string
    InsertAt: string | null
    AfterID: string | null
}
export type CrossMoveCardRequest = {
    ListCardID: string
    TargetListID: string
    FromListID: string
    DetatchFromList: boolean
    AfterID?: string | null
    BeforeID?: string | null
    InsertAt: string | null
}


export type MoveCardPayload = {
    TargetListID: string,
    FromListID: string,
    boardID: string,
    cardID: string,
    InsertAt: string | null,
    AfterID?: string | null,
    BeforeID?: string | null,
    DetatchFromList?: boolean
}
type CardsStore = {
    cardsById: cardsById
    getCardsById: () => cardsById
    setCardsById: (cardsById: cardsById) => void
    // fetchCards: () => Promise<void>
    addCardToList: (boardID: string, listID: string, payload: CreateCardPayload, key?: AsyncRequestKey, correlationID?: string) => Promise<CreateCardInListResponse | null>
    mergeCardsPatch: (payload: Record<string, Card>) => void
    mergeCards: (cards: Card[]) => void
    removeCards: (cardIDs: string[]) => void
    removeCardFromList: (boardID: string, listID: string, cardID: string) => Promise<void | null>
    patchCardProps: (boardID: string, cardId: string, props: CardProps, listCardId?: string) => Promise<Card | null>
    patchCardDetails: (boardID: string, cardId: string, payload: PatchCardDetailsRequest, asyncKey?: AsyncRequestKey, listCardId?: string) => Promise<void | null>
    applyCardPropsPatch: (cardId: string, props: CardProps) => void
    moveCardToBoard: (boardId: string, cardId: string, payload: MoveCardToBoardRequest) => Promise<void | null>
    bulkMoveListCardsInBoard: (boardId: string, payload: BulkMoveListCardsInBoardRequest) => Promise<BulkMoveListCardsInBoardResponse | null>
    bulkDetatchListCards: (boardId: string, listId: string) => Promise<BulkDetatchListCardsResponse | null>
    mirrorCardToList: (boardId: string, cardId: string, payload: MirrorCardToListRequest) => Promise<void | null>
    copyCardToList: (boardId: string, cardId: string, payload: CopyCardToListRequest) => Promise<void | null>
}

export const useCardsStore = create<CardsStore>((set, get) => ({
    cardsById: {},
    /*fetchCards: async () => {
        try {
            const response = await api.get("/cards")
            const cardsData: Card[] = response.data
            const cardsMap = cardsData.reduce((map, card) => {
                map[card.ID] = card
                return map
            }, {} as cardsById)
            set({ CardsById: cardsMap })
        } catch (error) {
            // console.error("Error fetching cards:", error)
        }

    },*/
    getCardsById: () => get().cardsById,
    setCardsById: (cardsById) => set(() => ({ cardsById })),
    mergeCardsPatch: (payload: Record<string, Card>) => {
        set((state) => ({
            cardsById: {
                ...state.cardsById,
                ...payload,
            }
        }))
    },
    mergeCards: (cards) => {
        if (cards.length === 0) return

        set((state) => {
            const nextCardsById = { ...state.cardsById }
            cards.forEach((card) => {
                nextCardsById[card.ID] = card
            })

            return {
                cardsById: nextCardsById,
            }
        })
    },

    removeCards: (cardIDs: string[]) => {
        if (cardIDs.length === 0) return
        const next = { ...get().cardsById }
        cardIDs.forEach((id) => delete next[id])
        set({ cardsById: next })
    },

    addCardToList: async (boardID: string, listID: string, payload: CreateCardPayload, key?: AsyncRequestKey, correlationID?: string) => {
        return useAsyncRequestStore.getState().execute<CreateCardInListResponse>(
            key ?? useAsyncKey("card:create", listID),
            async () => {
                //await new Promise((resolve) => setTimeout(resolve, 1000));
                const headers = correlationID ? { "x-correlation-id": correlationID } : undefined
                const response = await api.post(`/boards/${boardID}/lists/${listID}/cards`, payload, { headers })
                return response.data as CreateCardInListResponse
            },
            { successResetDelayMs: 2000 }
        )
    },
    removeCardFromList: async (boardID: string, listID: string, cardID: string) => {
        return useAsyncRequestStore.getState().execute(
            useAsyncKey("card:delete", cardID),
            () => api.delete(`/boards/${boardID}/lists/${listID}/cards/${cardID}`),
            { successResetDelayMs: 1500 }
        )
    },
    patchCardDetails: async (boardID: string, cardId: string, payload: PatchCardDetailsRequest, asyncKey?: AsyncRequestKey, listCardId?: string) => {
        const requestPayload: PatchCardDetailsRequest = listCardId
            ? { ...payload, ListCardID: listCardId }
            : payload

        return useAsyncRequestStore.getState().execute(
            asyncKey ?? useAsyncKey("card:edit:details", cardId),
            () => api.patch(`/boards/${boardID}/cards/${cardId}`, requestPayload),
            { successResetDelayMs: 1500 }
        )
    },

    patchCardProps: async (boardID: string, cardId: string, props: CardProps, listCardId?: string) => {
        const payload: PatchCardPropsRequest = listCardId
            ? { Props: props, ListCardID: listCardId }
            : { Props: props }

        return useAsyncRequestStore.getState().execute<Card>(
            useAsyncKey("card:edit:props", cardId),
            async () => {
                const res = await api.patch(`/boards/${boardID}/cards/${cardId}/props`, payload)
                return res.data as Card
            },
            {
                successResetDelayMs: 1500,
                onSuccess(updatedCard) {
                    const updatedProps = updatedCard.Props?.Props
                    if (updatedProps) get().applyCardPropsPatch(cardId, updatedProps)
                },
            }
        )
    },
    applyCardPropsPatch: (cardId: string, props: CardProps) => {
        set((state) => {
            const card = state.cardsById[cardId];
            if (!card) {
                // console.warn(`Card with ID ${cardId} not found in store while applying props patch.`)
                return state
            }
            const updatedCard: Card = {
                ...card,
                Props: {
                    ...card.Props,
                    Props: {
                        ...card.Props?.Props,
                        ...props,
                    }
                }
            }
            return {
                cardsById: {
                    ...state.cardsById,
                    [cardId]: updatedCard,
                }
            }
        })
    },
    moveCardToBoard: async (boardId: string, cardId: string, payload: MoveCardToBoardRequest) => {
        return useAsyncRequestStore.getState().execute(
            useAsyncKey("card:move", cardId),
            () => api.patch(`/boards/${boardId}/cards/${cardId}/moveto`, payload),
            { successResetDelayMs: 2000 }
        )
    },
    bulkMoveListCardsInBoard: async (boardId: string, payload: BulkMoveListCardsInBoardRequest) => {
        return useAsyncRequestStore.getState().execute<BulkMoveListCardsInBoardResponse>(
            "card:move:bulk",
            async () => {
                const response = await api.patch(`/boards/${boardId}/listcards/movebulk`, payload)
                return response.data as BulkMoveListCardsInBoardResponse
            },
            { successResetDelayMs: 2000 }
        )
    },
    bulkDetatchListCards: async (boardId: string, listId: string) => {
        return useAsyncRequestStore.getState().execute<BulkDetatchListCardsResponse>(
            useAsyncKey("card:detach:bulk", listId),
            async () => {
                const response = await api.delete(`/boards/${boardId}/lists/${listId}/listcards`)
                return response.data as BulkDetatchListCardsResponse
            },
            { successResetDelayMs: 2000 }
        )
    },
    mirrorCardToList: async (boardId: string, cardId: string, payload: MirrorCardToListRequest) => {
        return useAsyncRequestStore.getState().execute(
            useAsyncKey("card:mirror", cardId),
            () => api.post(`/boards/${boardId}/cards/${cardId}/mirror`, payload),
            { successResetDelayMs: 2000 }
        )
    },
    copyCardToList: async (boardId: string, cardId: string, payload: CopyCardToListRequest) => {
        return useAsyncRequestStore.getState().execute(
            useAsyncKey("card:copy", cardId),
            () => api.post(`/boards/${boardId}/cards/${cardId}/copy`, payload),
            { successResetDelayMs: 2000 }
        )
    },
}))



