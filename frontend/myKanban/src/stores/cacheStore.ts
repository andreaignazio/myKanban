import { create } from "zustand";
import { useUserStore } from "./userStore";
import { useBoardsStore } from "./boardsStore";

import type { Board, UserBoard, UserWorkspace, Workspace, WorkspaceSubscription } from "./types";
import type { UserBoardShareOffersDetails, ShareOffer, ShareOfferDetailsByIDResponse, ShareOfferDetailsResponse, WorkspaceOutgoingShareOfferResponse, BoardShareOfferWithUserDetails } from "./shareOfferTypes";
import type { AnyUser } from "./usertypes";

type CachedWorkspaceMember = {
    User: AnyUser;
    UserWorkspace: UserWorkspace;
};

type CacheState = {
    offerWorkspaceById: Record<string, Workspace>;
    offerSubscriptionByWorkspaceId: Record<string, WorkspaceSubscription>;
    offerUserWorkspacesByWorkspaceId: Record<string, Record<string, UserWorkspace>>;
    offerUserIdsByWorkspaceId: Record<string, string[]>;
    offerById: Record<string, ShareOffer>;
    offerIdsByWorkspaceId: Record<string, string[]>;
    offerBoardById: Record<string, Board>;
    offerUserBoardsByBoardId: Record<string, Record<string, UserBoard>>;
    upsertShareOffers: (offers: ShareOffer[]) => void;
    upsertShareOfferDetails: (details: ShareOfferDetailsResponse[] | UserBoardShareOffersDetails[] | ShareOfferDetailsByIDResponse[]) => void;
    upsertWorkspaceOutgoingShareOffers: (details: WorkspaceOutgoingShareOfferResponse[]) => void;
    upsertBoardShareOfferDetails: (details: BoardShareOfferWithUserDetails[]) => void;
    getOfferWorkspaceMembers: (workspaceId: string) => CachedWorkspaceMember[];
    getOfferWorkspaceSubscription: (workspaceId: string) => WorkspaceSubscription | undefined;
    clearOfferCache: (opts?: { workspaceId?: string; offerId?: string }) => void;
    getBoardById: (boardId: string) => Board | undefined;
    getWorkspaceById: (workspaceId: string) => Workspace | undefined;
    getBoardMembers: (boardId: string) => UserBoard[] | undefined;
};

