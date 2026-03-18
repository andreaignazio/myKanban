import { create } from "zustand";
import { useAsyncKey, useAsyncRequestStore } from "./asyncRequestStore";
import { api } from "@/api/api";
import type { AxiosResponse } from "axios";
import type { Board, BoardLabel, BoardList, CardLabelLink, CardMirrorsResponse, List, MirrorCardData, User, UserBoard } from "./types";
import type { ListCard } from "./boardDetailStore";


export type OrderedRenderDataForCard = {
    MirrorDataById: Record<string, MirrorRenderData>
    BoardListCardIdsByBoard: Record<string, string[]>
}


type CardMirrorsState = {

    mirrorIdsByCardId: Record<string, string[]>
    fetchCardMirrors: (workspaceId: string, cardId: string) => Promise<void>
    boardsById: Record<string, Board>
    userBoardsByBoardId: Record<string, UserBoard>
    listsById: Record<string, List>
    boardListsByBoardListId: Record<string, BoardList>
    listcardsById: Record<string, ListCard>
    boardLabelsByBoardId: Record<string, BoardLabel[]>
    cardLabelLinksByCardId: Record<string, CardLabelLink[]>
    usersById: Record<string, User>
    getDataForMirrorCard: (cardId: string) => MirrorRenderData[]

    getMirrorRenderDataForBoardListCard: (boardListCardId: string) => MirrorRenderData | null

    getOrderedDataForCardId: (cardId: string, overrideRenderData?: MirrorRenderData[]) => OrderedRenderDataForCard

    mirrorDataByListCardId: Record<string, MirrorCardData[]>

    boardListCardIdsByCardId: Record<string, string[]>
    mirrorCardDataByBoardListCardId: Record<string, MirrorCardData>
    fetchOpCounterByCardId: Record<string, number>
}

export type MirrorRenderData = {
    mirrorCardId: string;
    board: Board;
    userBoard?: UserBoard;
    list: List;
    boardList: BoardList;
    boardLabels: BoardLabel[];
    boardOwner?: User;
    isRootListCard?: boolean;
    isRootBoardList?: boolean;
    isRootBoardCard?: boolean;
}

