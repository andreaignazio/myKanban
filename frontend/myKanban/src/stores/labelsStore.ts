import { create } from 'zustand';
import type { BoardEvent, BoardLabel, CardLabelLink, CreateBoardLabelRequest, PatchBoardLabelRequest } from './types';
import { api } from '@/api/api';
import type { EventPayloadEnvelope } from './audittypes';
import type { BoardDetailPatch } from './boardDetailStore';
import { useAsyncRequestStore, useAsyncKey } from './asyncRequestStore';


type useLabelsStoreState = {
    BoardLabelsById: Record<string, BoardLabel>;
    labelsIdsByBoardId: Record<string, string[]>;

    cardLabelsIdsByCardIdAndBoardId: Record<string, Record<string, string[]>>; // { [boardId]: { [cardId]: [labelId] } }
    replaceMemberCardsLabelsState: (payload: {
        boardLabels: BoardLabel[];
        cardLabelLinks: CardLabelLink[];
    }) => void;
    mergeMemberCardsLabelsPatch: (payload: {
        boardLabels: BoardLabel[];
        cardLabelLinks: CardLabelLink[];
    }) => void;
    mergeLabelsPatch(patch: BoardDetailPatch): void;
    replaceBoardLabelsPatch: (boardId: string, boardLabels: BoardLabel[], cardLabelsLinks: CardLabelLink[]) => void;
    createBoardLabel: (boardId: string, payload: CreateBoardLabelRequest) => Promise<void>;
    updateBoardLabel: (boardId: string, labelId: string, payload: PatchBoardLabelRequest) => Promise<void>;
    deleteBoardLabel: (boardId: string, labelId: string) => Promise<void>;
    addCardLabel: (boardId: string, cardId: string, labelId: string) => Promise<void>;
    removeCardLabel: (boardId: string, cardId: string, labelId: string) => Promise<void>;
    applyLabelEvent: (evt: BoardEvent) => void;
    applyUpsertBoardLabel: (BoardLabel: BoardLabel) => void;
    applyDeleteBoardLabel: (BoardLabel: BoardLabel) => void;
    applyAddCardLabel: (CardLabelLink: CardLabelLink) => void;
    applyRemoveCardLabel: (CardLabelLink: CardLabelLink) => void;
    getLabelsIdsForBoard: (boardId: string) => string[];
    getLabelsIdsForCard: (boardId: string, cardId: string) => string[];



}

