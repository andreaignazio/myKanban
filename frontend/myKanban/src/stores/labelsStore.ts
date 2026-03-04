import { create } from 'zustand';
import type { BoardEvent, BoardLabel, CardLabelLink, CreateBoardLabelRequest, PatchBoardLabelRequest } from './types';
import { api } from '@/api/api';
import type { EventPayloadEnvelope } from './audittypes';
import type { BoardDetailPatch } from './boardDetailStore';


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
        try {
            // console.log("Creating board label with payload:", payload);
            await api.post(`/boards/${boardId}/labels`, payload);
        } catch (error) {
            // console.error("Failed to create board label:", error);
        }
    },
    updateBoardLabel: async (boardId: string, labelId: string, payload: PatchBoardLabelRequest) => {
        try {
            // console.log("Updating board label with payload:", payload, "for labelId:", labelId);
            await api.patch(`/boards/${boardId}/labels/${labelId}`, payload);
        } catch (error) {
            // console.error("Failed to update board label:", error);
        }
    },
    deleteBoardLabel: async (boardId: string, labelId: string) => {
        try {
            await api.delete(`/boards/${boardId}/labels/${labelId}`);
        } catch (error) {
            // console.error("Failed to delete board label:", error);
        }
    },
    addCardLabel: async (boardId: string, cardId: string, labelId: string) => {
        try {
            "/:boardID/cards/:cardID/labels/:labelID"
            await api.post(`/boards/${boardId}/cards/${cardId}/labels/${labelId}`);
        } catch (error) {
            // console.error("Failed to add card label:", error);
        }
    },
    removeCardLabel: async (boardId: string, cardId: string, labelId: string) => {
        try {
            await api.delete(`/boards/${boardId}/cards/${cardId}/labels/${labelId}`);
        } catch (error) {
            // console.error("Failed to remove card label:", error);
        }
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
