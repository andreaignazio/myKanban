import { create } from "zustand";
import type { CreateInboxCardRequest, InboxCard, InboxCardResponse, MirrorCardToInboxRequest, MoveInboxToListRequest, UserEvent, UserInboxCardResponse } from "./types";
import { api } from "@/api/api";
import { useCardsStore } from "./cardsStore";
import { useAsyncRequestStore } from "./asyncRequestStore";
import { useBoardDetailStore, type ListCard } from "./boardDetailStore";



type UserInboxStore = {
    inboxCardsById: Record<string, InboxCard>
    inboxCardsIds: string[]
    fetchInboxCards: () => Promise<void>
    mirrorCardToInbox: (boardId: string, cardId: string, payload: MirrorCardToInboxRequest) => Promise<InboxCard | undefined>
    createInboxCard: (payload: CreateInboxCardRequest) => Promise<InboxCard | undefined>
    getInboxCardByRootCardID: (rootCardID: string) => InboxCard | undefined
    applyInboxEvent: (evt: UserEvent) => void
    replaceInboxCardIds: (newIds: string[]) => void
    moveInboxCardToListInBoard: (cardID: string, targetWorkspaceID: string, targetBoardID: string, targetListID: string, request: MoveInboxToListRequest, optimisticListCardID?: string) => Promise<void>
}

export const useUserInboxStore = create<UserInboxStore>((set, get) => ({
    inboxCardsById: {},
    inboxCardsIds: [],
    fetchInboxCards: async () => {
        try {
            const response = await api.get("/inbox/cards");
            const data = response.data as UserInboxCardResponse
            // console.log("Fetched inbox cards:", data)
            useCardsStore.getState().mergeCardsPatch(data.Cards);
            const cardsById: Record<string, InboxCard> = {};
            data.InboxCards.forEach(inboxCard => {
                cardsById[inboxCard.ID] = inboxCard;
            });
            set({
                inboxCardsById: cardsById,
                inboxCardsIds: data.InboxCards.map(inboxCard => inboxCard.ID)
            });
        } catch (error) {
            // console.error("Failed to fetch inbox cards:", error);
        }
    },

    mirrorCardToInbox: async (boardId: string, cardId: string, payload: MirrorCardToInboxRequest) => {

        try {
            const response = await api.post(`/boards/${boardId}/cards/${cardId}/mirrortoinbox`, payload);
            const data = response.data as InboxCard
            // console.log("Mirrored card to inbox:", data)
            set((state) => ({
                inboxCardsById: {
                    ...state.inboxCardsById,
                    [data.ID]: data
                },
                inboxCardsIds: [data.ID, ...state.inboxCardsIds]
            }));
            return data;
        }
        catch (error) {
            // console.error("Failed to mirror card to inbox:", error);
        }

    },
    createInboxCard: async (payload: CreateInboxCardRequest) => {
        try {
            const response = await api.post(`/inbox/cards`, payload);
            const data = response.data as InboxCardResponse
            // console.log("Created inbox card:", data)

            const inboxCard = data.InboxCards[0];
            const card = data.Cards[inboxCard.CardID];
            if (typeof card === "object") {
                useCardsStore.getState().mergeCardsPatch({ [card.ID]: card });
            }
            set((state) => ({
                inboxCardsById: {
                    ...state.inboxCardsById,
                    [inboxCard.ID]: inboxCard
                },
                inboxCardsIds: [inboxCard.ID, ...state.inboxCardsIds]
            }));
            return inboxCard;
        }
        catch (error) {
            // console.error("Failed to create inbox card:", error);
        }
    },
    getInboxCardByRootCardID: (rootCardID: string) => {
        const { inboxCardsById, inboxCardsIds } = get();
        const inboxCard = Object.values(inboxCardsById).find(card => card.RootListCardID === rootCardID);
        return inboxCard;
    },
    applyInboxEvent: (evt: UserEvent) => {
        switch (evt.Type) {
            case "inbox.rootcard.moved": {
                return
            }
        }
    },
    replaceInboxCardIds: (newIds: string[]) => {
        set({
            inboxCardsIds: newIds
        })
    },
    moveInboxCardToListInBoard: async (cardID: string,
        targetWorkspaceID: string,
        targetBoardID: string,
        targetListID: string,
        request: MoveInboxToListRequest,
        optimisticListCardID?: string) => {
        try {
            await useAsyncRequestStore.getState().execute("inbox:card:move:board:list",
                () => api.patch(`/inbox/cards/${cardID}/workspaces/${targetWorkspaceID}/boards/${targetBoardID}/lists/${targetListID}/move`, request),
                {
                    successResetDelayMs: 2000,
                    onSuccess: (response) => {
                        const inboxEntryIdsToRemove = Object.values(get().inboxCardsById)
                            .filter((inboxCard) => inboxCard.CardID === cardID)
                            .map((inboxCard) => inboxCard.ID)
                        const nextInboxCardsById = { ...get().inboxCardsById };
                        inboxEntryIdsToRemove.forEach((inboxEntryId) => {
                            delete nextInboxCardsById[inboxEntryId]
                        })
                        const nextInboxCardsIds = get().inboxCardsIds.filter((id) => !inboxEntryIdsToRemove.includes(id))
                        set({
                            inboxCardsById: nextInboxCardsById,
                            inboxCardsIds: nextInboxCardsIds
                        });
                        const data = response.data as ListCard;
                        const patch = { [data.ID]: data }
                        if (optimisticListCardID) {
                            const boardDetailStore = useBoardDetailStore.getState()
                            const currentListCardIds = boardDetailStore.listCardIdsByListId[targetListID] ?? []
                            const nextListCardIds = currentListCardIds.map((id) => id === optimisticListCardID ? data.ID : id)
                            boardDetailStore.setListCardIdsByListId(targetListID, nextListCardIds)
                            boardDetailStore.mergeListCardsPatch(patch)
                        } else {
                            useBoardDetailStore.getState().mergeListCardsPatch(patch)
                        }


                    }
                }
            )


        } catch (error) {
            if (optimisticListCardID) {
                const boardDetailStore = useBoardDetailStore.getState()
                const currentListCardIds = boardDetailStore.listCardIdsByListId[targetListID] ?? []
                boardDetailStore.setListCardIdsByListId(targetListID, currentListCardIds.filter((id) => id !== optimisticListCardID))
            }
            // console.error("Failed to move inbox card to list in board:", error);
        }
    }



}))
