import { create } from "zustand";
import type { Board, BoardWatch, Card, CardWatch, List, ListWatch, User, UserWatchPatchResponse, UserWatchResponse } from "./types";
import { api } from "@/api/api";
import { use } from "react";
import { useBoardsStore } from "./boardsStore";
import { useListsStore } from "./listsStore";
import { useCardsStore } from "./cardsStore";


type UserWatchState = {
    listWatchByListId: Record<string, ListWatch>
    cardWatchByCardId: Record<string, CardWatch>
    boardWatchByBoardId: Record<string, BoardWatch>

    listWatchIds: string[]
    cardWatchIds: string[]
    boardWatchIds: string[]

    fetchUserWatches: () => Promise<void>;
    addListWatch: (boardId: string, listId: string) => Promise<void>;
    addCardWatch: (boardId: string, cardId: string) => Promise<void>;
    addBoardWatch: (boardId: string) => Promise<void>;

    patchCardWatchActive: (cardId: string, active: boolean) => Promise<void>;
    patchListWatchActive: (listId: string, active: boolean) => Promise<void>;
    patchBoardWatchActive: (boardId: string, active: boolean) => Promise<void>;
    applyPatchResponse: (data: UserWatchPatchResponse) => void;
    applyAddWatch: (data: UserWatchPatchResponse) => void;
    isListWatched: (listId: string) => boolean;
    isCardWatched: (cardId: string) => boolean;
    isBoardWatched: (boardId: string) => boolean;
}


