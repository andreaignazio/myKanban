import { create } from "zustand";
import type { BoardEvent, CardComment, CardCommentResponse, CreateCardCommentRequest } from "./types";
import { api } from "@/api/api";
import { useUserStore } from "./userStore";
import type { BoardDetailPatch } from "./boardDetailStore";


type CardCommentsStore = {
    commentsById: Record<string, CardComment>
    commentsIdsByCardId: Record<string, string[]>
    fetchCommentsForCard: (boardId: string, cardId: string) => Promise<void>
    mergeCommentsPatch: (patch: BoardDetailPatch) => void
    createCommentForCard: (boardId: string, cardId: string, payload: CreateCardCommentRequest) => Promise<void>
    editCommentForCard: (boardId: string, cardId: string, commentId: string, payload: CreateCardCommentRequest) => Promise<void>
    deleteCommentForCard: (boardId: string, cardId: string, commentId: string) => Promise<void>
    applyCardCommentEvent: (evt: BoardEvent) => void
    apllyCardCommentCreatedEvent: (evt: BoardEvent) => void
    applyCardCommentPatchedEvent: (evt: BoardEvent) => void
    applyCardCommentDeletedEvent: (evt: BoardEvent) => void
}
export const useCardCommentsStore = create<CardCommentsStore>((set, get) => ({
    commentsById: {},
    commentsIdsByCardId: {},
    fetchCommentsForCard: async (boardId: string, cardId: string) => {
        try {
            const response = await api.get(`/boards/${boardId}/cards/${cardId}/comments`);
            const commentResponse: CardCommentResponse = response.data;
            const users = commentResponse.Users;
            useUserStore.getState().mergeUsers(users);
            set((state) => {
                const newCommentsById = { ...state.commentsById };
                const commentIds: string[] = [];
                const comments = commentResponse.CardComments;
                comments.forEach((comment) => {
                    newCommentsById[comment.ID] = comment;
                    commentIds.push(comment.ID);
                });
                return {
                    commentsById: newCommentsById,
                    commentsIdsByCardId: {
                        ...state.commentsIdsByCardId,
                        [cardId]: commentIds,
                    },
                };
            });
        } catch (error) {
            // console.error("Failed to fetch comments for card:", error);
        }
    },
    mergeCommentsPatch: (patch: BoardDetailPatch) => {
        const cardComments = patch.CardComments || [];
        if (cardComments.length === 0) {
            return;
        }
        set((state) => {
            const newCommentsById = { ...state.commentsById };
            const newCommentsIdsByCardId = { ...state.commentsIdsByCardId };
            cardComments.forEach((comment) => {
                newCommentsById[comment.ID] = comment;
                if (!newCommentsIdsByCardId[comment.CardID]) {
                    newCommentsIdsByCardId[comment.CardID] = [];
                }
                if (!newCommentsIdsByCardId[comment.CardID].includes(comment.ID)) {
                    newCommentsIdsByCardId[comment.CardID].push(comment.ID);
                }
            });
            return {
                commentsById: newCommentsById,
                commentsIdsByCardId: newCommentsIdsByCardId,
            };
        });
    },

    createCommentForCard: async (boardId: string, cardId: string, payload: CreateCardCommentRequest) => {
        try {
            await api.post(`/boards/${boardId}/cards/${cardId}/comments`, payload);
        } catch (error) {
            // console.error("Failed to create comment for card:", error);
        }
    },
    editCommentForCard: async (boardId: string, cardId: string, commentId: string, payload: CreateCardCommentRequest) => {
        try {
            await api.patch(`/boards/${boardId}/cards/${cardId}/comments/${commentId}`, payload);
        } catch (error) {
            // console.error("Failed to edit comment for card:", error);
        }
    },
    deleteCommentForCard: async (boardId: string, cardId: string, commentId: string) => {
        try {
            await api.delete(`/boards/${boardId}/cards/${cardId}/comments/${commentId}`);
        } catch (error) {
            // console.error("Failed to delete comment for card:", error);
        }
    },
    applyCardCommentEvent: (evt: BoardEvent) => {
        switch (evt.Type) {
            case "card.comment.created": {
                // console.log("Applying card.comment.created event", evt)
                get().apllyCardCommentCreatedEvent(evt);
                break
            }
            case "card.comment.patched": {
                // console.log("Applying card.comment.patched event", evt)
                get().applyCardCommentPatchedEvent(evt);
                break
            }
            case "card.comment.deleted": {
                // console.log("Applying card.comment.deleted event", evt)
                get().applyCardCommentDeletedEvent(evt);
                break
            }
        }
    },
    apllyCardCommentCreatedEvent: (evt: BoardEvent) => {
        const Payload = evt.Payload.StatePayload as unknown as BoardDetailPatch
        const comment = Payload.CardComments ? Payload.CardComments[0] : null
        // console.log("Applying card.comment.created event with comment data:", comment)
        if (comment) {
            set((state) => {
                const newCommentsById = { ...state.commentsById, [comment.ID]: comment };
                const existingCommentIds = state.commentsIdsByCardId[comment.CardID] || [];
                const newCommentIds = existingCommentIds.includes(comment.ID)
                    ? existingCommentIds
                    : [comment.ID, ...existingCommentIds];
                return {
                    commentsById: newCommentsById,
                    commentsIdsByCardId: {
                        ...state.commentsIdsByCardId,
                        [comment.CardID]: newCommentIds,
                    },
                };
            });
        }
        // console.log("Finished applying card.comment.created event", get().commentsById, get().commentsIdsByCardId)
    },
    applyCardCommentPatchedEvent: (evt: BoardEvent) => {
        const Payload = evt.Payload.StatePayload as unknown as BoardDetailPatch
        const comment = Payload.CardComments ? Payload.CardComments[0] : null
        if (comment) {
            set((state) => {
                const existingComment = state.commentsById[comment.ID];
                if (existingComment) {
                    const updatedComment = { ...existingComment, ...comment };
                    const newCommentsById = { ...state.commentsById, [comment.ID]: updatedComment };
                    return {
                        commentsById: newCommentsById,
                        commentsIdsByCardId: {
                            ...state.commentsIdsByCardId,
                            [comment.CardID]: state.commentsIdsByCardId[comment.CardID],
                        },
                    };
                }
                return state;
            });
        }
    },
    applyCardCommentDeletedEvent: (evt: BoardEvent) => {
        const Payload = evt.Payload.StatePayload as unknown as BoardDetailPatch
        const comment = Payload.CardComments ? Payload.CardComments[0] : null
        if (comment) {
            set((state) => {
                const newCommentsById = { ...state.commentsById };
                delete newCommentsById[comment.ID];
                const existingCommentIds = state.commentsIdsByCardId[comment.CardID] || [];
                const newCommentIds = existingCommentIds.filter((id) => id !== comment.ID);
                return {
                    commentsById: newCommentsById,
                    commentsIdsByCardId: {
                        ...state.commentsIdsByCardId,
                        [comment.CardID]: newCommentIds,
                    },
                };
            });
        }
    },
}));
