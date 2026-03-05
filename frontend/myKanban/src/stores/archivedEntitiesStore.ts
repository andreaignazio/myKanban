import { api } from "@/api/api";
import { create } from "zustand";
import { useCardsStore } from "@/stores/cardsStore";
import { useListsStore } from "@/stores/listsStore";
import { useBoardDetailStore } from "@/stores/boardDetailStore";
import { useAsyncRequestStore, useAsyncKey } from "@/stores/asyncRequestStore";

import type { BoardList, Card, List, ListCardRelation } from "./types";

type DeletedBoardRelationsResponse = {
    Lists?: Record<string, List>;
    Cards?: Record<string, Card>;
    BoardListRelations: BoardList[];
    ListCardRelations: ListCardRelation[];
};

type ArchivedEntitiesStore = {
    opCounter: number;
    listCardById: Record<string, ListCardRelation>;
    boardListById: Record<string, BoardList>;
    listCardIdsByBoardId: Record<string, string[]>;
    boardListIdsByBoardId: Record<string, string[]>;

    fetchArchivedByBoardId: (boardId: string) => Promise<void>;
    clearBoardArchive: (boardId: string) => void;
    clearAllArchives: () => void;
    applyArchivedRelations: (boardId: string, payload: DeletedBoardRelationsResponse) => void;
    restoreArchivedBoardList: (boardId: string, boardListId: string) => Promise<void>;
    restoreArchivedListCard: (boardId: string, listCardId: string) => Promise<void>;
    purgeArchivedBoardList: (boardId: string, boardListId: string) => Promise<void>;
    purgeArchivedListCard: (boardId: string, listCardId: string) => Promise<void>;
    removeArchivedBoardListLocal: (boardId: string, boardListId: string) => void;
    removeArchivedListCardLocal: (boardId: string, listCardId: string) => void;
    getListIdFromListCardId: (listCardId: string) => string | undefined;
    getCardIdFromListCardId: (listCardId: string) => string | undefined;
    getListIdFromBoardListId: (boardListId: string) => string | undefined;
};

function uniqueIds(ids: string[]): string[] {
    return Array.from(new Set(ids));
}

