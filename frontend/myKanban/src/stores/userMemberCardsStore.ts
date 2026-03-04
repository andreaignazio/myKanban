import { api } from "@/api/api";
import { create } from "zustand";

import { useAuditEntityStore } from "./auditEntityStore";
import type {
    Board,
    Card,
    List,
    ListCardRelation,
    UserEvent,
    UserMemberCardsResponse,
    Workspace
} from "./types";
import { useCardsStore } from "./cardsStore";
import { useListsStore } from "./listsStore";
import { useBoardsStore } from "./boardsStore";
import { useBoardDetailStore } from "./boardDetailStore";
import { useLabelsStore } from "./labelsStore";
import { useUserInboxStore } from "./userInboxStore";

type EntityWithID = { ID: string };

function toRecordById<T extends EntityWithID>(items: T[]): Record<string, T> {
    if (!items || items.length === 0) return {};
    return items.reduce((acc, item) => {
        acc[item.ID] = item;
        return acc;
    }, {} as Record<string, T>);
}

function uniqueIds(ids: string[]): string[] {
    return Array.from(new Set(ids));
}

function mergeUniqueById<T extends EntityWithID>(a: T[], b: T[]): T[] {
    return Object.values({ ...toRecordById(a), ...toRecordById(b) });
}

type UserMemberCardsStore = {
    cardIds: string[];
    isLoading: boolean;
    mergeMemberCardsData: (data: UserMemberCardsResponse) => void;
    mergeMemberCardsDataIntoCanonicalStores: (data: UserMemberCardsResponse, options?: { replaceLabels?: boolean }) => void;
    mergeEntititiesIntoAuditStore: (data: UserMemberCardsResponse) => void;
    fetchMyMemberCards: () => Promise<void>;
    deleteCardById: (cardId: string) => void;
    applyUserEvent: (evt: UserEvent) => void;
    reset: () => void;
    getListByCardId: (cardId: string) => List | undefined;
    getBoardByListId: (cardId: string, listId: string) => Board | undefined;
    isInboxCard: (cardId: string) => boolean;
    getAllBoardIdsForCardId: (cardId: string) => string[] | undefined;
    getAllBoardIdsForCardIds: (cardIds: string[]) => Record<string, string[]>;
    getAllBoardIdsForCardIdsFlat: (cardIds: string[]) => string[];
};

