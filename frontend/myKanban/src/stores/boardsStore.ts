
import { api } from "@/api/api";
import { create } from "zustand";

import type { Board, CreateBoardRequest, PatchUserBoardPropsRequest, UserBoard, UserWorkspacesBoardsResponse, WorkspaceEvent } from "./types";
import type { BoardDetailPatch } from "./boardDetailStore";
import type { ShareOffer, BoardShareOfferWithUserDetails } from "./shareOfferTypes";
import { useCacheStore } from "./cacheStore";
import { useShareOffersStore } from "./shareOffersStore";
import { useAsyncKey, useAsyncRequestStore } from "./asyncRequestStore";
import type { AsyncRequestKey } from "./asyncRequestTypes";
import { useWorkspaceStore, type UserWorkspaceData } from "./workspaceStore";
export type UserBoardData = {
    Boards: Board[];
    UserBoards: UserBoard[];
    CanModifyByBoardID?: Record<string, boolean>;
}

export type CreateBoardPayload = {
    Name: string;
    Visibility: string;
    Props?: Record<string, unknown>;
}

type PendingWorkspaceBoardTargetsResponse = {
    OfferedBoards: Board[];
    RequestedBoards: Board[];
    ShareOffers: ShareOffer[];
}

export type BoardStatus = "locked" | "offered" | "requested" | null;

export type BoardsStore = {
    OpCounter: number;
    boardsById: Record<string, Board>;
    boardIdsByWorkspaceId: Record<string, string[]>;

    offerIdByBoardId: Record<string, string>;
    pendingOfferedBoardIdsByWorkspaceId: Record<string, string[]>;
    pendingRequestedBoardIdsByWorkspaceId: Record<string, string[]>;
    userBoardsById: Record<string, UserBoard>;
    canModifyByBoardIDByWorkspaceId: Record<string, Record<string, boolean>>;

    closedBoardById: Record<string, Board>;
    closedBoardIdsByWorkspaceId: Record<string, string[]>;
    closedUserBoardsById: Record<string, UserBoard>;

    isSendingRequest: boolean;
    isRequestSuccessful: boolean;
    getIsSuccess: () => boolean;
    fetchBoardsForWorkspace: (workspaceId: string) => Promise<void>;

    fetchUserBoardsAndWorkspaces: () => Promise<void>;

    fetchPendingOfferTargetBoardsForWorkspace: (workspaceId: string) => Promise<void>;
    addPendingOfferedBoardId: (workspaceId: string, boardId: string, offerId?: string) => void;
    addPendingRequestedBoardId: (workspaceId: string, boardId: string, offerId?: string) => void;
    removePendingOfferedBoardId: (workspaceId: string, boardId: string) => void;
    removePendingRequestedBoardId: (workspaceId: string, boardId: string) => void;
    getBoardStatus: (boardId: string, workspaceId?: string) => BoardStatus;
    getPendingAccessRequestCountByBoardId?: never;
    updatePendingAccessRequestCountByBoardId?: never;
    createBoardInWorkspace: (workspaceId: string, payload: CreateBoardRequest) => Promise<void>;
    patchBoard: (boardId: string, payload: { Name?: string; Visibility?: string; Props?: Record<string, unknown> }, asyncKey?: AsyncRequestKey) => Promise<void>;
    patchMyUserBoardProps: (boardId: string, payload: PatchUserBoardPropsRequest, asyncKey?: AsyncRequestKey) => Promise<void>;
    applyCrateBoard: (data: UserBoardData) => void;

    mergeBoardsPatch: (payload: Record<string, Partial<Board>>) => void;
    mergeBoards: (boards: Board[]) => void;
    mergeUserBoardPatch: (userBoards: Record<string, UserBoard>) => void;

    mergeUserBoardRelation: (userBoard: UserBoard) => void;
    removeUserBoardRelation: (boardID: string) => void;
    findWorkspaceIdByBoardId: (boardId: string) => string | undefined;
    mergeBoardsInWorkspace: (workspaceID: string, boards: Record<string, Board>) => void;
    applyOptimisticCloseBoard: (workspaceId: string, boardId: string) => void;
    closeBoardInWorkspace: (workspaceId: string, boardId: string, asyncKey?: AsyncRequestKey) => Promise<void>;
    replaceBoardPendingSuspensionSelection: (workspaceId: string, markedBoardIDs: string[], unmarkedBoardIDs: string[], asyncKey?: AsyncRequestKey) => Promise<void>;
    restoreBoardInWorkspace: (workspaceId: string, boardId: string) => Promise<void>;
    purgeBoardInWorkspace: (workspaceId: string, boardId: string) => Promise<void>;
    getClosedBoardsInWorkspace: (workspaceId: string) => Promise<void>;
    applyBoardClosedEvent: (payload: WorkspaceEvent) => void;
    applyRemoveBoardFromClosed: (data: UserBoardData) => void;
    applyRemoveIdsFromClosed: (workspaceId: string, boardIds: string[]) => void;
}

