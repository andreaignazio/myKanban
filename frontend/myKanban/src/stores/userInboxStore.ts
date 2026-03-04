import { create } from "zustand";
import type { CreateInboxCardRequest, InboxCard, InboxCardResponse, MirrorCardToInboxRequest, UserEvent, UserInboxCardResponse } from "./types";
import { api } from "@/api/api";
import { useCardsStore } from "./cardsStore";
import { use } from "react";
import { useExternalRefStore } from "./externaRefStore";

type UserInboxStore = {
    inboxCardsById: Record<string, InboxCard>
    inboxCardsIds: string[]
    fetchInboxCards: () => Promise<void>
    mirrorCardToInbox: (boardId: string, cardId: string, payload: MirrorCardToInboxRequest) => Promise<InboxCard | undefined>
    createInboxCard: (payload: CreateInboxCardRequest) => Promise<InboxCard | undefined>
    getInboxCardByRootCardID: (rootCardID: string) => InboxCard | undefined
    applyInboxEvent: (evt: UserEvent) => void
    replaceInboxCardIds: (newIds: string[]) => void
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
            useExternalRefStore.getState().mergeExternalRootRefs(data.ExternalRootsByID);
            // console.log("Merged external root refs:", data.ExternalRootsByID)
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
                const payload = evt.Payload.InboxRootCardMovedPayload
                if (!payload) {
                    return
                }
                useExternalRefStore.getState().mergeExternalRootRefs(payload.ExternalRootsByID)
            }
        }
    },
    replaceInboxCardIds: (newIds: string[]) => {
        set({
            inboxCardsIds: newIds
        })
    },



}))