export const useLabelsStore = create<useLabelsStoreState>((set, get) => ({
    BoardLabelsById: {},
    labelsIdsByBoardId: {},
    cardLabelsIdsByCardIdAndBoardId: {},

    replaceMemberCardsLabelsState: ({ boardLabels, cardLabelLinks }) => {
        const nextBoardLabelsById: Record<string, BoardLabel> = {};
        const nextLabelsIdsByBoardId: Record<string, string[]> = {};
        const nextCardLabelsIdsByCardIdAndBoardId: Record<string, Record<string, string[]>> = {};

        boardLabels.forEach((label) => {
            nextBoardLabelsById[label.ID] = label;
            if (!nextLabelsIdsByBoardId[label.BoardID]) {
                nextLabelsIdsByBoardId[label.BoardID] = [];
            }
            if (!nextLabelsIdsByBoardId[label.BoardID].includes(label.ID)) {
                nextLabelsIdsByBoardId[label.BoardID].push(label.ID);
            }
        });

        cardLabelLinks.forEach((link) => {
            const boardID = link.BoardID;
            if (!boardID) return;

            if (!nextCardLabelsIdsByCardIdAndBoardId[boardID]) {
                nextCardLabelsIdsByCardIdAndBoardId[boardID] = {};
            }
            if (!nextCardLabelsIdsByCardIdAndBoardId[boardID][link.CardID]) {
                nextCardLabelsIdsByCardIdAndBoardId[boardID][link.CardID] = [];
            }

            const current = nextCardLabelsIdsByCardIdAndBoardId[boardID][link.CardID];
            if (!current.includes(link.BoardLabelID)) {
                current.push(link.BoardLabelID);
            }
        });

        set({
            BoardLabelsById: nextBoardLabelsById,
            labelsIdsByBoardId: nextLabelsIdsByBoardId,
            cardLabelsIdsByCardIdAndBoardId: nextCardLabelsIdsByCardIdAndBoardId,
        });
    },

    mergeMemberCardsLabelsPatch: ({ boardLabels, cardLabelLinks }) => {
        if (boardLabels.length === 0 && cardLabelLinks.length === 0) {
            return;
        }

        set((state) => {
            const nextBoardLabelsById = { ...state.BoardLabelsById };
            const nextLabelsIdsByBoardId = { ...state.labelsIdsByBoardId };
            const nextCardLabelsIdsByCardIdAndBoardId = { ...state.cardLabelsIdsByCardIdAndBoardId };

            boardLabels.forEach((label) => {
                nextBoardLabelsById[label.ID] = label;
                if (!nextLabelsIdsByBoardId[label.BoardID]) {
                    nextLabelsIdsByBoardId[label.BoardID] = [];
                }
                if (!nextLabelsIdsByBoardId[label.BoardID].includes(label.ID)) {
                    nextLabelsIdsByBoardId[label.BoardID].push(label.ID);
                }
            });

            cardLabelLinks.forEach((link) => {
                const boardID = link.BoardID;
                if (!boardID) return;

                if (!nextCardLabelsIdsByCardIdAndBoardId[boardID]) {
                    nextCardLabelsIdsByCardIdAndBoardId[boardID] = {};
                }
                if (!nextCardLabelsIdsByCardIdAndBoardId[boardID][link.CardID]) {
                    nextCardLabelsIdsByCardIdAndBoardId[boardID][link.CardID] = [];
                }

                const current = nextCardLabelsIdsByCardIdAndBoardId[boardID][link.CardID];
                nextCardLabelsIdsByCardIdAndBoardId[boardID][link.CardID] = Array.from(new Set([...current, link.BoardLabelID]));
            });

            return {
                BoardLabelsById: nextBoardLabelsById,
                labelsIdsByBoardId: nextLabelsIdsByBoardId,
                cardLabelsIdsByCardIdAndBoardId: nextCardLabelsIdsByCardIdAndBoardId,
            };
        });
    },

    mergeLabelsPatch: (patch) => {

        const boardId = patch.Board.ID;
        const boardLabels = patch.BoardLabels || [];
        const cardLabelsLinks = patch.CardLabelLinks || [];
        if (boardLabels.length === 0 && cardLabelsLinks.length === 0) {
            return;
        }
        set((state) => {
            // console.log("Replacing board labels patch for board:", boardId, "with labels:", boardLabels, "and card-label links:", cardLabelsLinks);
            const nextBoardLabelsById = { ...state.BoardLabelsById };
            const nextLabelsIdsByBoardId = { ...state.labelsIdsByBoardId };
            const nextCardLabelsIdsByCardIdAndBoardId = { ...state.cardLabelsIdsByCardIdAndBoardId };

            boardLabels.forEach((label) => {
                nextBoardLabelsById[label.ID] = label;

            });
            if (!nextLabelsIdsByBoardId[boardId]) {
                nextLabelsIdsByBoardId[boardId] = [];
            }
            const newLabelIdsForBoard = boardLabels.map((label) => label.ID);
            nextLabelsIdsByBoardId[boardId] = Array.from(new Set([...(nextLabelsIdsByBoardId[boardId] || []), ...newLabelIdsForBoard]));


            const labelsByCardID = cardLabelsLinks.reduce((acc, link) => {
                if (!acc[link.CardID]) {
                    acc[link.CardID] = [];
                }
                acc[link.CardID].push(link.BoardLabelID);
                return acc;
            }, {} as Record<string, string[]>);

            nextCardLabelsIdsByCardIdAndBoardId[boardId] = { ...(nextCardLabelsIdsByCardIdAndBoardId[boardId] || {}), ...labelsByCardID };
            return {
                BoardLabelsById: nextBoardLabelsById,
                labelsIdsByBoardId: nextLabelsIdsByBoardId,
                cardLabelsIdsByCardIdAndBoardId: nextCardLabelsIdsByCardIdAndBoardId
            }
        })

    },


    replaceBoardLabelsPatch: (boardId, boardLabels, cardLabelsLinks) => set((state) => {
        // console.log("Replacing board labels patch for board:", boardId, "with labels:", boardLabels, "and card-label links:", cardLabelsLinks);
        const nextBoardLabelsById = { ...state.BoardLabelsById };
        const nextLabelsIdsByBoardId = { ...state.labelsIdsByBoardId };
        const nextCardLabelsIdsByCardIdAndBoardId = { ...state.cardLabelsIdsByCardIdAndBoardId };

        boardLabels.forEach((label) => {
            nextBoardLabelsById[label.ID] = label;

        });
        if (!nextLabelsIdsByBoardId[boardId]) {
            nextLabelsIdsByBoardId[boardId] = [];
        }
        nextLabelsIdsByBoardId[boardId] = boardLabels.map((label) => label.ID);


        const labelsByCardID = cardLabelsLinks.reduce((acc, link) => {
            if (!acc[link.CardID]) {
                acc[link.CardID] = [];
            }
            acc[link.CardID].push(link.BoardLabelID);
            return acc;
        }, {} as Record<string, string[]>);

        nextCardLabelsIdsByCardIdAndBoardId[boardId] = labelsByCardID;
        return {
            BoardLabelsById: nextBoardLabelsById,
            labelsIdsByBoardId: nextLabelsIdsByBoardId,
            cardLabelsIdsByCardIdAndBoardId: nextCardLabelsIdsByCardIdAndBoardId
        }
    }),

    createBoardLabel: async (boardId, payload: CreateBoardLabelRequest) => {
        await useAsyncRequestStore.getState().execute(
            "board:label:create",
            () => api.post(`/boards/${boardId}/labels`, payload),
            { successResetDelayMs: 2000 }
        );
    },
    updateBoardLabel: async (boardId: string, labelId: string, payload: PatchBoardLabelRequest) => {
        await useAsyncRequestStore.getState().execute(
            useAsyncKey("board:label:edit", labelId),
            () => api.patch(`/boards/${boardId}/labels/${labelId}`, payload),
            { successResetDelayMs: 1500 }
        );
    },
    deleteBoardLabel: async (boardId: string, labelId: string) => {
        await useAsyncRequestStore.getState().execute(
            useAsyncKey("board:label:delete", labelId),
            () => api.delete(`/boards/${boardId}/labels/${labelId}`),
            { successResetDelayMs: 1500 }
        );
    },
    addCardLabel: async (boardId: string, cardId: string, labelId: string) => {
        await useAsyncRequestStore.getState().execute(
            useAsyncKey("card:label:add", labelId),
            () => api.post(`/boards/${boardId}/cards/${cardId}/labels/${labelId}`),
            { successResetDelayMs: 1000 }
        );
    },
    removeCardLabel: async (boardId: string, cardId: string, labelId: string) => {
        await useAsyncRequestStore.getState().execute(
            useAsyncKey("card:label:remove", labelId),
            () => api.delete(`/boards/${boardId}/cards/${cardId}/labels/${labelId}`),
            { successResetDelayMs: 1000 }
        );
    },
    applyLabelEvent: (evt: BoardEvent) => {
        // console.log("Applying label event:", evt);
        if (evt.Type === "board.label.created" || evt.Type === "board.label.patched") {
            const Payload = (evt.Payload as EventPayloadEnvelope).StatePayload as BoardDetailPatch;
            const label = Payload.BoardLabels[0];
            get().applyUpsertBoardLabel(label);
        } else if (evt.Type === "board.label.deleted") {
            const Payload = (evt.Payload as EventPayloadEnvelope).StatePayload as BoardDetailPatch;
            const label = Payload.BoardLabels[0];
            get().applyDeleteBoardLabel(label);
        } else if (evt.Type === "card.label.added") {
            const Payload = (evt.Payload as EventPayloadEnvelope).StatePayload as BoardDetailPatch;
            const link = Payload.CardLabelLinks[0];
            get().applyAddCardLabel(link);
        } else if (evt.Type === "card.label.removed") {
            const Payload = (evt.Payload as EventPayloadEnvelope).StatePayload as BoardDetailPatch;
            const link = Payload.CardLabelLinks[0];
            get().applyRemoveCardLabel(link);
            // Handle label creation or update
        }
    },
    applyUpsertBoardLabel: (BoardLabel) => set((state) => {
        // console.log("Applying upsert for board label:", BoardLabel);
        const nextBoardLabelsById = { ...state.BoardLabelsById };
        nextBoardLabelsById[BoardLabel.ID] = BoardLabel;
        const nextLabelsIdsByBoardId = { ...state.labelsIdsByBoardId };
        if (!nextLabelsIdsByBoardId[BoardLabel.BoardID]) {
            nextLabelsIdsByBoardId[BoardLabel.BoardID] = [];
        }
        if (!nextLabelsIdsByBoardId[BoardLabel.BoardID].includes(BoardLabel.ID)) {
            nextLabelsIdsByBoardId[BoardLabel.BoardID].push(BoardLabel.ID);
        } else {
            const idx = nextLabelsIdsByBoardId[BoardLabel.BoardID].indexOf(BoardLabel.ID);
            if (idx !== -1) {
                nextLabelsIdsByBoardId[BoardLabel.BoardID][idx] = BoardLabel.ID;
            }
        }
        return {
            BoardLabelsById: nextBoardLabelsById,
            labelsIdsByBoardId: nextLabelsIdsByBoardId,
        }
    }),
    applyDeleteBoardLabel: (BoardLabel) => set((state) => {
        const nextBoardLabelsById = { ...state.BoardLabelsById };
        delete nextBoardLabelsById[BoardLabel.ID];
        return {
            BoardLabelsById: nextBoardLabelsById,
        }
    }),
    applyAddCardLabel: (CardLabelLink) => set((state) => {
        const { BoardID, CardID, BoardLabelID } = CardLabelLink;
        const nextCardLabelsIdsByCardIdAndBoardId = { ...state.cardLabelsIdsByCardIdAndBoardId };
        if (!nextCardLabelsIdsByCardIdAndBoardId[BoardID]) {
            nextCardLabelsIdsByCardIdAndBoardId[BoardID] = {};
        }
        if (!nextCardLabelsIdsByCardIdAndBoardId[BoardID][CardID]) {
            nextCardLabelsIdsByCardIdAndBoardId[BoardID][CardID] = [];
        }
        nextCardLabelsIdsByCardIdAndBoardId[BoardID][CardID].push(BoardLabelID);
        return {
            cardLabelsIdsByCardIdAndBoardId: nextCardLabelsIdsByCardIdAndBoardId,
        }
    }),
    applyRemoveCardLabel: (CardLabelLink) => set((state) => {
        //console.log("Applying remove card label with link:", CardLabelLink);
        const { BoardID, CardID, BoardLabelID } = CardLabelLink;
        //console.log("boardId:", BoardID, "cardId:", CardID, "labelId:", BoardLabelID);
        const nextCardLabelsIdsByCardIdAndBoardId = { ...state.cardLabelsIdsByCardIdAndBoardId };
        if (nextCardLabelsIdsByCardIdAndBoardId[BoardID] && nextCardLabelsIdsByCardIdAndBoardId[BoardID][CardID]) {
            // console.log("Before removing label, card labels are:", nextCardLabelsIdsByCardIdAndBoardId[BoardID][CardID]);
            nextCardLabelsIdsByCardIdAndBoardId[BoardID][CardID] = nextCardLabelsIdsByCardIdAndBoardId[BoardID][CardID].filter(id => id !== BoardLabelID);
            //console.log("After removing label, card labels are:", nextCardLabelsIdsByCardIdAndBoardId[BoardID][CardID]);
        }
        return {
            cardLabelsIdsByCardIdAndBoardId: nextCardLabelsIdsByCardIdAndBoardId,
        }
    }),
    getLabelsIdsForBoard: (boardId) => {
        const state = get();
        const labelIds = state.labelsIdsByBoardId[boardId] || [];
        return labelIds;
    },
    getLabelsIdsForCard: (boardId, cardId) => {
        const state = get();
        const labelIds = state.cardLabelsIdsByCardIdAndBoardId[boardId]?.[cardId] || [];
        return labelIds;
    },
}));