export const useCacheStore = create<CacheState>((set, get) => ({
    offerWorkspaceById: {},
    offerSubscriptionByWorkspaceId: {},
    offerUserWorkspacesByWorkspaceId: {},
    offerUserIdsByWorkspaceId: {},
    offerById: {},
    offerIdsByWorkspaceId: {},
    offerBoardById: {},
    offerUserBoardsByBoardId: {},
    upsertShareOffers: (offers) => {
        if (offers.length === 0) return;
        set((state) => {
            const nextOfferById = { ...state.offerById };
            const nextOfferIdsByWorkspaceId = { ...state.offerIdsByWorkspaceId };
            offers.forEach((offer) => {
                nextOfferById[offer.ID] = offer;
                const key = offer.TargetID;
                const currentIds = new Set(nextOfferIdsByWorkspaceId[key] ?? []);
                currentIds.add(offer.ID);
                nextOfferIdsByWorkspaceId[key] = Array.from(currentIds);
            });
            return {
                offerById: nextOfferById,
                offerIdsByWorkspaceId: nextOfferIdsByWorkspaceId
            };
        });
    },
    upsertShareOfferDetails: (details) => {
        if (details.length === 0) return;
        const usersToMerge: AnyUser[] = [];
        set((state) => {
            const nextOfferById = { ...state.offerById };
            const nextOfferIdsByWorkspaceId = { ...state.offerIdsByWorkspaceId };
            const nextWorkspaceById = { ...state.offerWorkspaceById };
            const nextSubscriptionsByWorkspaceId = { ...state.offerSubscriptionByWorkspaceId };
            const nextUserWorkspacesByWorkspaceId = { ...state.offerUserWorkspacesByWorkspaceId };
            const nextUserIdsByWorkspaceId = { ...state.offerUserIdsByWorkspaceId };
            const nextBoardsById = { ...state.offerBoardById };
            const nextUserBoardsByBoardId = { ...state.offerUserBoardsByBoardId };

            details.forEach((detail) => {
                const offer = detail.ShareOffer;
                if (offer) {
                    nextOfferById[offer.ID] = offer;
                    const currentIds = new Set(nextOfferIdsByWorkspaceId[offer.TargetID] ?? []);
                    currentIds.add(offer.ID);
                    nextOfferIdsByWorkspaceId[offer.TargetID] = Array.from(currentIds);
                }

                const workspaceDetails = detail.TargetWorkspaceDetails;
                if (workspaceDetails) {
                    if (workspaceDetails.Workspace) {
                        nextWorkspaceById[workspaceDetails.Workspace.ID] = workspaceDetails.Workspace;
                    }
                    if (workspaceDetails.WorkspaceSubscription) {
                        nextSubscriptionsByWorkspaceId[workspaceDetails.WorkspaceSubscription.WorkspaceID] = workspaceDetails.WorkspaceSubscription;
                    }

                    const members = workspaceDetails.WorkspaceMembers ?? [];
                    members.forEach((memberData) => {
                        memberData.User.forEach((user) => {
                            usersToMerge.push(user);
                        });
                        memberData.UserWorkspace.forEach((userWorkspace) => {
                            const workspaceId = userWorkspace.WorkspaceID;
                            nextUserWorkspacesByWorkspaceId[workspaceId] ??= {};
                            nextUserWorkspacesByWorkspaceId[workspaceId][userWorkspace.UserID] = userWorkspace;

                            nextUserIdsByWorkspaceId[workspaceId] ??= [];
                            if (!nextUserIdsByWorkspaceId[workspaceId].includes(userWorkspace.UserID)) {
                                nextUserIdsByWorkspaceId[workspaceId].push(userWorkspace.UserID);
                            }
                        });
                    });
                }

                const boardDetails = (detail as UserBoardShareOffersDetails).TargetBoardDetails;
                if (boardDetails) {
                    if (boardDetails.Board) {
                        nextBoardsById[boardDetails.Board.ID] = boardDetails.Board;
                    }
                    const boardMembers = boardDetails.BoardMembers ?? [];
                    boardMembers.forEach((memberData) => {
                        usersToMerge.push(memberData.User);
                        const userBoard = memberData.UserBoardRelation

                        const boardId = userBoard.BoardID;
                        nextUserBoardsByBoardId[boardId] ??= {};
                        nextUserBoardsByBoardId[boardId][userBoard.UserID] = userBoard;
                    });
                    ;
                }
            });

            return {
                offerById: nextOfferById,
                offerIdsByWorkspaceId: nextOfferIdsByWorkspaceId,
                offerWorkspaceById: nextWorkspaceById,
                offerSubscriptionByWorkspaceId: nextSubscriptionsByWorkspaceId,
                offerUserWorkspacesByWorkspaceId: nextUserWorkspacesByWorkspaceId,
                offerUserIdsByWorkspaceId: nextUserIdsByWorkspaceId,
                offerBoardById: nextBoardsById,
                offerUserBoardsByBoardId: nextUserBoardsByBoardId

            };

        });
        if (usersToMerge.length > 0) {
            useUserStore.getState().mergeUsers(usersToMerge);
        }
        // console.log("STATE AFTER CACHE UPDATE:", get().offerWorkspaceById);

    },

    upsertWorkspaceOutgoingShareOffers: (details: WorkspaceOutgoingShareOfferResponse[]) => {
        if (details.length === 0) return;
        const usersToMerge: AnyUser[] = [];
        set((state) => {
            const nextOfferById = { ...state.offerById };
            const nextOfferIdsByWorkspaceId = { ...state.offerIdsByWorkspaceId };
            details.forEach((detail) => {
                const offer = detail.ShareOffer;
                if (offer) {
                    nextOfferById[offer.ID] = offer;
                    const key = offer.TargetID;
                    const currentIds = new Set(nextOfferIdsByWorkspaceId[key] ?? []);
                    if (!currentIds.has(offer.ID)) {
                        currentIds.add(offer.ID);
                        nextOfferIdsByWorkspaceId[key] = Array.from(currentIds);
                    } else {
                        nextOfferIdsByWorkspaceId[key] = Array.from(currentIds);
                    }
                }
                detail.Users.forEach((user) => {
                    usersToMerge.push(user);
                });
            });

            return {
                offerById: nextOfferById,
                offerIdsByWorkspaceId: nextOfferIdsByWorkspaceId
            }
        })
        if (usersToMerge.length > 0) {
            useUserStore.getState().mergeUsers(usersToMerge);
        }
    },
    upsertBoardShareOfferDetails: (details: BoardShareOfferWithUserDetails[]) => {
        if (details.length === 0) return;
        const usersToMerge: AnyUser[] = [];
        set((state) => {
            const nextOfferById = { ...state.offerById };
            details.forEach((detail) => {
                const offer = detail.ShareOffer;
                if (offer) {
                    nextOfferById[offer.ID] = offer;
                }
                detail.User.forEach((user) => {
                    usersToMerge.push(user);
                });

            })
            return {
                offerById: nextOfferById
            }
        })
        if (usersToMerge.length > 0) {
            useUserStore.getState().mergeUsers(usersToMerge);
        }

    },

    getOfferWorkspaceMembers: (workspaceId) => {
        const userIds = get().offerUserIdsByWorkspaceId[workspaceId] ?? [];
        const userWorkspaces = get().offerUserWorkspacesByWorkspaceId[workspaceId] ?? {};
        const usersById = useUserStore.getState().usersById;
        return userIds
            .map((userId) => {
                const user = usersById[userId];
                const userWorkspace = userWorkspaces[userId];
                if (!user || !userWorkspace) return null;
                return { User: user, UserWorkspace: userWorkspace } as CachedWorkspaceMember;
            })
            .filter(Boolean) as CachedWorkspaceMember[];
    },
    getOfferWorkspaceSubscription: (workspaceId) => {
        return get().offerSubscriptionByWorkspaceId[workspaceId];
    },
    clearOfferCache: (opts) => {
        if (!opts) {
            set({
                offerWorkspaceById: {},
                offerSubscriptionByWorkspaceId: {},
                offerUserWorkspacesByWorkspaceId: {},
                offerUserIdsByWorkspaceId: {},
                offerById: {},
                offerIdsByWorkspaceId: {}
            });
            return;
        }

        set((state) => {
            const nextOfferById = { ...state.offerById };
            const nextOfferIdsByWorkspaceId = { ...state.offerIdsByWorkspaceId };
            const nextWorkspaceById = { ...state.offerWorkspaceById };
            const nextSubscriptionsByWorkspaceId = { ...state.offerSubscriptionByWorkspaceId };
            const nextUserWorkspacesByWorkspaceId = { ...state.offerUserWorkspacesByWorkspaceId };
            const nextUserIdsByWorkspaceId = { ...state.offerUserIdsByWorkspaceId };

            if (opts.offerId) {
                const offer = nextOfferById[opts.offerId];
                delete nextOfferById[opts.offerId];
                if (offer?.TargetID) {
                    nextOfferIdsByWorkspaceId[offer.TargetID] = (nextOfferIdsByWorkspaceId[offer.TargetID] ?? []).filter(
                        (id) => id !== opts.offerId
                    );
                }
            }

            if (opts.workspaceId) {
                const workspaceId = opts.workspaceId;
                delete nextWorkspaceById[workspaceId];
                delete nextSubscriptionsByWorkspaceId[workspaceId];
                delete nextUserWorkspacesByWorkspaceId[workspaceId];
                delete nextUserIdsByWorkspaceId[workspaceId];
                const offerIds = nextOfferIdsByWorkspaceId[workspaceId] ?? [];
                offerIds.forEach((offerId) => {
                    delete nextOfferById[offerId];
                });
                delete nextOfferIdsByWorkspaceId[workspaceId];
            }

            return {
                offerById: nextOfferById,
                offerIdsByWorkspaceId: nextOfferIdsByWorkspaceId,
                offerWorkspaceById: nextWorkspaceById,
                offerSubscriptionByWorkspaceId: nextSubscriptionsByWorkspaceId,
                offerUserWorkspacesByWorkspaceId: nextUserWorkspacesByWorkspaceId,
                offerUserIdsByWorkspaceId: nextUserIdsByWorkspaceId
            };
        });
    },
    getBoardById: (boardId) => {
        return get().offerBoardById[boardId] ?? useBoardsStore.getState().boardsById[boardId];
    },
    getWorkspaceById: (workspaceId) => {
        // console.log("Retrieving workspace from cache for ID:", workspaceId);
        const workspace = get().offerWorkspaceById[workspaceId];
        // console.log("Retrieved workspace:", workspace);
        return workspace;
    },
    getBoardMembers: (boardId) => {
        const userBoardsById = get().offerUserBoardsByBoardId[boardId] ?? {};
        const userBoards = Object.values(userBoardsById);
        return userBoards.length > 0 ? userBoards : undefined;
    }

}));