export const useBoardsStore = create<BoardsStore>((set, get) => ({
    OpCounter: 0,
    boardsById: {}, //usiamo boardID come chiave anche per userBoardsById per semplificare l'accesso
    boardIdsByWorkspaceId: {},
    offerIdByBoardId: {},
    pendingOfferedBoardIdsByWorkspaceId: {},
    pendingRequestedBoardIdsByWorkspaceId: {},
    userBoardsById: {},
    canModifyByBoardIDByWorkspaceId: {},

    closedBoardById: {},
    closedBoardIdsByWorkspaceId: {},
    closedUserBoardsById: {},

    isRequestSuccessful: false,
    isSendingRequest: false,
    getIsSuccess: () => get().isRequestSuccessful,

    fetchUserBoardsAndWorkspaces: async () => {
        await useAsyncRequestStore.getState().execute("workspace:boards:fetch:all",
            () => api.get(`/boards`),
            {
                successResetDelayMs: 3000,
                onSuccess: (response) => {
                    const data: UserWorkspacesBoardsResponse = response.data;
                    const boardsById: Record<string, Board> = data.Boards.reduce((acc, board) => {
                        acc[board.ID] = board;
                        return acc;
                    }, {} as Record<string, Board>);
                    const userBoardsById: Record<string, UserBoard> = data.UserBoards.reduce((acc, userBoard) => {
                        acc[userBoard.BoardID] = userBoard;
                        return acc;
                    }, {} as Record<string, UserBoard>);
                    const nextBoardIdsByWorkspaceId: Record<string, string[]> = {};
                    Object.entries(data.BoardIDsByWorkspaceID).forEach(([workspaceId, boardIds]) => {
                        nextBoardIdsByWorkspaceId[workspaceId] = boardIds;
                    });
                    set((state) => ({
                        boardsById: { ...state.boardsById, ...boardsById },
                        boardIdsByWorkspaceId: { ...state.boardIdsByWorkspaceId, ...nextBoardIdsByWorkspaceId },
                        userBoardsById: { ...state.userBoardsById, ...userBoardsById },
                    }));
                    const wsData: UserWorkspaceData = {
                        Workspaces: data.Workspaces,
                        UserWorkspaces: data.UserWorkspaces,
                        WorkspaceSubscriptions: data.WorkspaceSubscriptions

                    }
                    useWorkspaceStore.getState().mergeWorkspaceData(wsData)

                }
            },
        );
    },

    fetchBoardsForWorkspace: async (workspaceId: string) => {
        const key = useAsyncKey("workspace:boards:fetch", workspaceId);
        await useAsyncRequestStore.getState().execute(key, async () => {
            try {
                const [boardsResponse, pendingBoardsResponse, pendingAccessRequestsResponse] = await Promise.all([
                    api.get(`/workspaces/${workspaceId}/boards`),
                    api.get(`/shareoffers/workspaces/${workspaceId}/pending/boards`),
                    api.get(`/shareoffers/workspaces/${workspaceId}/pending/board-access-requests`),
                ]);

                const data: UserBoardData = boardsResponse.data;
                const pendingData: PendingWorkspaceBoardTargetsResponse = pendingBoardsResponse.data;
                const pendingBoardAccessRequests: BoardShareOfferWithUserDetails[] = pendingAccessRequestsResponse.data ?? [];
                const pendingShareOffers = pendingData.ShareOffers || [];

                useShareOffersStore.getState().setBoardReceivedRequestsForBoards(pendingBoardAccessRequests);
                useCacheStore.getState().upsertShareOffers(pendingShareOffers);

                const latestOfferByBoardId: Record<string, ShareOffer> = {};
                pendingShareOffers.forEach((offer) => {
                    if (offer.TargetType !== "board") return;
                    const current = latestOfferByBoardId[offer.TargetID];
                    if (!current || new Date(offer.CreatedAt).getTime() > new Date(current.CreatedAt).getTime()) {
                        latestOfferByBoardId[offer.TargetID] = offer;
                    }
                });
                const offerIdByBoardIdFromApi = Object.entries(latestOfferByBoardId).reduce((acc, [boardId, offer]) => {
                    acc[boardId] = offer.ID;
                    return acc;
                }, {} as Record<string, string>);

                const boardsById: Record<string, Board> = data.Boards.reduce((acc, board) => {
                    acc[board.ID] = board;
                    return acc;
                }, {} as Record<string, Board>);

                const boardIds = data.Boards.map((board) => board.ID);

                const pendingBoards = [...(pendingData.OfferedBoards || []), ...(pendingData.RequestedBoards || [])];
                const pendingBoardsById: Record<string, Board> = pendingBoards.reduce((acc, board) => {
                    acc[board.ID] = board;
                    return acc;
                }, {} as Record<string, Board>);
                const pendingBoardIds = pendingBoards.map((board) => board.ID);

                const offeredBoardIds = Array.from(new Set((pendingData.OfferedBoards || []).map((board) => board.ID)));
                const requestedBoardIds = Array.from(new Set((pendingData.RequestedBoards || []).map((board) => board.ID)));

                const userBoardsById: Record<string, UserBoard> = data.UserBoards.reduce((acc, userBoard) => {
                    acc[userBoard.BoardID] = userBoard;
                    return acc;
                }, {} as Record<string, UserBoard>);

                const canModifyByBoardIDFromApi: Record<string, boolean> = data.CanModifyByBoardID ?? {};

                set((state) => ({
                    boardsById: { ...state.boardsById, ...pendingBoardsById, ...boardsById },
                    boardIdsByWorkspaceId: {
                        ...state.boardIdsByWorkspaceId,
                        [workspaceId]: Array.from(new Set([...(state.boardIdsByWorkspaceId[workspaceId] || []), ...pendingBoardIds, ...boardIds]))
                    },
                    pendingOfferedBoardIdsByWorkspaceId: {
                        ...state.pendingOfferedBoardIdsByWorkspaceId,
                        [workspaceId]: Array.from(new Set([...(state.pendingOfferedBoardIdsByWorkspaceId[workspaceId] || []), ...offeredBoardIds]))
                    },
                    pendingRequestedBoardIdsByWorkspaceId: {
                        ...state.pendingRequestedBoardIdsByWorkspaceId,
                        [workspaceId]: Array.from(new Set([...(state.pendingRequestedBoardIdsByWorkspaceId[workspaceId] || []), ...requestedBoardIds]))
                    },
                    offerIdByBoardId: (() => {
                        const nextOfferIdByBoardId = { ...state.offerIdByBoardId };
                        const workspaceBoardIds = Array.from(new Set([
                            ...(state.boardIdsByWorkspaceId[workspaceId] || []),
                            ...pendingBoardIds,
                            ...boardIds,
                        ]));
                        workspaceBoardIds.forEach((id) => {
                            delete nextOfferIdByBoardId[id];
                        });
                        Object.assign(nextOfferIdByBoardId, offerIdByBoardIdFromApi);
                        return nextOfferIdByBoardId;
                    })(),
                    userBoardsById: { ...state.userBoardsById, ...userBoardsById },
                    canModifyByBoardIDByWorkspaceId: {
                        ...state.canModifyByBoardIDByWorkspaceId,
                        [workspaceId]: { ...canModifyByBoardIDFromApi },
                    },
                    OpCounter: state.OpCounter + 1,
                }));


            } catch (error) {
                // console.error("Error fetching boards for workspace", workspaceId, error);
                throw error;
            }
        });
    },
    fetchPendingOfferTargetBoardsForWorkspace: async (workspaceId: string) => {
        try {
            const response = await api.get(`/shareoffers/workspaces/${workspaceId}/pending/boards`);
            const data: PendingWorkspaceBoardTargetsResponse = response.data;
            const pendingShareOffers = data.ShareOffers || [];

            useCacheStore.getState().upsertShareOffers(pendingShareOffers);

            const latestOfferByBoardId: Record<string, ShareOffer> = {};
            pendingShareOffers.forEach((offer) => {
                if (offer.TargetType !== "board") return;
                const current = latestOfferByBoardId[offer.TargetID];
                if (!current || new Date(offer.CreatedAt).getTime() > new Date(current.CreatedAt).getTime()) {
                    latestOfferByBoardId[offer.TargetID] = offer;
                }
            });
            const offerIdByBoardIdFromApi = Object.entries(latestOfferByBoardId).reduce((acc, [boardId, offer]) => {
                acc[boardId] = offer.ID;
                return acc;
            }, {} as Record<string, string>);

            const offeredBoards = data.OfferedBoards || [];
            const requestedBoards = data.RequestedBoards || [];
            const pendingBoards = [...offeredBoards, ...requestedBoards];

            const pendingBoardsById: Record<string, Board> = pendingBoards.reduce((acc, board) => {
                acc[board.ID] = board;
                return acc;
            }, {} as Record<string, Board>);

            const offeredBoardIds = Array.from(new Set(offeredBoards.map((board) => board.ID)));
            const requestedBoardIds = Array.from(new Set(requestedBoards.map((board) => board.ID)));
            const allPendingIds = Array.from(new Set([...offeredBoardIds, ...requestedBoardIds]));

            set((state) => ({
                boardsById: { ...state.boardsById, ...pendingBoardsById },
                boardIdsByWorkspaceId: {
                    ...state.boardIdsByWorkspaceId,
                    [workspaceId]: Array.from(new Set([...(state.boardIdsByWorkspaceId[workspaceId] || []), ...allPendingIds]))
                },
                pendingOfferedBoardIdsByWorkspaceId: {
                    ...state.pendingOfferedBoardIdsByWorkspaceId,
                    [workspaceId]: Array.from(new Set([...(state.pendingOfferedBoardIdsByWorkspaceId[workspaceId] || []), ...offeredBoardIds]))
                },
                pendingRequestedBoardIdsByWorkspaceId: {
                    ...state.pendingRequestedBoardIdsByWorkspaceId,
                    [workspaceId]: Array.from(new Set([...(state.pendingRequestedBoardIdsByWorkspaceId[workspaceId] || []), ...requestedBoardIds]))
                },
                offerIdByBoardId: (() => {
                    const nextOfferIdByBoardId = { ...state.offerIdByBoardId };
                    const workspaceBoardIds = Array.from(new Set([...(state.boardIdsByWorkspaceId[workspaceId] || []), ...allPendingIds]));
                    workspaceBoardIds.forEach((id) => {
                        delete nextOfferIdByBoardId[id];
                    });
                    Object.assign(nextOfferIdByBoardId, offerIdByBoardIdFromApi);
                    return nextOfferIdByBoardId;
                })(),
            }));
        } catch (error) {
            throw error;
        }
    },
    getBoardStatus: (boardId: string, workspaceId?: string) => {
        const resolvedWorkspaceId = workspaceId ?? get().findWorkspaceIdByBoardId(boardId);
        if (!resolvedWorkspaceId) return "locked";

        const hasUserBoardRelation = !!get().userBoardsById[boardId];
        if (hasUserBoardRelation) return null;

        const offered = (get().pendingOfferedBoardIdsByWorkspaceId[resolvedWorkspaceId] || []).includes(boardId);
        const requested = (get().pendingRequestedBoardIdsByWorkspaceId[resolvedWorkspaceId] || []).includes(boardId);

        if (offered) return "offered";
        if (requested) return "requested";
        return "locked";
    },
    getPendingAccessRequestCountByBoardId: undefined,
    updatePendingAccessRequestCountByBoardId: undefined,
    createBoardInWorkspace: async (workspaceId: string, payload: CreateBoardRequest) => {
        const key = useAsyncKey("workspace:board:create", workspaceId);
        await useAsyncRequestStore.getState().execute(key, () => api.post(`/workspaces/${workspaceId}/boards`, payload), {
            onSuccess: (response) => {
                const data: UserBoardData = response.data;
                get().applyCrateBoard(data);
            },
            successResetDelayMs: 3000,
        });

        /*try {
            set({
                isSendingRequest: true,
                isRequestSuccessful: false
            });
            const response = await api.post(`/workspaces/${workspaceId}/boards`, payload);
            set({ isRequestSuccessful: true });
            const data: UserBoardData = response.data;
            // console.log("Created board in workspace", workspaceId, data)
            get().applyCrateBoard(data)
        } catch (error) {
            set({ isRequestSuccessful: false });
            // console.error("Error creating board in workspace", workspaceId, error);
            throw error;
        } finally {
            set({ isSendingRequest: false });
        }*/
    },
    patchBoard: async (boardId, payload, asyncKey?) => {
        const run = async () => {
            const response = await api.patch(`/boards/${boardId}`, payload);
            const board = response.data as Board;
            get().mergeBoardsPatch({ [board.ID]: board });
        };
        if (asyncKey) {
            await useAsyncRequestStore.getState().execute(asyncKey, run, { successResetDelayMs: 2000 });
        } else {
            await run();
        }
    },
    patchMyUserBoardProps: async (boardId, payload, asyncKey?) => {
        const prev = get().userBoardsById[boardId];
        if (!prev) return;

        const optimistic: UserBoard = {
            ...prev,
            Props: {
                ...(prev.Props || {}),
                ...(payload.Props || {}),
            },
        };

        get().mergeUserBoardPatch({ [boardId]: optimistic });

        const run = async () => {
            const response = await api.patch(`/boards/${boardId}/me/props`, payload);
            const updated = response.data as UserBoard;
            get().mergeUserBoardPatch({ [boardId]: updated });
        };

        if (asyncKey) {
            await useAsyncRequestStore.getState().execute(asyncKey, run, {
                onError: () => get().mergeUserBoardPatch({ [boardId]: prev }),
                successResetDelayMs: 1500,
            });
        } else {
            try {
                await run();
            } catch (error) {
                get().mergeUserBoardPatch({ [boardId]: prev });
                throw error;
            }
        }
    },
    applyCrateBoard: (data: UserBoardData) => {
        console.log("Applying create board with data", data)
        const board = data.Boards[0]; //dovrebbe esserci solo una board in questo payload
        const userBoard = data.UserBoards[0]; //dovrebbe esserci solo un userBoard in questo payload

        const ids = get().boardIdsByWorkspaceId[board.WorkspaceID] || [];
        if (!ids.includes(board.ID)) {
            ids.push(board.ID);
        }

        //sortByPosition(ids);
        console.log("PrevState", get().boardsById, get().boardIdsByWorkspaceId, get().userBoardsById)
        set((state) => ({
            boardsById: { ...state.boardsById, [board.ID]: board },
            boardIdsByWorkspaceId: { ...state.boardIdsByWorkspaceId, [board.WorkspaceID]: ids },

            userBoardsById: userBoard ? { ...state.userBoardsById, [userBoard.BoardID]: userBoard } : state.userBoardsById,
            OpCounter: state.OpCounter + 1,
        }));
        console.log("NextState", get().boardsById, get().boardIdsByWorkspaceId, get().userBoardsById)
    },
    mergeBoardsPatch: (payload) => {
        //  console.log("Merging boards patch", payload)
        set((state) => {
            const nextBoardsById = { ...state.boardsById };
            Object.entries(payload).forEach(([boardId, patch]) => {
                //if (!nextBoardsById[boardId]) return;
                nextBoardsById[boardId] = {
                    ...nextBoardsById[boardId],
                    ...patch
                };
            });
            return { boardsById: nextBoardsById };
        });
        // console.log("Boards after merge", get().boardsById)
    },
    mergeBoards: (boards) => {
        if (boards.length === 0) return;

        set((state) => {
            const nextBoardsById = { ...state.boardsById };
            boards.forEach((board) => {
                nextBoardsById[board.ID] = board;
            });

            return { boardsById: nextBoardsById };
        });
    },
    mergeUserBoardPatch: (userBoards) => {
        set((state) => {
            const nextUserBoardsById = { ...state.userBoardsById, ...userBoards };

            return { userBoardsById: nextUserBoardsById };
        });
    },
    mergeUserBoardRelation: (userBoard) => {
        set((state) => ({
            userBoardsById: { ...state.userBoardsById, [userBoard.BoardID]: userBoard }
        }));
    },
    removeUserBoardRelation: (boardID) => {
        set((state) => {
            const { [boardID]: _removed, ...nextUserBoardsById } = state.userBoardsById;
            return {
                userBoardsById: nextUserBoardsById,
            };
        });
    },
    findWorkspaceIdByBoardId(boardId: string): string | undefined {
        const map = get().boardIdsByWorkspaceId;
        for (const [workspaceId, boardIds] of Object.entries(map)) {
            if (boardIds.includes(boardId)) return workspaceId;
        }
        return undefined;
    },
    mergeBoardsInWorkspace: (workspaceId, boards) => {
        const boardIds = Object.keys(boards)
        const nextIds = [...(get().boardIdsByWorkspaceId[workspaceId] || [])]
        boardIds.forEach(id => {
            if (!nextIds.includes(id)) {
                nextIds.push(id);
            }
        });


        //const sorted = useSortByPosition().sortByPosition(nextIds.map(id => get().userBoardsById[id])).map(ub => ub.BoardID);
        set((state) => {
            return {
                boardsById: { ...state.boardsById, ...boards },
                boardIdsByWorkspaceId: { ...state.boardIdsByWorkspaceId, [workspaceId]: nextIds },
            }
        })


    },

    closeBoardInWorkspace: async (workspaceId, boardId, asyncKey?) => {
        const run = async () => {
            await api.delete(`/workspaces/${workspaceId}/boards/${boardId}`);
            get().applyOptimisticCloseBoard(workspaceId, boardId);
        };
        if (asyncKey) {
            await useAsyncRequestStore.getState().execute(asyncKey, run, { successResetDelayMs: 2000 });
        } else {
            await run();
        }
    },
    replaceBoardPendingSuspensionSelection: async (workspaceId, markedBoardIDs, unmarkedBoardIDs, asyncKey?) => {
        const run = async () => {
            await api.post(`/workspaces/${workspaceId}/subscription/suspension/boards`, {
                MarkedBoardIDs: markedBoardIDs,
                UnmarkedBoardIDs: unmarkedBoardIDs,
            });
            await get().fetchBoardsForWorkspace(workspaceId);
        };
        if (asyncKey) {
            await useAsyncRequestStore.getState().execute(asyncKey, run, { successResetDelayMs: 1500 });
        } else {
            await run();
        }
    },
    applyOptimisticCloseBoard: (workspaceId: string, boardId: string) => {
        set((state) => {
            const nextBoardsById = { ...state.boardsById };
            delete nextBoardsById[boardId];
            const nextBoardIds = state.boardIdsByWorkspaceId[workspaceId]?.filter(id => id !== boardId) || [];
            const nextUserBoardsById = { ...state.userBoardsById };
            delete nextUserBoardsById[boardId];
            return {
                boardsById: nextBoardsById,
                boardIdsByWorkspaceId: { ...state.boardIdsByWorkspaceId, [workspaceId]: nextBoardIds },
                userBoardsById: nextUserBoardsById,
                OpCounter: state.OpCounter + 1,
            };
        });
    },

    restoreBoardInWorkspace: async (workspaceId: string, boardId: string) => {
        try {
            const response = await api.post(`/workspaces/${workspaceId}/boards/${boardId}/restore`);
            const data: UserBoardData = response.data;
            get().applyCrateBoard(data);
            get().applyRemoveBoardFromClosed(data);
        } catch (error) {
            // console.error("Error restoring board in workspace", workspaceId, boardId, error);
            throw error;
        }

    },

    purgeBoardInWorkspace: async (workspaceId: string, boardId: string) => {
        try {
            const response = await api.delete(`/workspaces/${workspaceId}/boards/${boardId}/purge`);

            const data: Record<string, Board> = response.data;
            const ids = Object.keys(data);
            get().applyRemoveIdsFromClosed(workspaceId, ids);
            //dopo la purga non abbiamo più bisogno di tenere traccia del boardId, ma è già stato rimosso dalla close quindi non dobbiamo fare nulla
        } catch (error) {
            // console.error("Error purging board in workspace", workspaceId, boardId, error);
            throw error;
        }
    },

    getClosedBoardsInWorkspace: async (workspaceId: string) => {
        try {
            const response = await api.get(`/workspaces/${workspaceId}/boards/closed`);
            const data: UserBoardData = response.data;
            const closedBoardsById: Record<string, Board> = data.Boards.reduce((acc, board) => {
                acc[board.ID] = board;
                return acc;
            }, {} as Record<string, Board>);
            const closedBoardIds = data.Boards.map((board) => board.ID);
            const closedUserBoardsById: Record<string, UserBoard> = data.UserBoards.reduce((acc, userBoard) => {
                acc[userBoard.BoardID] = userBoard;
                return acc;
            }, {} as Record<string, UserBoard>);
            set((state) => ({
                closedBoardById: { ...state.closedBoardById, ...closedBoardsById },
                closedBoardIdsByWorkspaceId: { ...state.closedBoardIdsByWorkspaceId, [workspaceId]: closedBoardIds },
                closedUserBoardsById: { ...state.closedUserBoardsById, ...closedUserBoardsById },
            }));

        } catch (error) {
            // console.error("Error fetching closed boards for workspace", workspaceId, error);
            throw error;
        }
    },

    applyBoardClosedEvent: (evt) => {
        console.log("[BOARDSTORE]Applying board closed event", evt)
        const payload = evt.Payload.StatePayload as BoardDetailPatch;
        const boardID = Object.keys(payload.Boards)[0] ?? "";
        console.log("Applying board closed event for boardID", boardID)
        if (!boardID) {
            // console.error("Received board closed event with missing boardID", evt)
            return;
        }
        const workspaceID = evt.WorkspaceID;
        set((state) => {
            const nextBoardsById = { ...state.boardsById };
            delete nextBoardsById[boardID];
            const nextBoardIds = state.boardIdsByWorkspaceId[workspaceID]?.filter(id => id !== boardID) || [];
            const nextUserBoardsById = { ...state.userBoardsById };
            const nextClosedBoardById = { ...state.closedBoardById, [boardID]: state.boardsById[boardID] };
            const nextClosedBoardIdsByWorkspaceId = { ...state.closedBoardIdsByWorkspaceId, [workspaceID]: [...(state.closedBoardIdsByWorkspaceId[workspaceID] || []), boardID] };
            delete nextUserBoardsById[boardID];
            return {
                boardsById: nextBoardsById,
                boardIdsByWorkspaceId: { ...state.boardIdsByWorkspaceId, [workspaceID]: nextBoardIds },
                userBoardsById: nextUserBoardsById,
                closedBoardById: nextClosedBoardById,
                closedBoardIdsByWorkspaceId: nextClosedBoardIdsByWorkspaceId,
                OpCounter: state.OpCounter + 1,
            };
        });

    },
    applyRemoveBoardFromClosed: (data: UserBoardData) => {
        //const nextIds = get().closedBoardIdsByWorkspaceId[data.Boards[0].WorkspaceID] ?? [];
        const idstoRemove = data.Boards.map(board => board.ID);
        get().applyRemoveIdsFromClosed(data.Boards[0].WorkspaceID, idstoRemove);

    },

    applyRemoveIdsFromClosed: (workspaceId: string, boardIds: string[]) => {
        const nextIds = get().closedBoardIdsByWorkspaceId[workspaceId] ?? [];
        const filteredIds = nextIds.filter(id => !boardIds.includes(id));
        set((state) => ({
            closedBoardById: Object.fromEntries(Object.entries(state.closedBoardById).filter(([id]) => !boardIds.includes(id))),
            closedBoardIdsByWorkspaceId: { ...state.closedBoardIdsByWorkspaceId, [workspaceId]: filteredIds },
            closedUserBoardsById: Object.fromEntries(Object.entries(state.closedUserBoardsById).filter(([id]) => !boardIds.includes(id))),
            OpCounter: state.OpCounter + 1,
        }))
    },
    addPendingOfferedBoardId: (workspaceId, boardId, offerId?) => {
        set((state) => {
            const existingIds = state.pendingOfferedBoardIdsByWorkspaceId[workspaceId] || [];
            const nextState: Partial<typeof state> = {};
            if (!existingIds.includes(boardId)) {
                nextState.pendingOfferedBoardIdsByWorkspaceId = {
                    ...state.pendingOfferedBoardIdsByWorkspaceId,
                    [workspaceId]: [...existingIds, boardId],
                };
            }
            if (offerId) {
                nextState.offerIdByBoardId = { ...state.offerIdByBoardId, [boardId]: offerId };
            }
            return nextState as typeof state;
        });
    },
    addPendingRequestedBoardId: (workspaceId, boardId, offerId?) => {
        set((state) => {
            const existingIds = state.pendingRequestedBoardIdsByWorkspaceId[workspaceId] || [];
            const nextState: Partial<typeof state> = {};
            if (!existingIds.includes(boardId)) {
                nextState.pendingRequestedBoardIdsByWorkspaceId = {
                    ...state.pendingRequestedBoardIdsByWorkspaceId,
                    [workspaceId]: [...existingIds, boardId],
                };
            }
            if (offerId) {
                nextState.offerIdByBoardId = { ...state.offerIdByBoardId, [boardId]: offerId };
            }
            return nextState as typeof state;
        });
    },
    removePendingRequestedBoardId: (workspaceId, boardId) => {
        set((state) => {
            const existingIds = state.pendingRequestedBoardIdsByWorkspaceId[workspaceId] || [];
            const nextOfferIdByBoardId = { ...state.offerIdByBoardId };
            delete nextOfferIdByBoardId[boardId];
            return {
                pendingRequestedBoardIdsByWorkspaceId: {
                    ...state.pendingRequestedBoardIdsByWorkspaceId,
                    [workspaceId]: existingIds.filter(id => id !== boardId),
                },
                offerIdByBoardId: nextOfferIdByBoardId,
            };
        });
    },

    removePendingOfferedBoardId: (workspaceId, boardId) => {
        set((state) => {
            const existingIds = state.pendingOfferedBoardIdsByWorkspaceId[workspaceId] || [];
            const nextOfferIdByBoardId = { ...state.offerIdByBoardId };
            delete nextOfferIdByBoardId[boardId];
            return {
                pendingOfferedBoardIdsByWorkspaceId: {
                    ...state.pendingOfferedBoardIdsByWorkspaceId,
                    [workspaceId]: existingIds.filter(id => id !== boardId),
                },
                offerIdByBoardId: nextOfferIdByBoardId,
            };
        });
    },






}))