export const useUserWatchStore = create<UserWatchState>((set, get) => ({
    listWatchByListId: {},
    cardWatchByCardId: {},
    boardWatchByBoardId: {},
    listWatchIds: [], //ListIDs that the user is watching
    cardWatchIds: [], //CardIDs that the user is watching
    boardWatchIds: [], //BoardIDs that the user is watching
    fetchUserWatches: async () => {
        try {
            const response = await api.get(`/watches`)
            const data = response.data as UserWatchResponse
            // console.log("Raw user watches response:", data) // Log the raw response for debugging
            const { ListWatches, CardWatches, BoardWatches } = data
            const { Cards, Lists, Boards } = data

            const listWatchByListId: Record<string, ListWatch> = (ListWatches && ListWatches.length > 0) ? ListWatches.reduce((acc, watch) => {
                acc[watch.ListID] = watch
                return acc
            }, {} as Record<string, ListWatch>) : {}

            const cardWatchByCardId: Record<string, CardWatch> = (CardWatches && CardWatches.length > 0) ? CardWatches.reduce((acc, watch) => {
                acc[watch.CardID] = watch
                return acc
            }, {} as Record<string, CardWatch>) : {}

            const boardWatchByBoardId: Record<string, BoardWatch> = (BoardWatches && BoardWatches.length > 0) ? BoardWatches.reduce((acc, watch) => {
                acc[watch.BoardID] = watch
                return acc
            }, {} as Record<string, BoardWatch>) : {}

            const cardPatch: Record<string, Card> = (Cards && Cards.length > 0) ? Cards.reduce((acc, card) => {
                acc[card.ID] = card
                return acc
            }, {} as Record<string, Card>) : {}

            const listPatch: Record<string, List> = (Lists && Lists.length > 0) ? Lists.reduce((acc, list) => {
                acc[list.ID] = list
                return acc
            }, {} as Record<string, List>) : {}

            const boardPatch: Record<string, Board> = (Boards && Boards.length > 0) ? Boards.reduce((acc, board) => {
                acc[board.ID] = board
                return acc
            }, {} as Record<string, Board>) : {}
            useCardsStore.getState().mergeCardsPatch(cardPatch)
            useListsStore.getState().mergeListsPatch(listPatch)
            useBoardsStore.getState().mergeBoardsPatch(boardPatch)

            // console.log("Fetched user watches:", { ListWatches, CardWatches, BoardWatches })
            set({
                listWatchByListId,
                cardWatchByCardId,
                boardWatchByBoardId,
                listWatchIds: ListWatches ? ListWatches.map(watch => watch.ListID) : [],
                cardWatchIds: CardWatches ? CardWatches.map(watch => watch.CardID) : [],
                boardWatchIds: BoardWatches ? BoardWatches.map(watch => watch.BoardID) : []
            })


        } catch (error) {
            // console.error("Error fetching user watches:", error)
        }
    },

    addListWatch: async (boardId: string, listId: string) => {
        try {
            const response = await api.post(`boards/${boardId}/lists/${listId}/watch`)
            const data = response.data as UserWatchPatchResponse

            get().applyAddWatch(data)
            //await get().fetchUserWatches()
        } catch (error) {
            // console.error("Error adding list watch:", error)
        }
    },
    addCardWatch: async (boardId: string, cardId: string) => {
        try {
            const response = await api.post(`boards/${boardId}/cards/${cardId}/watch`)
            const data = response.data as UserWatchPatchResponse
            get().applyAddWatch(data)
            //await get().fetchUserWatches()
        } catch (error) {
            // console.error("Error adding card watch:", error)
        }
    },
    addBoardWatch: async (boardId: string) => {
        try {
            const response = await api.post(`boards/${boardId}/watch`)
            const data = response.data as UserWatchPatchResponse
            get().applyAddWatch(data)
            //await get().fetchUserWatches()
        } catch (error) {
            // console.error("Error adding board watch:", error)
        }
    },
    patchCardWatchActive: async (cardId: string, active: boolean) => {
        const id = get().cardWatchByCardId[cardId]?.ID
        try {
            const response = await api.patch(`watches/cards/${id}/active`, { active })
            const data = response.data as UserWatchPatchResponse
            const cardWatch = data.CardWatch
            get().applyPatchResponse(data)
        }
        catch (error) {
            // console.error("Error patching card watch:", error)
        }
    },
    patchListWatchActive: async (listId: string, active: boolean) => {
        const id = get().listWatchByListId[listId]?.ID
        try {
            const response = await api.patch(`watches/lists/${id}/active`, { active })
            const data = response.data as UserWatchPatchResponse
            const listWatch = data.ListWatch
            get().applyPatchResponse(data)
        }
        catch (error) {
            // console.error("Error patching list watch:", error)
        }
    },
    patchBoardWatchActive: async (boardId: string, active: boolean) => {
        const id = get().boardWatchByBoardId[boardId]?.ID
        try {
            const response = await api.patch(`watches/boards/${id}/active`, { active })
            const data = response.data as UserWatchPatchResponse
            const boardWatch = data.BoardWatch
            get().applyPatchResponse(data)
        }
        catch (error) {
            // console.error("Error patching board watch:", error)
        }
    },
    applyPatchResponse: (data: UserWatchPatchResponse) => {
        const { EntityType, BoardWatch, ListWatch, CardWatch } = data
        if (EntityType === "board" && BoardWatch) {
            set((state) => ({
                boardWatchByBoardId: {
                    ...state.boardWatchByBoardId,
                    [BoardWatch.BoardID]: BoardWatch
                },
            }))
        } else if (EntityType === "list" && ListWatch) {
            set((state) => ({
                listWatchByListId: {
                    ...state.listWatchByListId,
                    [ListWatch.ListID]: ListWatch
                },
            }))
        } else if (EntityType === "card" && CardWatch) {
            set((state) => ({
                cardWatchByCardId: {
                    ...state.cardWatchByCardId,
                    [CardWatch.CardID]: CardWatch
                },
            }))
        }
    },
    applyAddWatch: (data: UserWatchPatchResponse) => {
        const { EntityType, BoardWatch, ListWatch, CardWatch } = data
        if (EntityType === "board" && BoardWatch) {
            set((state) => ({
                boardWatchByBoardId: {
                    ...state.boardWatchByBoardId,
                    [BoardWatch.BoardID]: BoardWatch
                },
                boardWatchIds: [...state.boardWatchIds, BoardWatch.BoardID],
            }))
        } else if (EntityType === "list" && ListWatch) {
            set((state) => ({
                listWatchByListId: {
                    ...state.listWatchByListId,
                    [ListWatch.ListID]: ListWatch
                },
                listWatchIds: [...state.listWatchIds, ListWatch.ListID],
            }))
        } else if (EntityType === "card" && CardWatch) {
            set((state) => ({
                cardWatchByCardId: {
                    ...state.cardWatchByCardId,
                    [CardWatch.CardID]: CardWatch
                },
                cardWatchIds: [...state.cardWatchIds, CardWatch.CardID],
            }))
        }
    },
    isListWatched: (listId: string): boolean => {
        return get().listWatchByListId[listId]?.Active === true
    },
    isCardWatched: (cardId: string): boolean => {
        return get().cardWatchByCardId[cardId]?.Active === true
    },
    isBoardWatched: (boardId: string): boolean => {
        return get().boardWatchByBoardId[boardId]?.Active === true
    },






}));
