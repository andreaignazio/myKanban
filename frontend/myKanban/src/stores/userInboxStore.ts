import { create } from "zustand";
import type { Card, CardProps, CopyInboxToListRequest, CreateInboxCardRequest, InboxCard, InboxCardResponse, MirrorCardToInboxRequest, MoveInboxToListRequest, PatchCardDetailsRequest, PatchCardPropsRequest, UserEvent, UserInboxCardResponse } from "./types";
import { api } from "@/api/api";
import { useCardsStore } from "./cardsStore";
import { useAsyncKey, useAsyncRequestStore } from "./asyncRequestStore";
import type { AsyncRequestKey } from "./asyncRequestTypes";
import { useBoardDetailStore, type ListCard } from "./boardDetailStore";



type UserInboxStore = {
    inboxCardsById: Record<string, InboxCard>
    inboxCardsIds: string[]
    fetchInboxCards: () => Promise<void>
    mirrorCardToInbox: (boardId: string, cardId: string, payload: MirrorCardToInboxRequest, optimisticInboxCardID?: string, rollbackInboxCardIds?: string[]) => Promise<InboxCard | undefined>
    createInboxCard: (payload: CreateInboxCardRequest) => Promise<InboxCard | undefined>
    getInboxCardByRootCardID: (rootCardID: string) => InboxCard | undefined
    applyInboxEvent: (evt: UserEvent) => void
    replaceInboxCardIds: (newIds: string[]) => void
    detatchInboxCard: (cardID: string) => Promise<void>
    moveInboxCard: (cardID: string, request: MoveInboxToListRequest, rollbackInboxCardIds?: string[]) => Promise<void>
    moveInboxCardToListInBoard: (cardID: string, targetWorkspaceID: string, targetBoardID: string, targetListID: string, request: MoveInboxToListRequest, optimisticListCardID?: string, rollbackListCardIds?: string[]) => Promise<void>
    copyInboxCardToListInBoard: (cardID: string, targetWorkspaceID: string, targetBoardID: string, targetListID: string, request: CopyInboxToListRequest) => Promise<void>
    patchInboxCardDetails: (cardID: string, payload: PatchCardDetailsRequest, asyncKey?: AsyncRequestKey) => Promise<Card | null>
    patchInboxCardProps: (cardID: string, props: CardProps) => Promise<Card | null>
    setInboxCardIds: (newIds: string[]) => void
    mergeInboxCardEntities: (cards: InboxCard[]) => void
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

    mirrorCardToInbox: async (boardId: string, cardId: string, payload: MirrorCardToInboxRequest, optimisticInboxCardID?: string, rollbackInboxCardIds?: string[]) => {
        let mirroredInboxCard: InboxCard | undefined

        const rollbackOptimisticMirror = () => {
            if (!optimisticInboxCardID) return

            set((state) => {
                const nextInboxCardsById = { ...state.inboxCardsById }
                delete nextInboxCardsById[optimisticInboxCardID]

                return {
                    inboxCardsById: nextInboxCardsById,
                    inboxCardsIds: rollbackInboxCardIds ?? state.inboxCardsIds.filter((id) => id !== optimisticInboxCardID)
                }
            })
        }

        const insertInboxCardId = (currentIds: string[], inboxCardId: string) => {
            if (optimisticInboxCardID && currentIds.includes(optimisticInboxCardID)) {
                return currentIds.map((id) => id === optimisticInboxCardID ? inboxCardId : id)
            }

            const nextIds = [...currentIds]
            if (payload.BeforeID) {
                const beforeIndex = nextIds.indexOf(payload.BeforeID)
                if (beforeIndex >= 0) {
                    nextIds.splice(beforeIndex, 0, inboxCardId)
                    return nextIds
                }
            }

            if (payload.InsertAt === "start") {
                nextIds.unshift(inboxCardId)
                return nextIds
            }

            nextIds.push(inboxCardId)
            return nextIds
        }

        try {
            await useAsyncRequestStore.getState().execute(
                "card:mirror:inbox",
                () => api.post(`/boards/${boardId}/cards/${cardId}/mirrortoinbox`, payload),
                {
                    successResetDelayMs: 2000,
                    onSuccess: (response) => {
                        const data = response.data as InboxCard
                        mirroredInboxCard = data

                        set((state) => {
                            const nextInboxCardsById = { ...state.inboxCardsById }
                            if (optimisticInboxCardID) {
                                delete nextInboxCardsById[optimisticInboxCardID]
                            }
                            nextInboxCardsById[data.ID] = data

                            return {
                                inboxCardsById: nextInboxCardsById,
                                inboxCardsIds: insertInboxCardId(state.inboxCardsIds, data.ID)
                            }
                        })
                    },
                    onError: () => {
                        rollbackOptimisticMirror()
                    }
                }
            )

            return mirroredInboxCard
        }
        catch (error) {
            rollbackOptimisticMirror()
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
        const { inboxCardsById } = get();
        const inboxCard = Object.values(inboxCardsById).find(card => card.RootListCardID === rootCardID);
        return inboxCard;
    },
    applyInboxEvent: (evt: UserEvent) => {
        switch (evt.Type) {
            case "inbox.cards.invalidated": {
                const payload = evt.Payload?.InboxCardsInvalidatedPayload
                if (payload?.InvalidatedListCardIDs?.length) {
                    useBoardDetailStore.getState().invalidateRootBoardCacheForListCards(payload.InvalidatedListCardIDs)
                }
                void get().fetchInboxCards()
                return
            }
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
    detatchInboxCard: async (cardID: string) => {
        const prevInboxCardsById = get().inboxCardsById
        const prevInboxCardsIds = get().inboxCardsIds
        const removedInboxCardIds = Object.values(prevInboxCardsById)
            .filter((inboxCard) => inboxCard.CardID === cardID)
            .map((inboxCard) => inboxCard.ID)

        if (removedInboxCardIds.length > 0) {
            const nextInboxCardsById = { ...prevInboxCardsById }
            removedInboxCardIds.forEach((inboxEntryId) => {
                delete nextInboxCardsById[inboxEntryId]
            })
            set({
                inboxCardsById: nextInboxCardsById,
                inboxCardsIds: prevInboxCardsIds.filter((id) => !removedInboxCardIds.includes(id))
            })
        }

        try {
            await useAsyncRequestStore.getState().execute(
                "inbox:card:detatch",
                () => api.delete(`/inbox/cards/${cardID}`),
                {
                    successResetDelayMs: 2000,
                    onError: () => {
                        set({
                            inboxCardsById: prevInboxCardsById,
                            inboxCardsIds: prevInboxCardsIds,
                        })
                    }
                }
            )
        } catch (error) {
            set({
                inboxCardsById: prevInboxCardsById,
                inboxCardsIds: prevInboxCardsIds,
            })
        }
    },
    moveInboxCard: async (cardID: string, request: MoveInboxToListRequest, rollbackInboxCardIds?: string[]) => {
        const rollbackOptimisticMove = () => {
            if (!rollbackInboxCardIds) return

            set({
                inboxCardsIds: rollbackInboxCardIds,
            })
        }

        try {
            await useAsyncRequestStore.getState().execute(
                "card:move:inbox",
                () => api.patch(`/inbox/cards/${cardID}/move`, request),
                {
                    successResetDelayMs: 2000,
                    onError: () => {
                        rollbackOptimisticMove()
                    }
                }
            )
        } catch (error) {
            rollbackOptimisticMove()
            // console.error("Failed to reorder inbox card:", error);
        }
    },
    moveInboxCardToListInBoard: async (cardID: string,
        targetWorkspaceID: string,
        targetBoardID: string,
        targetListID: string,
        request: MoveInboxToListRequest,
        optimisticListCardID?: string,
        rollbackListCardIds?: string[]) => {
        const removedInboxCards = Object.values(get().inboxCardsById)
            .filter((inboxCard) => inboxCard.CardID === cardID)
        const removedInboxCardIds = removedInboxCards.map((inboxCard) => inboxCard.ID)
        const prevInboxCardsById = get().inboxCardsById
        const prevInboxCardsIds = get().inboxCardsIds

        if (removedInboxCardIds.length > 0) {
            const nextInboxCardsById = { ...prevInboxCardsById }
            removedInboxCardIds.forEach((inboxEntryId) => {
                delete nextInboxCardsById[inboxEntryId]
            })
            set({
                inboxCardsById: nextInboxCardsById,
                inboxCardsIds: prevInboxCardsIds.filter((id) => !removedInboxCardIds.includes(id))
            })
        }

        const rollbackOptimisticMove = () => {
            if (removedInboxCardIds.length > 0) {
                set({
                    inboxCardsById: prevInboxCardsById,
                    inboxCardsIds: prevInboxCardsIds,
                })
            }
            if (!optimisticListCardID) return
            const boardDetailStore = useBoardDetailStore.getState()
            boardDetailStore.removeListCardsByIds([optimisticListCardID])
            if (rollbackListCardIds) {
                boardDetailStore.setListCardIdsByListId(targetListID, rollbackListCardIds)
            }
        }

        try {
            await useAsyncRequestStore.getState().execute("inbox:card:move:board:list",
                () => api.patch(`/inbox/cards/${cardID}/workspaces/${targetWorkspaceID}/boards/${targetBoardID}/lists/${targetListID}/move`, request),
                {
                    successResetDelayMs: 2000,
                    onSuccess: (response) => {
                        const data = response.data as ListCard;
                        const patch = { [data.ID]: data }
                        if (optimisticListCardID) {
                            const boardDetailStore = useBoardDetailStore.getState()
                            const currentListCardIds = boardDetailStore.listCardIdsByListId[targetListID] ?? []
                            const nextListCardIds = currentListCardIds.map((id) => id === optimisticListCardID ? data.ID : id)
                            boardDetailStore.removeListCardsByIds([optimisticListCardID])
                            boardDetailStore.setListCardIdsByListId(targetListID, nextListCardIds)
                            boardDetailStore.mergeListCardsPatch(patch)
                        } else {
                            useBoardDetailStore.getState().mergeListCardsPatch(patch)
                        }


                    },
                    onError: () => {
                        rollbackOptimisticMove()
                    }
                }
            )


        } catch (error) {
            rollbackOptimisticMove()
            // console.error("Failed to move inbox card to list in board:", error);
        }
    },
    copyInboxCardToListInBoard: async (cardID: string,
        targetWorkspaceID: string,
        targetBoardID: string,
        targetListID: string,
        request: CopyInboxToListRequest) => {
        try {
            await useAsyncRequestStore.getState().execute(
                "inbox:card:copy:board:list",
                () => api.post(`/inbox/cards/${cardID}/workspaces/${targetWorkspaceID}/boards/${targetBoardID}/lists/${targetListID}/copy`, request),
                {
                    successResetDelayMs: 2000,
                }
            )
        } catch (error) {
            // console.error("Failed to copy inbox card to list in board:", error);
        }
    },
    patchInboxCardProps: async (cardID: string, props: CardProps) => {
        const payload: PatchCardPropsRequest = { Props: props }

        return useAsyncRequestStore.getState().execute<Card>(
            useAsyncKey("card:edit:props", cardID),
            async () => {
                const res = await api.patch(`/inbox/cards/${cardID}/props`, payload)
                console.log("Patched inbox card props response:", res.data)
                return res.data as Card
            },
            {
                successResetDelayMs: 1500,
                onSuccess: (updatedCard) => {
                    console.log("Updated inbox card props:", updatedCard)
                    useCardsStore.getState().mergeCardsPatch({ [updatedCard.ID]: updatedCard })
                }
            }
        )
    },
    patchInboxCardDetails: async (cardID: string, payload: PatchCardDetailsRequest, asyncKey?: AsyncRequestKey) => {
        return useAsyncRequestStore.getState().execute<Card>(
            asyncKey ?? useAsyncKey("card:edit:details", cardID),
            async () => {
                const res = await api.patch(`/inbox/cards/${cardID}`, payload)
                return res.data as Card
            },
            {
                successResetDelayMs: 1500,
                onSuccess: (updatedCard) => {
                    useCardsStore.getState().mergeCardsPatch({ [updatedCard.ID]: updatedCard })
                }
            }
        )
    },
    setInboxCardIds: (newIds: string[]) => {
        set({
            inboxCardsIds: newIds
        })
    },
    mergeInboxCardEntities: (cards: InboxCard[]) => {
        set((state) => {
            const newCardsById = { ...state.inboxCardsById }
            cards.forEach((card) => {
                newCardsById[card.ID] = card
            })

            return {
                inboxCardsById: newCardsById,
            }
        })
    },



}))