export const useArchivedEntitiesStore = create<ArchivedEntitiesStore>((set, get) => ({
    opCounter: 0,
    listCardById: {},
    boardListById: {},
    listCardIdsByBoardId: {},
    boardListIdsByBoardId: {},

    fetchArchivedByBoardId: async (boardId: string) => {
        await useAsyncRequestStore.getState().execute(
            useAsyncKey("board:archive:fetch", boardId),
            async () => {
                const response = await api.get(`/boards/${boardId}/relations/deleted`);
                const payload = response.data as DeletedBoardRelationsResponse;
                get().applyArchivedRelations(boardId, payload);
            },
            { successResetDelayMs: 1500 }
        );
    },

    applyArchivedRelations: (boardId: string, payload: DeletedBoardRelationsResponse) => {
        const nextBoardListById = { ...get().boardListById };
        const nextListCardById = { ...get().listCardById };

        const boardListIds = payload.BoardListRelations.map((relation) => {
            nextBoardListById[relation.ID] = relation;
            return relation.ID;
        });

        const listCardIds = payload.ListCardRelations.map((relation) => {
            nextListCardById[relation.ID] = relation;
            return relation.ID;
        });

        const listsPatch = payload.Lists ?? {};
        const cardsPatch = payload.Cards ?? {};
        if (Object.keys(listsPatch).length > 0) {
            useListsStore.getState().mergeListsPatch(listsPatch);
        }
        if (Object.keys(cardsPatch).length > 0) {
            useCardsStore.getState().mergeCardsPatch(cardsPatch);
        }

        set((state) => ({
            boardListById: nextBoardListById,
            listCardById: nextListCardById,
            boardListIdsByBoardId: {
                ...state.boardListIdsByBoardId,
                [boardId]: uniqueIds(boardListIds),
            },
            listCardIdsByBoardId: {
                ...state.listCardIdsByBoardId,
                [boardId]: uniqueIds(listCardIds),
            },
            opCounter: state.opCounter + 1,
        }));
    },

    restoreArchivedBoardList: async (boardId: string, boardListId: string) => {
        await useAsyncRequestStore.getState().execute(
            useAsyncKey("board:archive:list:restore", boardListId),
            async () => {
                const response = await api.post(`/boards/${boardId}/lists/restorebulk`, {
                    BoardListIDs: [boardListId],
                });
                const restored = (response.data ?? []) as BoardList[];
                if (restored.length > 0) {
                    const payload = restored.reduce((acc, relation) => {
                        acc[relation.ID] = relation;
                        return acc;
                    }, {} as Record<string, BoardList>);
                    useBoardDetailStore.getState().mergeBoardListsPatch(payload as any);
                }
                get().removeArchivedBoardListLocal(boardId, boardListId);
            },
            { successResetDelayMs: 1500 }
        );
    },

    restoreArchivedListCard: async (boardId: string, listCardId: string) => {
        await useAsyncRequestStore.getState().execute(
            useAsyncKey("board:archive:card:restore", listCardId),
            async () => {
                const response = await api.post(`/boards/${boardId}/listcards/restorebulk`, {
                    ListCardIDs: [listCardId],
                });
                const restored = (response.data ?? []) as ListCardRelation[];
                if (restored.length > 0) {
                    const payload = restored.reduce((acc, relation) => {
                        acc[relation.ID] = relation;
                        return acc;
                    }, {} as Record<string, ListCardRelation>);
                    useBoardDetailStore.getState().mergeListCardsPatch(payload as any);
                }
                get().removeArchivedListCardLocal(boardId, listCardId);
            },
            { successResetDelayMs: 1500 }
        );
    },

    purgeArchivedBoardList: async (boardId: string, boardListId: string) => {
        await useAsyncRequestStore.getState().execute(
            useAsyncKey("board:archive:list:purge", boardListId),
            async () => {
                await api.post(`/boards/${boardId}/lists/purgebulk`, {
                    BoardListIDs: [boardListId],
                });
                get().removeArchivedBoardListLocal(boardId, boardListId);
            },
            { successResetDelayMs: 1500 }
        );
    },

    purgeArchivedListCard: async (boardId: string, listCardId: string) => {
        await useAsyncRequestStore.getState().execute(
            useAsyncKey("board:archive:card:purge", listCardId),
            async () => {
                await api.post(`/boards/${boardId}/listcards/purgebulk`, {
                    ListCardIDs: [listCardId],
                });
                get().removeArchivedListCardLocal(boardId, listCardId);
            },
            { successResetDelayMs: 1500 }
        );
    },

    removeArchivedBoardListLocal: (boardId: string, boardListId: string) => {
        set((state) => {
            const nextBoardListById = { ...state.boardListById };
            delete nextBoardListById[boardListId];

            const currentIds = state.boardListIdsByBoardId[boardId] ?? [];
            return {
                boardListById: nextBoardListById,
                boardListIdsByBoardId: {
                    ...state.boardListIdsByBoardId,
                    [boardId]: currentIds.filter((id) => id !== boardListId),
                },
                opCounter: state.opCounter + 1,
            };
        });
    },

    removeArchivedListCardLocal: (boardId: string, listCardId: string) => {
        set((state) => {
            const nextListCardById = { ...state.listCardById };
            delete nextListCardById[listCardId];

            const currentIds = state.listCardIdsByBoardId[boardId] ?? [];
            return {
                listCardById: nextListCardById,
                listCardIdsByBoardId: {
                    ...state.listCardIdsByBoardId,
                    [boardId]: currentIds.filter((id) => id !== listCardId),
                },
                opCounter: state.opCounter + 1,
            };
        });
    },

    clearBoardArchive: (boardId: string) => {
        const boardListIds = get().boardListIdsByBoardId[boardId] ?? [];
        const listCardIds = get().listCardIdsByBoardId[boardId] ?? [];

        set((state) => {
            const nextBoardListById = { ...state.boardListById };
            const nextListCardById = { ...state.listCardById };

            boardListIds.forEach((id) => {
                delete nextBoardListById[id];
            });
            listCardIds.forEach((id) => {
                delete nextListCardById[id];
            });

            const nextBoardListIdsByBoardId = { ...state.boardListIdsByBoardId };
            const nextListCardIdsByBoardId = { ...state.listCardIdsByBoardId };
            delete nextBoardListIdsByBoardId[boardId];
            delete nextListCardIdsByBoardId[boardId];

            return {
                boardListById: nextBoardListById,
                listCardById: nextListCardById,
                boardListIdsByBoardId: nextBoardListIdsByBoardId,
                listCardIdsByBoardId: nextListCardIdsByBoardId,
                opCounter: state.opCounter + 1,
            };
        });
    },

    clearAllArchives: () => {
        set((state) => ({
            listCardById: {},
            boardListById: {},
            listCardIdsByBoardId: {},
            boardListIdsByBoardId: {},
            opCounter: state.opCounter + 1,
        }));
    },
    getListIdFromListCardId: (listCardId: string): string | undefined => {
        const relation = get().listCardById[listCardId];
        return relation ? relation.ListID : undefined;
    },
    getCardIdFromListCardId: (listCardId: string): string | undefined => {
        const relation = get().listCardById[listCardId];
        return relation ? relation.CardID : undefined;
    },
    getListIdFromBoardListId: (boardListId: string): string | undefined => {
        const relation = get().boardListById[boardListId];
        return relation ? relation.ListID : undefined;
    },
}));