export const useCardMirrorsStore = create<CardMirrorsState>()((set, get) => ({
    mirrorIdsByCardId: {},
    listcardsById: {},
    boardsById: {},
    userBoardsByBoardId: {},
    listsById: {},
    boardListsByBoardListId: {},
    mirrorDataByListCardId: {},
    boardListCardIdsByCardId: {},
    mirrorCardDataByBoardListCardId: {},
    fetchOpCounterByCardId: {},
    boardLabelsByBoardId: {},
    cardLabelLinksByCardId: {},
    usersById: {},

    fetchCardMirrors: async (workspaceId: string, cardId: string) => {

        await useAsyncRequestStore.getState().execute<AxiosResponse>(
            useAsyncKey("card:mirror:fetch", workspaceId, cardId),
            () => api.get(`/workspaces/${workspaceId}/cards/${cardId}/mirrors`),
            {
                successResetDelayMs: 2000,
                onSuccess(result) {
                    const data = result.data as CardMirrorsResponse;
                    const mirrorIds = data.ListCards.map(lc => lc.ID);

                    const boardListCardIds = [] as string[];
                    const mirrorCardDataByBoardListCardId: Record<string, MirrorCardData> = {};
                    data.ListCards.forEach(listCard => {
                        const mirrorData = data.MirrorDataByListCardID[listCard.ID];
                        mirrorData.forEach(md => {
                            const boardId = md.BoardID;
                            const boardListCardId = `${boardId}-${listCard.ID}`
                            if (!boardListCardIds.includes(boardListCardId)) {
                                boardListCardIds.push(boardListCardId)
                            }

                            mirrorCardDataByBoardListCardId[boardListCardId] = {
                                UserID: md.UserID,
                                BoardID: md.BoardID,
                                ListID: md.ListID,
                                BoardListID: md.BoardListID,
                                ListCardID: md.ListCardID,
                                CardID: md.CardID
                            }

                        })
                    })


                    const listcardsById: Record<string, ListCard> = {};
                    data.ListCards.forEach(listCard => {
                        listcardsById[listCard.ID] = listCard;
                    });

                    const boardsById: Record<string, Board> = {};
                    data.Boards.forEach(board => {
                        boardsById[board.ID] = board;
                    });
                    const userBoardsByBoardId: Record<string, UserBoard> = {};
                    data.UserBoards.forEach(userBoard => {
                        userBoardsByBoardId[userBoard.BoardID] = userBoard;
                    });
                    const listsById: Record<string, List> = {};
                    data.Lists.forEach(list => {
                        listsById[list.ID] = list;
                    });
                    const boardListsByBoardListId: Record<string, BoardList> = {};
                    data.BoardLists.forEach(boardList => {
                        boardListsByBoardListId[boardList.ID] = boardList;
                    })

                    const boardLabelsByBoardId: Record<string, BoardLabel[]> = {};
                    data.BoardLabels.forEach(label => {
                        if (!boardLabelsByBoardId[label.BoardID]) {
                            boardLabelsByBoardId[label.BoardID] = [];
                        }
                        boardLabelsByBoardId[label.BoardID].push(label);
                    });

                    const cardLabelLinksByCardId: Record<string, CardLabelLink[]> = {};
                    data.CardLabelLinks.forEach(link => {
                        if (!cardLabelLinksByCardId[link.CardID]) {
                            cardLabelLinksByCardId[link.CardID] = [];
                        }
                        cardLabelLinksByCardId[link.CardID].push(link);
                    });

                    const usersById: Record<string, User> = {};
                    data.Users.forEach(user => {
                        usersById[user.ID] = user;
                    });

                    set((state) => {
                        return {
                            mirrorIdsByCardId: {
                                ...state.mirrorIdsByCardId,
                                [cardId]: mirrorIds
                            },
                            boardsById: {
                                ...state.boardsById,
                                ...boardsById
                            },
                            userBoardsByBoardId: {
                                ...state.userBoardsByBoardId,
                                ...userBoardsByBoardId
                            },
                            listsById: {
                                ...state.listsById,
                                ...listsById
                            },
                            boardListsByBoardListId: {
                                ...state.boardListsByBoardListId,
                                ...boardListsByBoardListId
                            },
                            listcardsById: {
                                ...state.listcardsById,
                                ...listcardsById
                            },
                            mirrorDataByListCardId: {
                                ...state.mirrorDataByListCardId,
                                ...data.MirrorDataByListCardID
                            },
                            boardListCardIdsByCardId: {
                                ...state.boardListCardIdsByCardId,
                                [cardId]: boardListCardIds
                            },
                            mirrorCardDataByBoardListCardId: {
                                ...state.mirrorCardDataByBoardListCardId,
                                ...mirrorCardDataByBoardListCardId
                            },
                            boardLabelsByBoardId: {
                                ...state.boardLabelsByBoardId,
                                ...boardLabelsByBoardId
                            },
                            cardLabelLinksByCardId: {
                                ...state.cardLabelLinksByCardId,
                                ...cardLabelLinksByCardId
                            },
                            usersById: {
                                ...state.usersById,
                                ...usersById
                            },
                            fetchOpCounterByCardId: {
                                ...state.fetchOpCounterByCardId,
                                [cardId]: (state.fetchOpCounterByCardId[cardId] ?? 0) + 1
                            },
                        }
                    })
                }
            })
    },
    getDataForMirrorCard: (cardId: string) => {
        const out: MirrorRenderData[] = [];
        const boardListCardIds = get().boardListCardIdsByCardId[cardId] || [];
        boardListCardIds.forEach(boardListCardId => {
            const mirrorData = get().mirrorCardDataByBoardListCardId[boardListCardId];
            if (!mirrorData) return;
            const board = get().boardsById[mirrorData.BoardID];
            const userBoard = get().userBoardsByBoardId[mirrorData.BoardID];
            const list = get().listsById[mirrorData.ListID];
            const boardList = get().boardListsByBoardListId[mirrorData.BoardListID];
            const listCard = get().listcardsById[mirrorData.ListCardID];
            if (!board || !list || !boardList || !listCard) return;
            const isRootListCard = listCard.ID === listCard.RootID;
            const isRootBoardList = boardList.ID === boardList.RootID;
            const isRootBoardCard = isRootListCard && isRootBoardList;
            const boardLabels = resolveBoardLabelsForCard(get(), mirrorData.CardID, mirrorData.BoardID);
            const boardOwner = get().usersById[board.CreatedByUserID];
            out.push({
                mirrorCardId: boardListCardId,
                board,
                userBoard,
                list,
                boardList,
                boardLabels,
                boardOwner,
                isRootListCard,
                isRootBoardList,
                isRootBoardCard,
            });
        });
        return out;
    },
    getMirrorRenderDataForBoardListCard: (boardListCardId: string) => {
        const mirrorCardData = get().mirrorCardDataByBoardListCardId[boardListCardId];
        if (!mirrorCardData) return null;
        const board = get().boardsById[mirrorCardData.BoardID];
        const userBoard = get().userBoardsByBoardId[mirrorCardData.BoardID];
        const list = get().listsById[mirrorCardData.ListID];
        const boardList = get().boardListsByBoardListId[mirrorCardData.BoardListID];
        const listCard = get().listcardsById[mirrorCardData.ListCardID];
        if (!board || !list || !boardList || !listCard) {
            return null;
        }
        const isRootListCard = listCard.ID === listCard.RootID
        const isRootBoardList = boardList.ID === boardList.RootID
        const isRootBoardCard = isRootListCard && isRootBoardList
        const boardLabels = resolveBoardLabelsForCard(get(), mirrorCardData.CardID, mirrorCardData.BoardID)
        const boardOwner = board ? get().usersById[board.CreatedByUserID] : undefined
        const result: MirrorRenderData = {
            mirrorCardId: boardListCardId,
            board,
            userBoard,
            list,
            boardList,
            boardLabels,
            boardOwner,
            isRootListCard,
            isRootBoardList,
            isRootBoardCard
        }
        return result;

    },

    getOrderedDataForCardId: (cardId: string, overrideRenderData?: MirrorRenderData[]) => {
        const renderData = overrideRenderData ?? get().getDataForMirrorCard(cardId);
        let rootBoardId: string | null = null;
        const dataByBoardId: Record<string, MirrorRenderData[]> = {};
        const mirrorDataById: Record<string, MirrorRenderData> = {};
        renderData.forEach(data => {
            const boardId = data.board.ID;
            if (data.isRootBoardCard) {
                rootBoardId = boardId;
            }
            if (!dataByBoardId[boardId]) {
                dataByBoardId[boardId] = [];
            }
            dataByBoardId[boardId].push(data);
            mirrorDataById[data.mirrorCardId] = data;
        })

        const orderedBoardIds = Object.keys(dataByBoardId);
        orderedBoardIds.sort((idA, idB) => {
            if (idA === rootBoardId) return -1;
            if (idB === rootBoardId) return 1;
            const boardA = get().boardsById[idA];
            const boardB = get().boardsById[idB];
            if (!boardA || !boardB) return 0;
            return boardA.Name.localeCompare(boardB.Name);
        });

        const orderedRecord: Record<string, string[]> = {};
        orderedBoardIds.forEach(boardId => {
            const entries = dataByBoardId[boardId];
            entries.sort((a, b) => {
                if (a.isRootBoardList && !b.isRootBoardList) return -1;
                if (!a.isRootBoardList && b.isRootBoardList) return 1;
                return (a.list.Title ?? "").localeCompare(b.list.Title ?? "");
            });
            orderedRecord[boardId] = entries.map(e => e.mirrorCardId);
        });

        return {
            MirrorDataById: mirrorDataById,
            BoardListCardIdsByBoard: orderedRecord
        }







    }

}))

function resolveBoardLabelsForCard(state: CardMirrorsState, cardId: string, boardId: string): BoardLabel[] {
    const links = state.cardLabelLinksByCardId[cardId] ?? [];
    const boardLinks = links.filter(l => l.BoardID === boardId);
    const labelsForBoard = state.boardLabelsByBoardId[boardId] ?? [];
    const labelsById: Record<string, BoardLabel> = {};
    labelsForBoard.forEach(l => { labelsById[l.ID] = l; });
    return boardLinks.map(link => labelsById[link.BoardLabelID]).filter(Boolean);
}