export const useUserMemberCardsStore = create<UserMemberCardsStore>((set, get) => ({
    cardIds: [],
    isLoading: false,

    mergeMemberCardsData: (data) => {
        const cards: Card[] = data.Cards ?? [];
        // get().mergeEntititiesIntoAuditStore(data);
        get().mergeMemberCardsDataIntoCanonicalStores(data);

        set((state) => ({
            cardIds: uniqueIds([...state.cardIds, ...cards.map((card) => card.ID)]),
        }));
    },


    mergeMemberCardsDataIntoCanonicalStores: (data: UserMemberCardsResponse, options) => {
        const cards: Card[] = data.Cards ?? [];
        const lists: List[] = data.Lists ?? [];
        const listCards: ListCardRelation[] = data.ListCards ?? [];
        const boards: Board[] = data.Boards ?? [];
        const boardLabels = data.BoardLabels ?? [];
        const cardLabelLinks = data.CardLabelLinks ?? [];
        const boardLists = data.BoardLists ?? [];
        const inboxCards: Card[] = data.InboxCards ?? [];


        const cardsMap = toRecordById(cards);
        const listsMap = toRecordById(lists);
        const boardsMap = toRecordById(boards);

        useCardsStore.getState().mergeCardsPatch(cardsMap);
        useListsStore.getState().mergeListsPatch(listsMap);
        useBoardsStore.getState().mergeBoardsPatch(boardsMap);
        useBoardDetailStore.getState().mergeListCardsPatch(toRecordById(listCards));
        useBoardDetailStore.getState().mergeBoardListsPatch(toRecordById(boardLists));
        useUserInboxStore.getState().replaceInboxCardIds(inboxCards.map(card => card.ID));

        // console.log("Merged cards, lists, boards, listCards, boardLists into canonical stores");

        if (options?.replaceLabels) {
            useLabelsStore.getState().replaceMemberCardsLabelsState({
                boardLabels,
                cardLabelLinks,
            })
            return;
        }

        useLabelsStore.getState().mergeMemberCardsLabelsPatch({
            boardLabels,
            cardLabelLinks,
        })


    },

    isInboxCard: (cardId: string) => {
        const inboxCardIds = useUserInboxStore.getState().inboxCardsIds
        return inboxCardIds.includes(cardId)
    },








    mergeEntititiesIntoAuditStore: (data: UserMemberCardsResponse) => {
        useAuditEntityStore.getState().mergeAuditEntities({
            Cards: data.Cards,
            Lists: data.Lists,
            Boards: data.Boards,
            Workspaces: data.Workspaces,
            BoardLabels: data.BoardLabels,
            CardLabelLinks: data.CardLabelLinks,
            ListCards: data.ListCards as Array<Record<string, unknown> & { ID: string }>,
        });
    },


    fetchMyMemberCards: async () => {
        set({ isLoading: true });
        try {
            const response = await api.get("/cards/user/me/membercards");
            const data = response.data as UserMemberCardsResponse;

            console.log("Fetched user member cards data:", data);
            get().mergeMemberCardsDataIntoCanonicalStores(data, { replaceLabels: true });
            set({
                cardIds: uniqueIds((data.Cards ?? []).map((card) => card.ID)),
            });
            console.log("User member card IDs:", get().cardIds);
        } catch {
            set({ cardIds: [] });
        } finally {
            set({ isLoading: false });
        }
    },

    deleteCardById: (cardId) => {
        set((state) => ({
            cardIds: state.cardIds.filter((id) => id !== cardId),
        }));
    },

    applyUserEvent: (evt) => {
        switch (evt.Type) {
            case "cards.user.member.added": {
                const payload = evt.Payload.CardsUserMemberAddedPayload;
                if (!payload) return;
                get().mergeMemberCardsData(payload);
                return;
            }
            case "cards.user.member.removed": {
                const payload = evt.Payload.CardsUserMemberRemovedPayload;
                if (!payload) return;
                get().deleteCardById(payload.CardID);
                return;
            }
            default:
                return;
        }
    },

    reset: () => {
        set({ cardIds: [], isLoading: false });
    },

    getListByCardId: (cardId: string): List | undefined => {
        const listCards = useBoardDetailStore.getState().listCardById
        const listCard = Object.values(listCards).filter((lc) => lc.CardID === cardId)[0]
        if (!listCard) return undefined;
        const list = useListsStore.getState().listsById[listCard.ListID]
        return list;
    },
    getBoardByListId: (cardId: string, listId: string): Board | undefined => {
        const boardLists = useBoardDetailStore.getState().boardListById
        const boardList = Object.values(boardLists).filter((bl) => bl.ListID === listId)[0]
        if (!boardList) return undefined;
        const board = useBoardsStore.getState().boardsById[boardList.BoardID]
        return board;

    },
    getAllBoardIdsForCardId: (cardId: string): string[] => {
        const listCards = useBoardDetailStore.getState().listCardById
        const boardLists = useBoardDetailStore.getState().boardListById
        const listsForCard = Object.values(listCards).filter((lc) => lc.CardID === cardId)
        const listIds = listsForCard.map((lc) => lc.ListID)
        const blForCard = Object.values(boardLists).filter((bl) => listIds.includes(bl.ListID))
        const boardIds = blForCard.map((bl) => bl.BoardID)
        return boardIds
    },
    getAllBoardIdsForCardIds: (cardIds: string[]): Record<string, string[]> => {
        const boardIdsForCardIds: Record<string, string[]> = {};
        cardIds.forEach((cardId) => {
            boardIdsForCardIds[cardId] = get().getAllBoardIdsForCardId(cardId) ?? [];
        });
        return boardIdsForCardIds;
    },
    getAllBoardIdsForCardIdsFlat: (cardIds: string[]): string[] => {
        const boardIdsSet = new Set<string>();
        cardIds.forEach((cardId) => {
            const boardIds = get().getAllBoardIdsForCardId(cardId) ?? [];
            boardIds.forEach((boardId) => boardIdsSet.add(boardId));
        });
        return Array.from(boardIdsSet);
    }

}));

