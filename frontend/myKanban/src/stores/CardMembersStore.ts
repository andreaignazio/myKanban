import { create } from "zustand";
import type { AddCardMemberRequest, BoardEvent, Card, CardMember } from "./types";
import { api } from "@/api/api";
import type { EventPayloadEnvelope } from "./audittypes";
import type { BoardDetailPatch } from "./boardDetailStore";


type CardMembersState = {
    cardMemberIdsByCardId: Record<string, string[]>;
    cardMembersById: Record<string, CardMember>;
    replaceCardMembers: (members: CardMember[]) => void;
    mergeCardMembersPatch: (patch: BoardDetailPatch) => void;
    addMemberToCard: (boardID: string, cardID: string, memberID: string) => Promise<void>;
    removeMemberFromCard: (boardID: string, cardID: string, memberID: string) => Promise<void>;
    getUserIDsByCardID: (cardID: string) => string[];
    applyCardMemberEvent: (evt: BoardEvent) => void;
}

export const useCardMembersStore = create<CardMembersState>((set, get) => ({
    cardMemberIdsByCardId: {} as Record<string, string[]>,
    cardMembersById: {} as Record<string, CardMember>,

    mergeCardMembersPatch: (patch: BoardDetailPatch) => {
        console.log("[CardMembersStore] Merging card members patch", patch);
        const cardMembers = patch.CardMembers || [];
        if (cardMembers.length === 0) {
            return;
        }
        set((state) => {
            const newCardMembersById = { ...state.cardMembersById };
            const newCardMemberIdsByCardId = { ...state.cardMemberIdsByCardId };

            cardMembers.forEach((member) => {
                newCardMembersById[member.ID] = member;
                const currentIds = newCardMemberIdsByCardId[member.CardID] ?? [];
                if (!currentIds.includes(member.ID)) {
                    newCardMemberIdsByCardId[member.CardID] = [...currentIds, member.ID];
                } else {
                    newCardMemberIdsByCardId[member.CardID] = currentIds;
                }
            });

            return {
                cardMembersById: newCardMembersById,
                cardMemberIdsByCardId: newCardMemberIdsByCardId
            };
        });
    },
    replaceCardMembers: (members: CardMember[]) => {
        const cardMemberIdsByCardId = members.reduce((acc, member) => {
            if (!acc[member.CardID]) {
                acc[member.CardID] = [];
            }
            acc[member.CardID].push(member.ID);
            return acc;
        }, {} as Record<string, string[]>);

        const cardMembersById = members.reduce((acc, member) => {
            acc[member.ID] = member;
            return acc;
        }, {} as Record<string, CardMember>);

        set(() => ({
            cardMemberIdsByCardId: cardMemberIdsByCardId,
            cardMembersById
        }));
    },
    addMemberToCard: async (boardID: string, cardID: string, memberID: string) => {
        try {
            // /:boardID/cards /: cardID / members /
            const payload: AddCardMemberRequest = {
                MemberID: memberID
            }
            await api.post(`/boards/${boardID}/cards/${cardID}/members`, payload);
        } catch (error) {
            // console.error("Error adding member to card:", error);
        }
    },
    removeMemberFromCard: async (boardID: string, cardID: string, memberID: string) => {
        try {
            await api.delete(`/boards/${boardID}/cards/${cardID}/members/${memberID}`);
        } catch (error) {
            // console.error("Error removing member from card:", error);
        }
    },
    getUserIDsByCardID: (cardID: string) => {
        const memberIDs = get().cardMemberIdsByCardId[cardID] || [];
        return memberIDs
            .map(memberID => get().cardMembersById[memberID]?.UserID)
            .filter((userID): userID is string => Boolean(userID));
    },
    applyCardMemberEvent: (evt: BoardEvent) => {
        // console.log("[CardMembersStore] Applying card member event", evt);
        const Type = evt.Type as "card.member.added" | "card.member.removed" | "cards.user.member.added" | "cards.user.member.removed";
        const payload = (evt.Payload as EventPayloadEnvelope).StatePayload as BoardDetailPatch;
        const cardMember: CardMember | null = payload.CardMembers ? payload.CardMembers[0] : null;

        switch (Type) {
            case "card.member.added":
            case "cards.user.member.added":

                if (cardMember) {
                    set((state) => {
                        const newMemberIdsByCardId = { ...state.cardMemberIdsByCardId };
                        const currentIds = newMemberIdsByCardId[cardMember.CardID] ?? [];
                        newMemberIdsByCardId[cardMember.CardID] = currentIds.includes(cardMember.ID)
                            ? currentIds
                            : [...currentIds, cardMember.ID];

                        return {
                            cardMemberIdsByCardId: newMemberIdsByCardId,
                            cardMembersById: {
                                ...state.cardMembersById,
                                [cardMember.ID]: cardMember
                            }
                        }
                    });
                }
                break;
            case "card.member.removed":
            case "cards.user.member.removed":
                if (cardMember) {
                    set((state) => {
                        const newMemberIdsByCardId = { ...state.cardMemberIdsByCardId };
                        if (newMemberIdsByCardId[cardMember.CardID]) {
                            newMemberIdsByCardId[cardMember.CardID] = newMemberIdsByCardId[cardMember.CardID].filter(id => id !== cardMember.ID);
                        }
                        const newCardMembersById = { ...state.cardMembersById };
                        delete newCardMembersById[cardMember.ID];
                        return {
                            cardMemberIdsByCardId: newMemberIdsByCardId,
                            cardMembersById: newCardMembersById
                        };
                    });
                }
                break;
        }
    }

}))
