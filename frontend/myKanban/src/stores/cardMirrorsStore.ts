import { create } from "zustand";
import { useAsyncKey, useAsyncRequestStore } from "./asyncRequestStore";
import { api } from "@/api/api";
import type { AxiosResponse } from "axios";
import type { Board, BoardList, CardMirrorsResponse, List, MirrorCardData, UserBoard } from "./types";
import { useBoardsStore } from "./boardsStore";
import { useBoardMembersStore } from "./boardMembersStore";
import type { ListCard } from "./boardDetailStore";

type CardMirrorsState = {

    mirrorIdsByCardId: Record<string, string[]>
    fetchCardMirrors: (workspaceId: string, cardId: string) => Promise<void>
    boardsById: Record<string, Board>
    userBoardsByBoardId: Record<string, UserBoard>
    listsById: Record<string, List>
    boardListsByBoardListId: Record<string, BoardList>
    listcardsById: Record<string, ListCard>
    getDataForMirrorCard: (cardId: string) => MirrorRenderData[]

    getMirrorRenderDataForBoardListCard: (boardListCardId: string) => MirrorRenderData | null

    mirrorDataByListCardId: Record<string, MirrorCardData[]>

    boardListCardIdsByCardId: Record<string, string[]>
    mirrorCardDataByBoardListCardId: Record<string, MirrorCardData>
}

export type MirrorRenderData = {
    mirrorCardId: string;
    board: Board;
    userBoard: UserBoard;
    list: List;
    boardList: BoardList;
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

    fetchCardMirrors: async (workspaceId: string, cardId: string) => {

        const response = await useAsyncRequestStore.getState().execute<AxiosResponse>(
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
                            boardListCardIds.push(boardListCardId)
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
                            }

                        }
                    })
                }
            })
    },
    getDataForMirrorCard: (cardId: string) => {
        const out: MirrorRenderData[] = [];
        const mirrorIds = get().mirrorIdsByCardId[cardId] || [];
        mirrorIds.forEach(mirrorId => {
            const mirrorDataForCard = get().mirrorDataByListCardId[mirrorId] || [];
            mirrorDataForCard.forEach(mirrorData => {
                const board = get().boardsById[mirrorData.BoardID];
                const userBoard = get().userBoardsByBoardId[mirrorData.BoardID];
                const list = get().listsById[mirrorData.ListID];
                const boardList = get().boardListsByBoardListId[mirrorData.BoardListID];
                const listCard = get().listcardsById[mirrorData.ListCardID];
                const isRootListCard = listCard.ID === listCard.RootID
                const isRootBoardList = boardList.ID === boardList.RootID
                const isRootBoardCard = isRootListCard && isRootBoardList
                if (board && userBoard && list && boardList && listCard) {
                    const result: MirrorRenderData = {
                        mirrorCardId: mirrorId,
                        board,
                        userBoard,
                        list,
                        boardList,
                        isRootListCard,
                        isRootBoardList,
                        isRootBoardCard
                    }
                    out.push(result);
                }
            })
        })
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
        const isRootListCard = listCard.ID === listCard.RootID
        const isRootBoardList = boardList.ID === boardList.RootID
        const isRootBoardCard = isRootListCard && isRootBoardList
        if (board && userBoard && list && boardList && listCard) {
            const result: MirrorRenderData = {
                mirrorCardId: boardListCardId,
                board,
                userBoard,
                list,
                boardList,
                isRootListCard,
                isRootBoardList,
                isRootBoardCard
            }
            return result;
        } else {
            return null;
        }

    }

}))













