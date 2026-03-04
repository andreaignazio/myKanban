import { api } from '@/api/api'
import { create } from 'zustand'

import type { ListCard } from './boardDetailStore'
import type { BulkDetatchListCardsResponse, BulkMoveListCardsInBoardRequest, BulkMoveListCardsInBoardResponse, Card, CardProps, CopyCardToListRequest, MirrorCardToListRequest, MoveCardToBoardRequest, PatchCardDetailsRequest, PatchCardPropsRequest } from './types'

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
    // fetchCards: () => Promise<void>
    addCardToList: (boardID: string, listID: string, payload: CreateCardPayload) => Promise<Card | null>
    mergeCardsPatch: (payload: Record<string, Card>) => void
    removeCards: (cardIDs: string[]) => void
    removeCardFromList: (boardID: string, listID: string, cardID: string) => Promise<void>
    patchCardProps: (boardID: string, cardId: string, props: CardProps) => Promise<void>
    patchCardDetails: (boardID: string, cardId: string, payload: PatchCardDetailsRequest) => Promise<void>
    applyCardPropsPatch: (cardId: string, props: CardProps) => void
    moveCardToBoard: (boardId: string, cardId: string, payload: MoveCardToBoardRequest) => Promise<void>
    bulkMoveListCardsInBoard: (boardId: string, payload: BulkMoveListCardsInBoardRequest) => Promise<BulkMoveListCardsInBoardResponse>
    bulkDetatchListCards: (boardId: string, listId: string) => Promise<BulkDetatchListCardsResponse>
    mirrorCardToList: (boardId: string, cardId: string, payload: MirrorCardToListRequest) => Promise<void>
    copyCardToList: (boardId: string, cardId: string, payload: CopyCardToListRequest) => Promise<void>
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
    mergeCardsPatch: (payload: Record<string, Card>) => {
        set((state) => ({
            cardsById: {
                ...state.cardsById,
                ...payload,
            }
        }))
    },

    removeCards: (cardIDs: string[]) => {
        if (cardIDs.length === 0) return
        const next = { ...get().cardsById }
        cardIDs.forEach((id) => delete next[id])
        set({ cardsById: next })
    },

    addCardToList: async (boardID: string, listID: string, payload: CreateCardPayload) => {
        let response = { data: {} as Card };
        try {
            response = await api.post(`/boards/${boardID}/lists/${listID}/cards/`, payload)
            return response.data as Card
        } catch (error) {
            // console.error("Error adding card to list:", error)
            throw error

        }

    },
    removeCardFromList: async (boardID: string, listID: string, cardID: string) => {
        let response = { data: {} as ListCard };
        try {

            response = await api.delete(`/boards/${boardID}/lists/${listID}/cards/${cardID}/`)
        } catch (error) {
            // console.error("Error removing card from list:", error)
            throw error
        }
    },
    patchCardDetails: async (boardID: string, cardId: string, payload: PatchCardDetailsRequest) => {
        try {
            // console.log(`Patching card details for card ${cardId} with payload:`, payload)
            await api.patch(`/boards/${boardID}/cards/${cardId}/`, payload)
        } catch (error) {
            // console.error(`Error patching card ${cardId} details:`, error)
            throw error
        }
    },

    patchCardProps: async (boardID: string, cardId: string, props: CardProps) => {
        const payload: PatchCardPropsRequest = {
            Props: props,
        }
        // console.log(`Patching card ${cardId} props with payload:`, payload)
        try {
            const res = await api.patch(`/boards/${boardID}/cards/${cardId}/props`, payload)
            const updatedCard = res.data as Card;
            const updatedProps = updatedCard.Props?.Props;
            if (updatedProps) {
                get().applyCardPropsPatch(cardId, updatedProps);
            }
        } catch (error) {
            // console.error(`Error patching card ${cardId} props:`, error)
            throw error
        }
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
        try {
            // console.log(`Moving card ${cardId} to board ${boardId} with payload:`, payload)
            await api.patch(`/boards/${boardId}/cards/${cardId}/moveto`, payload)
        } catch (error) {
            // console.error(`Error moving card ${cardId} to board ${boardId}:`, error)
            throw error
        }
    },
    bulkMoveListCardsInBoard: async (boardId: string, payload: BulkMoveListCardsInBoardRequest) => {
        try {
            const response = await api.patch(`/boards/${boardId}/listcards/movebulk`, payload)
            return response.data as BulkMoveListCardsInBoardResponse
        } catch (error) {
            throw error
        }
    },
    bulkDetatchListCards: async (boardId: string, listId: string) => {
        try {
            const response = await api.delete(`/boards/${boardId}/lists/${listId}/listcards`)
            return response.data as BulkDetatchListCardsResponse
        } catch (error) {
            throw error
        }
    },

    mirrorCardToList: async (boardId: string, cardId: string, payload: MirrorCardToListRequest) => {
        try {
            // console.log(`Mirroring card ${cardId} to list ${payload.TargetListID} on board ${payload.TargetBoardID} with payload:`, payload)
            await api.post(`/boards/${boardId}/cards/${cardId}/mirror`, payload)
        } catch (error) {
            // console.error(`Error mirroring card ${cardId} to list ${payload.TargetListID} on board ${payload.TargetBoardID}:`, error)
            throw error
        }
    },
    copyCardToList: async (boardId: string, cardId: string, payload: CopyCardToListRequest) => {
        try {
            // console.log(`Copying card ${cardId} to list ${payload.TargetListID} on board ${payload.TargetBoardID} with payload:`, payload)
            await api.post(`/boards/${boardId}/cards/${cardId}/copy`, payload)
        } catch (error) {
            // console.error(`Error copying card ${cardId} to list ${payload.TargetListID} on board ${payload.TargetBoardID}:`, error)
            throw error
        }
    },
}))



