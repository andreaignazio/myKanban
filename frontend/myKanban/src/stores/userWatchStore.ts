import { create } from "zustand";
import type { Board, BoardWatch, Card, CardWatch, List, ListWatch, UserWatchPatchResponse, UserWatchResponse } from "./types";
import { api } from "@/api/api";
import { useBoardsStore } from "./boardsStore";
import { useListsStore } from "./listsStore";
import { useCardsStore } from "./cardsStore";
import { useAsyncKey, useAsyncRequestStore } from "./asyncRequestStore";


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
        await useAsyncRequestStore.getState().execute<UserWatchResponse>(
            useAsyncKey("watch:fetch"),
            async () => {
                const response = await api.get(`/watches`)
                return response.data as UserWatchResponse
            },
            {
                onSuccess(data) {
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

                    set({
                        listWatchByListId,
                        cardWatchByCardId,
                        boardWatchByBoardId,
                        listWatchIds: ListWatches ? ListWatches.map(watch => watch.ListID) : [],
                        cardWatchIds: CardWatches ? CardWatches.map(watch => watch.CardID) : [],
                        boardWatchIds: BoardWatches ? BoardWatches.map(watch => watch.BoardID) : []
                    })
                }
            }
        )
    },

    addListWatch: async (boardId: string, listId: string) => {
        await useAsyncRequestStore.getState().execute<UserWatchPatchResponse>(
            useAsyncKey("watch:add:list", listId),
            async () => {
                const response = await api.post(`boards/${boardId}/lists/${listId}/watch`)
                return response.data as UserWatchPatchResponse
            },
            {
                onSuccess(data) {
                    get().applyAddWatch(data)
                },
                successResetDelayMs: 1500,
            }
        )
    },
    addCardWatch: async (boardId: string, cardId: string) => {
        await useAsyncRequestStore.getState().execute<UserWatchPatchResponse>(
            useAsyncKey("watch:add:card", cardId),
            async () => {
                const response = await api.post(`boards/${boardId}/cards/${cardId}/watch`)
                return response.data as UserWatchPatchResponse
            },
            {
                onSuccess(data) {
                    get().applyAddWatch(data)
                },
                successResetDelayMs: 1500,
            }
        )
    },
    addBoardWatch: async (boardId: string) => {
        await useAsyncRequestStore.getState().execute<UserWatchPatchResponse>(
            useAsyncKey("watch:add:board", boardId),
            async () => {
                const response = await api.post(`boards/${boardId}/watch`)
                return response.data as UserWatchPatchResponse
            },
            {
                onSuccess(data) {
                    get().applyAddWatch(data)
                },
                successResetDelayMs: 1500,
            }
        )
    },
    patchCardWatchActive: async (cardId: string, active: boolean) => {
        const id = get().cardWatchByCardId[cardId]?.ID
        if (!id) return

        await useAsyncRequestStore.getState().execute<UserWatchPatchResponse>(
            useAsyncKey("watch:patch:card", cardId),
            async () => {
                const response = await api.patch(`watches/cards/${id}/active`, { active })
                return response.data as UserWatchPatchResponse
            },
            {
                onSuccess(data) {
                    get().applyPatchResponse(data)
                },
                successResetDelayMs: 1500,
            }
        )
    },
    patchListWatchActive: async (listId: string, active: boolean) => {
        const id = get().listWatchByListId[listId]?.ID
        if (!id) return

        await useAsyncRequestStore.getState().execute<UserWatchPatchResponse>(
            useAsyncKey("watch:patch:list", listId),
            async () => {
                const response = await api.patch(`watches/lists/${id}/active`, { active })
                return response.data as UserWatchPatchResponse
            },
            {
                onSuccess(data) {
                    get().applyPatchResponse(data)
                },
                successResetDelayMs: 1500,
            }
        )
    },
    patchBoardWatchActive: async (boardId: string, active: boolean) => {
        const id = get().boardWatchByBoardId[boardId]?.ID
        if (!id) return

        await useAsyncRequestStore.getState().execute<UserWatchPatchResponse>(
            useAsyncKey("watch:patch:board", boardId),
            async () => {
                const response = await api.patch(`watches/boards/${id}/active`, { active })
                return response.data as UserWatchPatchResponse
            },
            {
                onSuccess(data) {
                    get().applyPatchResponse(data)
                },
                successResetDelayMs: 1500,
            }
        )
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
