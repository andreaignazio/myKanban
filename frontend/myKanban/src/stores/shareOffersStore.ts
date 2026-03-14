import { api } from "@/api/api";
import axios from "axios";
import { create } from "zustand";
import type { BoardEvent, UserEvent, WorkspaceEvent } from "./types";
import { useWorkspaceStore, type UserWorkspaceData } from "./workspaceStore";
import { useCacheStore } from "./cacheStore";
import { useUserStore } from "./userStore";
import type { UserBoardShareOffersDetails, ShareOffer, ShareOfferDetailsByIDResponse, ShareOfferDetailsResponse, WorkspaceOutgoingShareOfferResponse, BoardShareOfferWithUserDetails } from "./shareOfferTypes";
import type { DomainEventTypes, UserEventTypes } from "./eventTypes";
import type { BoardDetailPatch } from "./boardDetailStore";
import { useWsMembersStore, type WorkspaceMemberData } from "./wsMembersStore";
import { useSortByDate } from "@/hooks/useSortByDate";
import { useBoardsStore } from "./boardsStore";
import { useBoardMembersStore } from "./boardMembersStore";
import { useAuthStore } from "./auth";
import { useAsyncRequestStore, useAsyncKey } from "./asyncRequestStore";
import type { AxiosResponse } from "axios";
export type { ShareOffer } from "./shareOfferTypes";

type RespondToShareOfferPayload = {
    Decision: "accepted" | "rejected"
}

type ShareOffersState = {
    isSendingShareOffer: boolean;
    isRequestSuccessful: boolean;
    //  userIncomingShareOffersById: Record<string, ShareOffer>

    userBoardAccessSentRequestsIds: string[];
    userBoardInvitesIncomingIds: string[]; // Array of share offer IDs for board access requests sent by the user
    userWorkspaceAccessSentRequestsIds: string[];
    userWsIncomingOfferIds: string[],

    boardReceivedRequestsIdsByBoardId: Record<string, string[]>;
    workspaceReceivedRequestsIdsByWorkspaceId: Record<string, string[]>;
    boardSentInvitesIdsByBoardId: Record<string, string[]>;

    applyShareOfferEvent: (evt: BoardEvent | WorkspaceEvent | UserEvent) => void;

    fetchWorkspaceShareOffers: (workspaceID: string) => Promise<void>;
    fetchShareOfferDetailsByID: (offerID: string) => Promise<ShareOfferDetailsByIDResponse>;

    fetchUserWorkspaceIncomingInvites: () => Promise<void>;
    fetchUserWorkspaceAccessSentRequests: () => Promise<void>;
    fetchUserBoardAccessSentRequests: () => Promise<void>;
    fetchBoardReceivedRequests: (boardID: string) => Promise<void>;
    fetchWorkspaceReceivedRequests: (workspaceID: string) => Promise<void>;
    setBoardReceivedRequestsForBoards: (details: BoardShareOfferWithUserDetails[]) => void;
    fetchUserBoardInvitesIncoming: () => Promise<void>;
    fetchBoardSentInvites: (boardID: string) => Promise<void>;

    getWorkspaceShareOffers: (workspaceID: string) => ShareOffer[];
    createWorkspaceShareOffer: (payload: CreateShareOfferPayload, workspaceID: string) => Promise<void>;
    createBoardShareOffer: (payload: CreateShareOfferPayload, boardID: string) => Promise<void>;
    fillUserLookup: (shareOffers: ShareOffer[]) => Promise<void>;
    getIsSuccess: () => boolean;
    mergeWorkspaceDetailsFromShareOffers: (shareOffers: ShareOffer[]) => void;
    respondToShareOffer: (offerID: string, accept: boolean) => Promise<void>;
    revokeWorkspaceShareOffer: (offerID: string, message: string) => Promise<void>;
    createBoardAccessRequest: (boardID: string, message: string, role: "owner" | "admin" | "member" | "viewer") => Promise<void>;
    createWorkspaceAccessRequest: (workspaceID: string, message: string, role: "member" | "viewer" | "admin") => Promise<void>;
    getPendingIncomingUserInvitesCount: () => number;
    getPendingIncomingCountUserInvitesByEntity: () => ShareOfferCounts;
    getMostRecentPendingIncomingUserInvite: () => ShareOffer | null;
    getBoardPendingIncomingRequests: (boardId: string) => number
}

export type CreateShareOfferPayload = {
    ToUserIDs: string[];
    OfferedRole: "owner" | "admin" | "member" | "viewer";
    Message: string;
}

export type ShareOfferCounts = {
    UserBoardInvites: number;
    UserWorkspaceInvites: number;
}

export const useShareOffersStore = create<ShareOffersState>((set, get) => ({
    isSendingShareOffer: false,
    isRequestSuccessful: false,

    userBoardAccessSentRequestsIds: [],
    userBoardInvitesIncomingIds: [],
    userWorkspaceAccessSentRequestsIds: [],
    userWsIncomingOfferIds: [],

    boardReceivedRequestsIdsByBoardId: {},
    workspaceReceivedRequestsIdsByWorkspaceId: {},
    boardSentInvitesIdsByBoardId: {},

    getBoardPendingIncomingRequests(boardId: string) {
        const boardReceivedRequestsIds = get().boardReceivedRequestsIdsByBoardId[boardId] ?? []
        const offerById = useCacheStore.getState().offerById;
        return boardReceivedRequestsIds.filter((id) => offerById[id]?.Status === "pending").length;

    },

    getPendingIncomingUserInvitesCount() {
        const userBoardInvitesIncomingIds = get().userBoardInvitesIncomingIds;
        const userWsIncomingOfferIds = get().userWsIncomingOfferIds;
        const offerById = useCacheStore.getState().offerById;
        const idSet = new Set<string>();
        userBoardInvitesIncomingIds.forEach((id) => {
            const offer = offerById[id];
            if (offer && offer.Status === "pending" && offer.Kind === "invite") {
                idSet.add(id);
            }
        });
        userWsIncomingOfferIds.forEach((id) => {
            const offer = offerById[id];
            if (offer && offer.Status === "pending" && offer.Kind === "invite") {
                idSet.add(id);
            }
        });
        return idSet.size;

    },
    getPendingIncomingCountUserInvitesByEntity() {
        const userBoardInvitesIncomingIds = get().userBoardInvitesIncomingIds;
        const userWsIncomingOfferIds = get().userWsIncomingOfferIds;
        const offerById = useCacheStore.getState().offerById;

        const boardIdSet = new Set<string>();
        const workspaceIdSet = new Set<string>();
        userBoardInvitesIncomingIds.forEach((id) => {
            const offer = offerById[id];
            if (offer && offer.Status === "pending" && offer.Kind === "invite") {
                if (offer.TargetType === "board") {
                    boardIdSet.add(offer.TargetID);
                }
            }
        });
        userWsIncomingOfferIds.forEach((id) => {
            const offer = offerById[id];
            if (offer && offer.Status === "pending" && offer.Kind === "invite") {
                if (offer.TargetType === "workspace") {
                    workspaceIdSet.add(offer.TargetID);
                }
            }
        });
        return {
            UserBoardInvites: boardIdSet.size,
            UserWorkspaceInvites: workspaceIdSet.size,
        };

    },
    getMostRecentPendingIncomingUserInvite() {
        const userBoardInvitesIncomingIds = get().userBoardInvitesIncomingIds;
        const userWsIncomingOfferIds = get().userWsIncomingOfferIds;
        const offerById = useCacheStore.getState().offerById;
        const pendingInvites: ShareOffer[] = [];
        userBoardInvitesIncomingIds.forEach((id) => {
            const offer = offerById[id];
            if (offer && offer.Status === "pending" && offer.Kind === "invite") {
                pendingInvites.push(offer);
            }
        });
        userWsIncomingOfferIds.forEach((id) => {
            const offer = offerById[id];
            if (offer && offer.Status === "pending" && offer.Kind === "invite") {
                pendingInvites.push(offer);
            }
        });
        if (pendingInvites.length === 0) {
            return null;
        }
        pendingInvites.sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime());
        return pendingInvites[0];
    },

    applyShareOfferEvent: (evt: BoardEvent | WorkspaceEvent | UserEvent) => {
        if (evt.Type.includes("workspace.user.shareoffer.") || evt.Type.includes("board.user.shareoffer.")) {


            switch (evt.Type as UserEventTypes) {
                case "workspace.user.shareoffer.created":
                case "workspace.user.shareoffer.admin.invite.created":
                case "workspace.user.shareoffer.nonadmin.invite.created":
                    const payload = (evt as UserEvent).Payload.WorkspaceShareOfferCreatedPayload
                    const shareOffer = payload?.ShareOffer;
                    const users = Object.values(payload?.Users || {});
                    const isWorkspaceInviteRecipient = evt.Type === "workspace.user.shareoffer.created" || evt.Type === "workspace.user.shareoffer.nonadmin.invite.created";
                    const workspacesDetails = payload?.Workspace
                        ? [payload.Workspace]
                        : (payload?.Workspaces || []);
                    useUserStore.getState().mergeUsers(users);

                    if (shareOffer && workspacesDetails.length > 0) {
                        const shareOffersDetails: ShareOfferDetailsResponse = {
                            ShareOffer: shareOffer!,
                            TargetWorkspaceDetails: workspacesDetails[0]!
                        }
                        useCacheStore.getState().upsertShareOfferDetails([shareOffersDetails]);
                    }

                    workspacesDetails.forEach((wsDetail) => {
                        const ws = wsDetail.Workspace;
                        const subscription = wsDetail.WorkspaceSubscription
                        const dataForWsStore: UserWorkspaceData = {
                            Workspaces: [ws],
                            UserWorkspaces: [],
                            WorkspaceSubscriptions: [subscription]
                        }
                        useWorkspaceStore.getState().mergeWorkspaceData(dataForWsStore);
                        //useUserStore.getState().mergeUsers(users);
                        useWsMembersStore.getState().mergeMembersData(wsDetail.WorkspaceMembers[0]);
                    })

                    if (shareOffer && isWorkspaceInviteRecipient) {
                        const targetWorkspace = workspacesDetails.find((wsDetail) => wsDetail.Workspace.ID === shareOffer.TargetID)?.Workspace;
                        useWorkspaceStore.getState().appendPendingWorkspaceId(shareOffer.TargetID, "invite", shareOffer.ID, targetWorkspace);
                        set((state) => {
                            const next = [...state.userWsIncomingOfferIds]
                            if (!next.includes(shareOffer.ID)) {
                                next.push(shareOffer.ID);
                            }
                            const offerById = useCacheStore.getState().offerById;
                            const sorted = useSortByDate().sortByDateDesc((next.map((id) => offerById[id]))).map((offer) => offer.ID)
                                ;
                            return {
                                userWsIncomingOfferIds: sorted
                            }


                        })
                    }
                    break;
                case "workspace.user.shareoffer.invite.accepted":
                    const inviteAcceptedPayload = (evt as UserEvent).Payload.WorkspaceShareOfferInviteAcceptedPayload

                    const wsDetail = inviteAcceptedPayload?.Workspace;

                    const wsData: UserWorkspaceData = {
                        Workspaces: [wsDetail!.Workspace],
                        UserWorkspaces: [inviteAcceptedPayload!.UserWorkspace],
                        WorkspaceSubscriptions: [wsDetail!.WorkspaceSubscription]
                    }
                    useWorkspaceStore.getState().mergeWorkspaceData(wsData);
                    useWsMembersStore.getState().mergeMembersData(wsDetail!.WorkspaceMembers[0]);
                    const acceptedOffer = inviteAcceptedPayload?.ShareOffer;

                    if (acceptedOffer) {
                        useCacheStore.getState().upsertShareOfferDetails([inviteAcceptedPayload!.ShareOffer]);
                        set((state) => {
                            const next = [...state.userWsIncomingOfferIds]
                            if (!next.includes(acceptedOffer.ShareOffer.ID)) {
                                next.push(acceptedOffer.ShareOffer.ID);
                            }
                            const sorted = useSortByDate().sortByDateDesc((next.map((id) => useCacheStore.getState().offerById[id]))).map((offer) => offer.ID);
                            return {
                                userWsIncomingOfferIds: sorted
                            }
                        })

                        const acceptedInviteWorkspaceID = wsDetail?.Workspace.ID ?? acceptedOffer.ShareOffer.TargetID;
                        const remainingWorkspaceIncomingOffers = get().userWsIncomingOfferIds;
                        const hasMorePendingInvitesForWorkspace = remainingWorkspaceIncomingOffers.some((offerID) => {
                            const offer = useCacheStore.getState().offerById[offerID];
                            return offer?.TargetID === acceptedInviteWorkspaceID && offer?.Kind === "invite" && offer?.Status === "pending";
                        });
                        if (!hasMorePendingInvitesForWorkspace) {
                            useWorkspaceStore.getState().removePendingWorkspaceId(acceptedInviteWorkspaceID, "invite");
                        }
                    }
                    break;
                case "workspace.user.shareoffer.invite.rejected":
                case "workspace.user.shareoffer.invite.revoked":

                    const inviteRejectedPayload = (evt as UserEvent).Payload.WorkspaceShareOfferInviteRejectedPayload
                    const inviteRevokedPayload = (evt as UserEvent).Payload.WorkspaceShareOfferInviteRevokedPayload
                    const payloadToUse = inviteRejectedPayload ? inviteRejectedPayload : inviteRevokedPayload

                    if (payloadToUse) {
                        useWorkspaceStore.getState().removeWorkspace(payloadToUse!.WorkspaceID);
                        const rejectedOrRevokedOffer = payloadToUse.ShareOffer;
                        if (rejectedOrRevokedOffer) {
                            useCacheStore.getState().upsertShareOfferDetails([payloadToUse.ShareOffer]);

                            set((state) => {
                                const next = [...state.userWsIncomingOfferIds]
                                if (!next.includes(rejectedOrRevokedOffer.ShareOffer.ID)) {
                                    next.push(rejectedOrRevokedOffer.ShareOffer.ID);
                                }
                                const sorted = useSortByDate().sortByDateDesc((next.map((id) => useCacheStore.getState().offerById[id]))).map((offer) => offer.ID);
                                return {
                                    userWsIncomingOfferIds: sorted
                                }
                            })

                            const finalizedInviteWorkspaceID = payloadToUse.WorkspaceID ?? rejectedOrRevokedOffer.ShareOffer.TargetID;
                            const remainingWorkspaceIncomingOffers = get().userWsIncomingOfferIds;
                            const hasMorePendingInvitesForWorkspace = remainingWorkspaceIncomingOffers.some((offerID) => {
                                const offer = useCacheStore.getState().offerById[offerID];
                                return offer?.TargetID === finalizedInviteWorkspaceID && offer?.Kind === "invite" && offer?.Status === "pending";
                            });
                            if (!hasMorePendingInvitesForWorkspace) {
                                useWorkspaceStore.getState().removePendingWorkspaceId(finalizedInviteWorkspaceID, "invite");
                            }
                        }
                    }
                    break;
                case "workspace.user.shareoffer.admin.request.created":
                case "workspace.user.shareoffer.nonadmin.request.created":
                    const workspaceShareRequestCreatedPayload = (evt as UserEvent).Payload.WorkspaceShareOfferCreatedPayload
                    const workspaceRequestOffer = workspaceShareRequestCreatedPayload?.ShareOffer;
                    const workspaceRequestWorkspaceID = workspaceShareRequestCreatedPayload?.Workspace?.Workspace.ID;

                    console.debug("[shareOffersStore][workspace.request.created][recv]", {
                        type: evt.Type,
                        eventID: evt.ID,
                        correlationID: evt.CorrelationID,
                        offerID: workspaceRequestOffer?.ID,
                        workspaceID: workspaceRequestWorkspaceID,
                        recipientUserID: (evt as UserEvent).RecipientUserID,
                    });

                    useUserStore.getState().mergeUsers(Object.values(workspaceShareRequestCreatedPayload?.Users || {}));

                    if (workspaceRequestOffer && workspaceShareRequestCreatedPayload?.Workspace) {
                        const workspaceOfferDetails: ShareOfferDetailsResponse = {
                            ShareOffer: workspaceRequestOffer,
                            TargetWorkspaceDetails: workspaceShareRequestCreatedPayload.Workspace
                        }
                        useCacheStore.getState().upsertShareOfferDetails([workspaceOfferDetails]);

                        if (evt.Type === "workspace.user.shareoffer.admin.request.created" && workspaceRequestWorkspaceID) {
                            set((state) => {
                                const existing = state.workspaceReceivedRequestsIdsByWorkspaceId[workspaceRequestWorkspaceID] || [];
                                const next = existing.includes(workspaceRequestOffer.ID)
                                    ? existing
                                    : [...existing, workspaceRequestOffer.ID];
                                const sorted = useSortByDate().sortByDateDesc((next.map((id) => useCacheStore.getState().offerById[id])), "CreatedAt").map((offer) => offer.ID);
                                console.debug("[shareOffersStore][workspace.request.created][admin.applied]", {
                                    workspaceID: workspaceRequestWorkspaceID,
                                    offerID: workspaceRequestOffer.ID,
                                    total: sorted.length,
                                });
                                return {
                                    workspaceReceivedRequestsIdsByWorkspaceId: {
                                        ...state.workspaceReceivedRequestsIdsByWorkspaceId,
                                        [workspaceRequestWorkspaceID]: sorted,
                                    }
                                }
                            })
                        }
                    }

                    if (evt.Type === "workspace.user.shareoffer.nonadmin.request.created" && workspaceRequestOffer) {
                        const targetWorkspaceID = workspaceRequestWorkspaceID ?? workspaceRequestOffer.TargetID;
                        const targetWorkspace = workspaceShareRequestCreatedPayload?.Workspace?.Workspace;
                        useWorkspaceStore.getState().appendPendingWorkspaceId(targetWorkspaceID, "request", workspaceRequestOffer.ID, targetWorkspace);
                        set((state) => {
                            const next = [...state.userWorkspaceAccessSentRequestsIds];
                            if (!next.includes(workspaceRequestOffer.ID)) {
                                next.push(workspaceRequestOffer.ID);
                            }
                            const sorted = useSortByDate().sortByDateDesc((next.map((id) => useCacheStore.getState().offerById[id]))).map((offer) => offer.ID);
                            console.debug("[shareOffersStore][workspace.request.created][nonadmin.applied]", {
                                offerID: workspaceRequestOffer.ID,
                                total: sorted.length,
                            });
                            return {
                                userWorkspaceAccessSentRequestsIds: sorted
                            }
                        })
                    }
                    break;
                case "workspace.user.shareoffer.admin.request.accepted":
                case "workspace.user.shareoffer.nonadmin.request.accepted":
                    const workspaceShareRequestAcceptedPayload = (evt as UserEvent).Payload.WorkspaceShareOfferInviteAcceptedPayload
                    const acceptedWorkspaceRequestOffer = workspaceShareRequestAcceptedPayload?.ShareOffer;
                    const acceptedWorkspaceDetail = workspaceShareRequestAcceptedPayload?.Workspace;
                    const acceptedWorkspaceID = acceptedWorkspaceDetail?.Workspace.ID ?? acceptedWorkspaceRequestOffer?.ShareOffer.TargetID;

                    useUserStore.getState().mergeUsers(Object.values(workspaceShareRequestAcceptedPayload?.Users || {}));

                    if (acceptedWorkspaceRequestOffer) {
                        useCacheStore.getState().upsertShareOfferDetails([acceptedWorkspaceRequestOffer]);

                        if (evt.Type === "workspace.user.shareoffer.admin.request.accepted" && acceptedWorkspaceID) {
                            let shouldRemovePendingWorkspaceID = false;
                            set((state) => {
                                const existing = state.workspaceReceivedRequestsIdsByWorkspaceId[acceptedWorkspaceID] || [];
                                const next = existing.filter((id) => id !== acceptedWorkspaceRequestOffer.ShareOffer.ID);
                                shouldRemovePendingWorkspaceID = next.length === 0;
                                return {
                                    workspaceReceivedRequestsIdsByWorkspaceId: {
                                        ...state.workspaceReceivedRequestsIdsByWorkspaceId,
                                        [acceptedWorkspaceID]: next,
                                    }
                                }
                            })
                            if (shouldRemovePendingWorkspaceID) {
                                useWorkspaceStore.getState().removePendingWorkspaceId(acceptedWorkspaceID, "request");
                            }
                        }

                        if (evt.Type === "workspace.user.shareoffer.nonadmin.request.accepted") {
                            if (acceptedWorkspaceDetail && workspaceShareRequestAcceptedPayload?.UserWorkspace?.ID) {
                                const wsData: UserWorkspaceData = {
                                    Workspaces: [acceptedWorkspaceDetail.Workspace],
                                    UserWorkspaces: [workspaceShareRequestAcceptedPayload.UserWorkspace],
                                    WorkspaceSubscriptions: [acceptedWorkspaceDetail.WorkspaceSubscription]
                                }
                                useWorkspaceStore.getState().mergeWorkspaceData(wsData);
                            }

                            set((state) => {
                                const next = state.userWorkspaceAccessSentRequestsIds.filter((id) => id !== acceptedWorkspaceRequestOffer.ShareOffer.ID);
                                return {
                                    userWorkspaceAccessSentRequestsIds: next
                                }
                            })
                            if (acceptedWorkspaceID) {
                                const remaining = get().userWorkspaceAccessSentRequestsIds;
                                const hasMoreForWorkspace = remaining.some((offerID) => useCacheStore.getState().offerById[offerID]?.TargetID === acceptedWorkspaceID);
                                if (!hasMoreForWorkspace) {
                                    useWorkspaceStore.getState().removePendingWorkspaceId(acceptedWorkspaceID, "request");
                                }
                            }
                        }
                    }
                    break;
                case "workspace.user.shareoffer.admin.request.rejected":
                case "workspace.user.shareoffer.nonadmin.request.rejected":
                case "workspace.user.shareoffer.admin.request.revoked":
                case "workspace.user.shareoffer.nonadmin.request.revoked":
                    const workspaceShareRequestRejectedPayload = (evt as UserEvent).Payload.WorkspaceShareOfferInviteRejectedPayload
                    const workspaceShareRequestRevokedPayload = (evt as UserEvent).Payload.WorkspaceShareOfferInviteRevokedPayload
                    const workspaceRequestFinalizedPayload = workspaceShareRequestRejectedPayload ?? workspaceShareRequestRevokedPayload
                    const finalizedWorkspaceRequestOffer = workspaceRequestFinalizedPayload?.ShareOffer;
                    const finalizedWorkspaceID = workspaceRequestFinalizedPayload?.WorkspaceID ?? finalizedWorkspaceRequestOffer?.ShareOffer.TargetID;

                    useUserStore.getState().mergeUsers(Object.values(workspaceRequestFinalizedPayload?.Users || {}));

                    if (workspaceRequestFinalizedPayload?.ShareOffer) {
                        useCacheStore.getState().upsertShareOfferDetails([workspaceRequestFinalizedPayload.ShareOffer]);
                    }

                    if (finalizedWorkspaceRequestOffer && finalizedWorkspaceID) {
                        if (evt.Type === "workspace.user.shareoffer.admin.request.rejected" || evt.Type === "workspace.user.shareoffer.admin.request.revoked") {
                            let shouldRemovePendingWorkspaceID = false;
                            set((state) => {
                                const existing = state.workspaceReceivedRequestsIdsByWorkspaceId[finalizedWorkspaceID] || [];
                                const next = existing.filter((id) => id !== finalizedWorkspaceRequestOffer.ShareOffer.ID);
                                shouldRemovePendingWorkspaceID = next.length === 0;
                                return {
                                    workspaceReceivedRequestsIdsByWorkspaceId: {
                                        ...state.workspaceReceivedRequestsIdsByWorkspaceId,
                                        [finalizedWorkspaceID]: next,
                                    }
                                }
                            })
                            if (shouldRemovePendingWorkspaceID) {
                                useWorkspaceStore.getState().removePendingWorkspaceId(finalizedWorkspaceID, "request");
                            }
                        }

                        if (evt.Type === "workspace.user.shareoffer.nonadmin.request.rejected" || evt.Type === "workspace.user.shareoffer.nonadmin.request.revoked") {
                            set((state) => {
                                const next = state.userWorkspaceAccessSentRequestsIds.filter((id) => id !== finalizedWorkspaceRequestOffer.ShareOffer.ID);
                                return {
                                    userWorkspaceAccessSentRequestsIds: next
                                }
                            })
                            const remaining = get().userWorkspaceAccessSentRequestsIds;
                            const hasMoreForWorkspace = remaining.some((offerID) => useCacheStore.getState().offerById[offerID]?.TargetID === finalizedWorkspaceID);
                            if (!hasMoreForWorkspace) {
                                useWorkspaceStore.getState().removePendingWorkspaceId(finalizedWorkspaceID, "request");
                            }
                        }
                    }
                    break;
                case "board.user.shareoffer.admin.invite.created":
                case "board.user.shareoffer.nonadmin.invite.created":
                    const boardShareInviteCreatedPayload = (evt as UserEvent).Payload.BoardShareInviteCreatedPayload
                    const boardInviteOffer = boardShareInviteCreatedPayload?.ShareOffer;
                    const inviteBoardID = boardShareInviteCreatedPayload?.Board.ID;
                    const inviteWorkspaceID = boardShareInviteCreatedPayload?.Workspace.Workspace.ID;

                    useUserStore.getState().mergeUsers(Object.values(boardShareInviteCreatedPayload?.Users || {}));

                    if (boardInviteOffer && inviteBoardID && inviteWorkspaceID) {
                        const offerDetails: UserBoardShareOffersDetails = {
                            ShareOffer: boardInviteOffer,
                            TargetWorkspaceDetails: boardShareInviteCreatedPayload!.Workspace,
                            TargetBoardDetails: { Board: boardShareInviteCreatedPayload!.Board, BoardMembers: [] }
                        }
                        useCacheStore.getState().upsertShareOfferDetails([offerDetails]);

                        if (evt.Type === "board.user.shareoffer.admin.invite.created") {
                            set((state) => {
                                const existing = state.boardSentInvitesIdsByBoardId[inviteBoardID] || [];
                                const next = existing.includes(boardInviteOffer.ID)
                                    ? existing
                                    : [...existing, boardInviteOffer.ID];
                                return {
                                    boardSentInvitesIdsByBoardId: {
                                        ...state.boardSentInvitesIdsByBoardId,
                                        [inviteBoardID]: next,
                                    }
                                }
                            });
                        } else {
                            useBoardsStore.getState().addPendingOfferedBoardId(inviteWorkspaceID, inviteBoardID, boardInviteOffer.ID);
                            set((state) => {
                                const next = [...state.userBoardInvitesIncomingIds];
                                if (!next.includes(boardInviteOffer.ID)) {
                                    next.push(boardInviteOffer.ID);
                                }
                                const sorted = useSortByDate().sortByDateDesc((next.map((id) => useCacheStore.getState().offerById[id]))).map((offer) => offer.ID);
                                return {
                                    userBoardInvitesIncomingIds: sorted
                                }
                            })
                        }
                    }
                    break;

                case "board.user.shareoffer.admin.invite.accepted":
                case "board.user.shareoffer.nonadmin.invite.accepted":
                    const boardShareInviteAcceptedPayload = (evt as UserEvent).Payload.BoardShareInviteAcceptedPayload
                    const acceptedBoardInviteOffer = boardShareInviteAcceptedPayload?.ShareOffer;
                    const acceptedInviteBoard = boardShareInviteAcceptedPayload?.Board;
                    const acceptedInviteUserBoard = boardShareInviteAcceptedPayload?.UserBoard;
                    const acceptedInviteWorkspace = boardShareInviteAcceptedPayload?.Workspace;

                    useUserStore.getState().mergeUsers(Object.values(boardShareInviteAcceptedPayload?.Users || {}));

                    if (acceptedBoardInviteOffer) {
                        useCacheStore.getState().upsertShareOfferDetails([{
                            ShareOffer: acceptedBoardInviteOffer.ShareOffer,
                            TargetWorkspaceDetails: acceptedInviteWorkspace ?? acceptedBoardInviteOffer.TargetWorkspaceDetails,
                            TargetBoardDetails: { Board: acceptedInviteBoard!, BoardMembers: [] }
                        }]);

                        const boardID = acceptedInviteBoard?.ID ?? acceptedBoardInviteOffer.ShareOffer.TargetID;
                        const workspaceID = acceptedInviteWorkspace?.Workspace.ID
                            ?? acceptedInviteBoard?.WorkspaceID
                            ?? useBoardsStore.getState().findWorkspaceIdByBoardId(boardID);

                        if (acceptedInviteBoard && acceptedInviteUserBoard) {
                            useBoardMembersStore.getState().upsertBoardMember(acceptedInviteBoard.ID, acceptedInviteUserBoard);
                        }

                        if (evt.Type === "board.user.shareoffer.nonadmin.invite.accepted") {
                            const recipientUserID = (evt as UserEvent).RecipientUserID ?? useAuthStore.getState().userID ?? "";
                            const derivedUserWorkspace = acceptedInviteWorkspace?.WorkspaceMembers
                                ?.flatMap((memberGroup) => memberGroup.UserWorkspace || [])
                                .find((relation) => relation.UserID === recipientUserID);

                            if (acceptedInviteWorkspace?.Workspace) {
                                const workspaceData: UserWorkspaceData = {
                                    Workspaces: [acceptedInviteWorkspace.Workspace],
                                    UserWorkspaces: derivedUserWorkspace ? [derivedUserWorkspace] : [],
                                    WorkspaceSubscriptions: acceptedInviteWorkspace.WorkspaceSubscription ? [acceptedInviteWorkspace.WorkspaceSubscription] : []
                                }
                                useWorkspaceStore.getState().mergeWorkspaceData(workspaceData);
                            }
                            if (acceptedInviteUserBoard && acceptedInviteUserBoard.UserID === recipientUserID) {
                                useBoardsStore.getState().mergeUserBoardRelation(acceptedInviteUserBoard);
                            }
                            if (workspaceID && acceptedInviteBoard) {
                                useBoardsStore.getState().mergeBoardsInWorkspace(workspaceID, { [acceptedInviteBoard.ID]: acceptedInviteBoard });
                            }
                            if (workspaceID) {
                                useBoardsStore.getState().removePendingOfferedBoardId(workspaceID, boardID);
                            }
                        }
                    }
                    break;

                case "board.user.shareoffer.admin.invite.rejected":
                case "board.user.shareoffer.nonadmin.invite.rejected":
                case "board.user.shareoffer.admin.invite.revoked":
                case "board.user.shareoffer.nonadmin.invite.revoked":
                    const boardShareInviteRejectedPayload = (evt as UserEvent).Payload.BoardShareInviteRejectedPayload
                    const boardShareInviteRevokedPayload = (evt as UserEvent).Payload.BoardShareInviteRevokedPayload
                    const boardInviteFinalizedPayload = boardShareInviteRejectedPayload ?? boardShareInviteRevokedPayload
                    const finalizedBoardInviteOffer = boardInviteFinalizedPayload?.ShareOffer;
                    const finalizedInviteBoard = boardInviteFinalizedPayload?.Board;
                    const finalizedInviteWorkspace = boardInviteFinalizedPayload?.Workspace;

                    useUserStore.getState().mergeUsers(Object.values(boardInviteFinalizedPayload?.Users || {}));
                    if (finalizedBoardInviteOffer) {
                        useCacheStore.getState().upsertShareOffers([finalizedBoardInviteOffer.ShareOffer]);

                        if (evt.Type === "board.user.shareoffer.nonadmin.invite.rejected" || evt.Type === "board.user.shareoffer.nonadmin.invite.revoked") {
                            const boardID = finalizedInviteBoard?.ID ?? finalizedBoardInviteOffer.ShareOffer.TargetID;
                            const workspaceID = finalizedInviteWorkspace?.Workspace.ID
                                ?? finalizedInviteBoard?.WorkspaceID
                                ?? useBoardsStore.getState().findWorkspaceIdByBoardId(boardID);
                            if (workspaceID) {
                                useBoardsStore.getState().removePendingOfferedBoardId(workspaceID, boardID);
                            }
                        }
                    }
                    break;
                case "board.user.shareoffer.admin.request.created":
                case "board.user.shareoffer.nonadmin.request.created":
                    console.debug("Processing board  user share offer request created event", evt);
                    const boardShareRequestPayload = (evt as UserEvent).Payload.BoardShareRequestCreatedPayload
                    const boardShareOffer = boardShareRequestPayload?.ShareOffer;
                    const boardID = boardShareRequestPayload?.Board.ID;
                    const workspaceID = boardShareRequestPayload?.Workspace.Workspace.ID;

                    useUserStore.getState().mergeUsers(Object.values(boardShareRequestPayload?.Users || {}));


                    if (boardShareOffer && boardID && workspaceID) {
                        const offerDetails: UserBoardShareOffersDetails = {
                            ShareOffer: boardShareOffer,
                            TargetWorkspaceDetails: boardShareRequestPayload!.Workspace,
                            TargetBoardDetails: { Board: boardShareRequestPayload!.Board, BoardMembers: [] }
                        }
                        useCacheStore.getState().upsertShareOfferDetails([offerDetails]);
                        //console.log("cachestoreste:", useCacheStore.getState().offerById[boardShareOffer.ID]);

                        if (evt.Type === "board.user.shareoffer.admin.request.created") {
                            // console.debug("Processing board share offer admin request created event - updating stores", evt);
                            console.log("prevState:", get().boardReceivedRequestsIdsByBoardId[boardID!]);
                            set((state) => {
                                const boardRequests = [...(state.boardReceivedRequestsIdsByBoardId[boardID!] || [])]
                                if (!boardRequests.includes(boardShareOffer.ID)) {
                                    boardRequests.push(boardShareOffer.ID);
                                }
                                const sorted = useSortByDate().sortByDateDesc((boardRequests.map((id) => useCacheStore.getState().offerById[id])), "CreatedAt").map((offer) => offer.ID);
                                return {
                                    boardReceivedRequestsIdsByBoardId: {
                                        ...state.boardReceivedRequestsIdsByBoardId,
                                        [boardID!]: sorted
                                    }
                                }
                            })
                            //  console.log("nextState:", get().boardReceivedRequestsIdsByBoardId[boardID!]);
                            break;

                        } else if (evt.Type === "board.user.shareoffer.nonadmin.request.created") {
                            useBoardsStore.getState().addPendingRequestedBoardId(workspaceID!, boardID!, boardShareOffer.ID);
                            set((state) => {
                                const nextSentRequests = [...state.userBoardAccessSentRequestsIds];
                                if (!nextSentRequests.includes(boardShareOffer.ID)) {
                                    nextSentRequests.push(boardShareOffer.ID);
                                }
                                const sorted = useSortByDate().sortByDateDesc((nextSentRequests.map((id) => useCacheStore.getState().offerById[id]))).map((offer) => offer.ID);
                                return {
                                    userBoardAccessSentRequestsIds: sorted
                                }
                            })
                            break;
                        }

                    }
                    break

                case "board.user.shareoffer.admin.request.accepted":
                case "board.user.shareoffer.nonadmin.request.accepted":
                    const boardShareRequestAcceptedPayload = (evt as UserEvent).Payload.BoardShareRequestAcceptedPayload
                    const acceptedBoardShareOffer = boardShareRequestAcceptedPayload?.ShareOffer;
                    const board = boardShareRequestAcceptedPayload?.Board;
                    const userBoard = boardShareRequestAcceptedPayload?.UserBoard;
                    const userWorkspace = boardShareRequestAcceptedPayload?.UserWorkspace;
                    const workspace = boardShareRequestAcceptedPayload?.Workspace;
                    console.debug("[shareOffersStore][user.accepted]", {
                        eventType: evt.Type,
                        offerID: acceptedBoardShareOffer?.ShareOffer.ID,
                        boardID: board?.ID,
                        targetBoardID: acceptedBoardShareOffer?.ShareOffer.TargetID,
                        workspaceID: workspace?.Workspace.ID,
                        userBoardID: userBoard?.BoardID,
                        userBoardUserID: userBoard?.UserID,
                    });
                    useUserStore.getState().mergeUsers(Object.values(boardShareRequestAcceptedPayload?.Users || {}));
                    if (acceptedBoardShareOffer) {
                        useCacheStore.getState().upsertShareOfferDetails([{
                            ShareOffer: boardShareRequestAcceptedPayload!.ShareOffer.ShareOffer,
                            TargetWorkspaceDetails: workspace ?? boardShareRequestAcceptedPayload!.ShareOffer.TargetWorkspaceDetails,
                            TargetBoardDetails: { Board: board!, BoardMembers: [] }
                        }]);

                        if (board && userBoard) {
                            useBoardMembersStore.getState().upsertBoardMember(board.ID, userBoard);
                        }
                        if (evt.Type === "board.user.shareoffer.admin.request.accepted") {
                            // admin perspective: the request was accepted; member list update is handled by upsertBoardMember above
                        }
                        else if (evt.Type === "board.user.shareoffer.nonadmin.request.accepted") {
                            const boardID = board?.ID ?? acceptedBoardShareOffer.ShareOffer.TargetID;
                            const workspaceID = workspace?.Workspace.ID ?? board?.WorkspaceID;
                            const recipientUserID = (evt as UserEvent).RecipientUserID ?? useAuthStore.getState().userID ?? "";
                            const derivedUserWorkspace = workspace?.WorkspaceMembers
                                ?.flatMap((memberGroup) => memberGroup.UserWorkspace || [])
                                .find((relation) => relation.UserID === recipientUserID);
                            const effectiveUserWorkspace = userWorkspace ?? derivedUserWorkspace;

                            if (workspace?.Workspace) {
                                const workspaceData: UserWorkspaceData = {
                                    Workspaces: [workspace.Workspace],
                                    UserWorkspaces: effectiveUserWorkspace ? [effectiveUserWorkspace] : [],
                                    WorkspaceSubscriptions: workspace.WorkspaceSubscription ? [workspace.WorkspaceSubscription] : []
                                }
                                useWorkspaceStore.getState().mergeWorkspaceData(workspaceData);
                            }

                            if (userBoard && userBoard.UserID === recipientUserID) {
                                useBoardsStore.getState().mergeUserBoardRelation(userBoard);
                            }
                            if (workspaceID && board) {
                                useBoardsStore.getState().mergeBoardsInWorkspace(workspaceID, { [board.ID]: board });
                            }
                            if (workspaceID) {
                                useBoardsStore.getState().removePendingRequestedBoardId(workspaceID, boardID);
                                console.debug("[shareOffersStore][user.accepted][nonadmin][workspace-view-sync]", {
                                    workspaceID,
                                    boardID,
                                    boardStatus: useBoardsStore.getState().getBoardStatus(boardID, workspaceID),
                                    hasUserBoard: !!useBoardsStore.getState().userBoardsById[boardID],
                                });
                            }
                        }
                    }
                    break;

                case "board.user.shareoffer.admin.request.rejected":
                case "board.user.shareoffer.nonadmin.request.rejected":
                case "board.user.shareoffer.admin.request.revoked":
                case "board.user.shareoffer.nonadmin.request.revoked":
                    const boardShareRequestRejectedPayload = (evt as UserEvent).Payload.BoardShareRequestRejectedPayload
                    const boardShareRequestRevokedPayload = (evt as UserEvent).Payload.BoardShareRequestRevokedPayload
                    const boardRequestFinalizedPayload = boardShareRequestRejectedPayload ?? boardShareRequestRevokedPayload
                    const rejectedBoardShareOffer = boardRequestFinalizedPayload?.ShareOffer;
                    const rejectedBoard = boardRequestFinalizedPayload?.Board;
                    const rejectedWorkspace = boardRequestFinalizedPayload?.Workspace;

                    useUserStore.getState().mergeUsers(Object.values(boardRequestFinalizedPayload?.Users || {}));

                    if (rejectedBoardShareOffer) {
                        useCacheStore.getState().upsertShareOfferDetails([{
                            ShareOffer: rejectedBoardShareOffer.ShareOffer,
                            TargetWorkspaceDetails: rejectedWorkspace ?? rejectedBoardShareOffer.TargetWorkspaceDetails,
                            TargetBoardDetails: { Board: rejectedBoard!, BoardMembers: [] }
                        }]);

                        const boardID = rejectedBoard?.ID ?? rejectedBoardShareOffer.ShareOffer.TargetID;

                        if (evt.Type === "board.user.shareoffer.admin.request.rejected" || evt.Type === "board.user.shareoffer.admin.request.revoked") {
                            // count is now derived — no manual update needed
                        }

                        if (evt.Type === "board.user.shareoffer.nonadmin.request.rejected" || evt.Type === "board.user.shareoffer.nonadmin.request.revoked") {
                            const workspaceID = rejectedWorkspace?.Workspace.ID
                                ?? rejectedBoard?.WorkspaceID
                                ?? useBoardsStore.getState().findWorkspaceIdByBoardId(boardID);
                            if (workspaceID) {
                                useBoardsStore.getState().removePendingRequestedBoardId(workspaceID, boardID);
                            }
                        }
                    }
                    break;


                default:
                    return;
            }

        } else if (
            evt.Type.includes("workspace.shareoffer.") ||
            evt.Type.includes("board.shareoffer.") ||
            evt.Type === "workspace.access.claimed" ||
            evt.Type === "board.access.claimed"
        ) {

            switch (evt.Type as DomainEventTypes) {

                case "workspace.access.claimed":
                    const workspaceAccessClaimedPayload = evt.Payload.StatePayload as BoardDetailPatch;
                    const workspaceClaimUsers = Object.values(workspaceAccessClaimedPayload.Users || {});
                    const workspaceClaimRelations = workspaceAccessClaimedPayload.UserWorkspaceRelations || [];

                    if (workspaceClaimUsers.length > 0) {
                        useUserStore.getState().mergeUsers(workspaceClaimUsers);
                    }
                    if (workspaceClaimRelations.length > 0) {
                        useWsMembersStore.getState().mergeUserWorkspaceRelation(workspaceClaimRelations);
                    }
                    break;

                case "board.access.claimed":
                    const boardAccessClaimedPayload = evt.Payload.StatePayload as BoardDetailPatch;
                    const boardClaimUsers = Object.values(boardAccessClaimedPayload.Users || {});
                    const boardClaimRelations = boardAccessClaimedPayload.UserBoardRelations || [];
                    const boardClaimBoards = boardAccessClaimedPayload.Boards || {};

                    if (boardClaimUsers.length > 0) {
                        useUserStore.getState().mergeUsers(boardClaimUsers);
                    }
                    if (Object.keys(boardClaimBoards).length > 0 && (evt as WorkspaceEvent).WorkspaceID) {
                        useBoardsStore.getState().mergeBoardsInWorkspace((evt as WorkspaceEvent).WorkspaceID, boardClaimBoards);
                    }
                    if (boardClaimRelations.length > 0) {
                        boardClaimRelations.forEach((relation) => {
                            useBoardMembersStore.getState().upsertBoardMember(relation.BoardID, relation);
                            if (evt.ActorUserID === useAuthStore.getState().userID) {
                                useBoardsStore.getState().mergeUserBoardRelation(relation);
                            }
                        });
                    }
                    break;

                case "workspace.shareoffer.created":

                    const payload = evt.Payload.StatePayload as BoardDetailPatch
                    const shareOffers = payload.ShareOffers
                    const users = Object.values(payload.Users)
                    useUserStore.getState().mergeUsers(users);

                    if (shareOffers && shareOffers.length > 0) {
                        useCacheStore.getState().upsertShareOffers(shareOffers);

                        const workspaceRequestOffers = shareOffers.filter((offer) => offer.TargetType === "workspace" && offer.Kind === "request" && offer.Status === "pending");
                        if (workspaceRequestOffers.length > 0) {
                            set((state) => {
                                const nextByWorkspace = { ...state.workspaceReceivedRequestsIdsByWorkspaceId };
                                for (const offer of workspaceRequestOffers) {
                                    const existing = nextByWorkspace[offer.TargetID] || [];
                                    const next = existing.includes(offer.ID) ? existing : [...existing, offer.ID];
                                    nextByWorkspace[offer.TargetID] = useSortByDate().sortByDateDesc((next.map((id) => useCacheStore.getState().offerById[id])), "CreatedAt").map((item) => item.ID);
                                }
                                return {
                                    workspaceReceivedRequestsIdsByWorkspaceId: nextByWorkspace,
                                }
                            })
                        }
                    }
                    break;
                case "workspace.shareoffer.request.accepted":
                case "workspace.shareoffer.request.rejected":
                case "workspace.shareoffer.request.revoked":
                    const workspaceRequestFinalizedPayload = evt.Payload.StatePayload as BoardDetailPatch
                    const finalizedWorkspaceRequestOffers = workspaceRequestFinalizedPayload.ShareOffers
                    const finalizedWorkspaceRequestUsers = Object.values(workspaceRequestFinalizedPayload.Users)
                    useUserStore.getState().mergeUsers(finalizedWorkspaceRequestUsers);
                    if (finalizedWorkspaceRequestOffers && finalizedWorkspaceRequestOffers.length > 0) {
                        useCacheStore.getState().upsertShareOffers(finalizedWorkspaceRequestOffers);

                        if (evt.Type === "workspace.shareoffer.request.accepted") {
                            const newMembers = workspaceRequestFinalizedPayload.UserWorkspaceRelations
                            if (newMembers && newMembers.length > 0) {
                                const dataForWsMemberStore: WorkspaceMemberData = {
                                    UserWorkspace: newMembers,
                                    User: []
                                }
                                useWsMembersStore.getState().mergeMembersData(dataForWsMemberStore);
                            }
                        }

                        set((state) => {
                            const nextByWorkspace = { ...state.workspaceReceivedRequestsIdsByWorkspaceId };
                            for (const offer of finalizedWorkspaceRequestOffers) {
                                if (offer.TargetType !== "workspace" || offer.Kind !== "request") {
                                    continue;
                                }
                                const existing = nextByWorkspace[offer.TargetID] || [];
                                nextByWorkspace[offer.TargetID] = existing.filter((id) => id !== offer.ID);
                            }
                            return {
                                workspaceReceivedRequestsIdsByWorkspaceId: nextByWorkspace,
                            }
                        })
                    }
                    break;
                case "workspace.shareoffer.invite.accepted":
                    const inviteAcceptedPayload = evt.Payload.StatePayload as BoardDetailPatch
                    const acceptedShareOffers = inviteAcceptedPayload.ShareOffers
                    const newMembers = inviteAcceptedPayload.UserWorkspaceRelations
                    const acceptedUsers = Object.values(inviteAcceptedPayload.Users)
                    useUserStore.getState().mergeUsers(acceptedUsers);
                    if (acceptedShareOffers && acceptedShareOffers.length > 0) {
                        useCacheStore.getState().upsertShareOffers(acceptedShareOffers);

                        const acceptedRemainingWorkspaceIncomingOffers = get().userWsIncomingOfferIds;
                        acceptedShareOffers
                            .filter((offer) => offer.TargetType === "workspace" && offer.Kind === "invite")
                            .forEach((offer) => {
                                const hasMorePendingInvitesForWorkspace = acceptedRemainingWorkspaceIncomingOffers.some((offerID) => {
                                    const remainingOffer = useCacheStore.getState().offerById[offerID];
                                    return remainingOffer?.TargetID === offer.TargetID && remainingOffer?.Kind === "invite" && remainingOffer?.Status === "pending";
                                });
                                if (!hasMorePendingInvitesForWorkspace) {
                                    useWorkspaceStore.getState().removePendingWorkspaceId(offer.TargetID, "invite");
                                }
                            });
                    }
                    if (newMembers && newMembers.length > 0) {

                        useWsMembersStore.getState().mergeUserWorkspaceRelation(newMembers);
                    }

                    break;
                case "workspace.shareoffer.invite.rejected":
                    const inviteRejectedPayload = evt.Payload.StatePayload as BoardDetailPatch
                    const rejectedShareOffers = inviteRejectedPayload.ShareOffers
                    const rejectedUsers = Object.values(inviteRejectedPayload.Users)
                    useUserStore.getState().mergeUsers(rejectedUsers);
                    if (rejectedShareOffers && rejectedShareOffers.length > 0) {
                        useCacheStore.getState().upsertShareOffers(rejectedShareOffers);

                        const rejectedRemainingWorkspaceIncomingOffers = get().userWsIncomingOfferIds;
                        rejectedShareOffers
                            .filter((offer) => offer.TargetType === "workspace" && offer.Kind === "invite")
                            .forEach((offer) => {
                                const hasMorePendingInvitesForWorkspace = rejectedRemainingWorkspaceIncomingOffers.some((offerID) => {
                                    const remainingOffer = useCacheStore.getState().offerById[offerID];
                                    return remainingOffer?.TargetID === offer.TargetID && remainingOffer?.Kind === "invite" && remainingOffer?.Status === "pending";
                                });
                                if (!hasMorePendingInvitesForWorkspace) {
                                    useWorkspaceStore.getState().removePendingWorkspaceId(offer.TargetID, "invite");
                                }
                            });
                    }
                    break;

                case "workspace.shareoffer.invite.revoked":
                    const inviteRevokedPayload = evt.Payload.StatePayload as BoardDetailPatch
                    const revokedShareOffers = inviteRevokedPayload.ShareOffers
                    const revokedUsers = Object.values(inviteRevokedPayload.Users)
                    useUserStore.getState().mergeUsers(revokedUsers);
                    if (revokedShareOffers && revokedShareOffers.length > 0) {
                        useCacheStore.getState().upsertShareOffers(revokedShareOffers);

                        const revokedRemainingWorkspaceIncomingOffers = get().userWsIncomingOfferIds;
                        revokedShareOffers
                            .filter((offer) => offer.TargetType === "workspace" && offer.Kind === "invite")
                            .forEach((offer) => {
                                const hasMorePendingInvitesForWorkspace = revokedRemainingWorkspaceIncomingOffers.some((offerID) => {
                                    const remainingOffer = useCacheStore.getState().offerById[offerID];
                                    return remainingOffer?.TargetID === offer.TargetID && remainingOffer?.Kind === "invite" && remainingOffer?.Status === "pending";
                                });
                                if (!hasMorePendingInvitesForWorkspace) {
                                    useWorkspaceStore.getState().removePendingWorkspaceId(offer.TargetID, "invite");
                                }
                            });
                    }
                    break;

                case "board.shareoffer.invite.created":
                case "board.shareoffer.invite.accepted":
                case "board.shareoffer.invite.rejected":
                case "board.shareoffer.invite.revoked":

                    const boardShareInvitePayload = evt.Payload.StatePayload as BoardDetailPatch
                    const boardInviteOffers = boardShareInvitePayload.ShareOffers
                    const boardInviteUsers = Object.values(boardShareInvitePayload.Users)
                    useUserStore.getState().mergeUsers(boardInviteUsers);

                    if (boardInviteOffers && boardInviteOffers.length > 0) {
                        useCacheStore.getState().upsertShareOffers(boardInviteOffers);
                    }

                    if (evt.Type === "board.shareoffer.invite.accepted") {
                        const userBoard = boardShareInvitePayload.UserBoardRelations?.[0];
                        const board = boardShareInvitePayload.Boards?.[0];
                        const acceptedOffer = boardShareInvitePayload.ShareOffers?.[0];
                        const targetBoardID = board?.ID ?? acceptedOffer?.TargetID;
                        if (userBoard && targetBoardID) {
                            useBoardMembersStore.getState().upsertBoardMember(targetBoardID, userBoard);
                            if (evt.ActorUserID === useAuthStore.getState().userID) {
                                useBoardsStore.getState().mergeUserBoardRelation(userBoard);
                            }
                        }
                        if (targetBoardID) {
                            const workspaceID = board?.WorkspaceID ?? useBoardsStore.getState().findWorkspaceIdByBoardId(targetBoardID);
                            if (workspaceID) {
                                useBoardsStore.getState().removePendingOfferedBoardId(workspaceID, targetBoardID);
                            }
                        }
                    } else if (evt.Type === "board.shareoffer.invite.rejected" || evt.Type === "board.shareoffer.invite.revoked") {
                        const finalizedOffer = boardShareInvitePayload.ShareOffers?.[0];
                        const board = boardShareInvitePayload.Boards?.[0];
                        const targetBoardID = board?.ID ?? finalizedOffer?.TargetID;
                        if (targetBoardID) {
                            const workspaceID = board?.WorkspaceID ?? useBoardsStore.getState().findWorkspaceIdByBoardId(targetBoardID);
                            if (workspaceID) {
                                useBoardsStore.getState().removePendingOfferedBoardId(workspaceID, targetBoardID);
                            }
                        }
                    }
                    break;

                case "board.shareoffer.request.created":
                case "board.shareoffer.request.accepted":
                case "board.shareoffer.request.rejected":
                case "board.shareoffer.request.revoked":

                    const boardShareRequestPayload = evt.Payload.StatePayload as BoardDetailPatch
                    const boardShareOffers = boardShareRequestPayload.ShareOffers
                    const boardShareUsers = Object.values(boardShareRequestPayload.Users)
                    useUserStore.getState().mergeUsers(boardShareUsers);
                    if (boardShareOffers && boardShareOffers.length > 0) {
                        useCacheStore.getState().upsertShareOffers(boardShareOffers);
                    }
                    if (evt.Type === "board.shareoffer.request.created") {
                        const createdOffer = boardShareRequestPayload.ShareOffers?.[0];
                        const createdBoard = boardShareRequestPayload.Boards?.[0];
                        const targetBoardID = createdBoard?.ID ?? createdOffer?.TargetID;

                        if (createdOffer && targetBoardID) {
                            set((state) => {
                                const boardRequests = [...(state.boardReceivedRequestsIdsByBoardId[targetBoardID] || [])];
                                if (!boardRequests.includes(createdOffer.ID)) {
                                    boardRequests.push(createdOffer.ID);
                                }
                                const sorted = useSortByDate().sortByDateDesc((boardRequests.map((id) => useCacheStore.getState().offerById[id])), "CreatedAt").map((offer) => offer.ID);
                                return {
                                    boardReceivedRequestsIdsByBoardId: {
                                        ...state.boardReceivedRequestsIdsByBoardId,
                                        [targetBoardID]: sorted,
                                    }
                                }
                            })
                        }
                    }
                    if (evt.Type === "board.shareoffer.request.accepted") {
                        const userBoard = boardShareRequestPayload.UserBoardRelations?.[0];
                        const userWorkspaceRelations = boardShareRequestPayload.UserWorkspaceRelations || [];
                        const board = boardShareRequestPayload.Boards?.[0];
                        const acceptedOffer = boardShareRequestPayload.ShareOffers?.[0];
                        const targetBoardID = board?.ID ?? acceptedOffer?.TargetID;
                        console.debug("[shareOffersStore][domain.accepted]", {
                            eventType: evt.Type,
                            offerID: acceptedOffer?.ID,
                            boardID: targetBoardID,
                            hasUserBoard: !!userBoard,
                            boardsInPayload: Object.keys(boardShareRequestPayload.Boards || {}).length,
                        });
                        if (userWorkspaceRelations.length > 0) {
                            useWsMembersStore.getState().mergeUserWorkspaceRelation(userWorkspaceRelations);
                        }
                        if (userBoard && targetBoardID) {
                            useBoardMembersStore.getState().upsertBoardMember(targetBoardID, userBoard);
                            if (userBoard.UserID === useAuthStore.getState().userID) {
                                useBoardsStore.getState().mergeUserBoardRelation(userBoard);
                            }
                        }
                    } else if (evt.Type === "board.shareoffer.request.rejected" || evt.Type === "board.shareoffer.request.revoked") {
                        const rejectedOffer = boardShareRequestPayload.ShareOffers?.[0];
                        const rejectedBoard = boardShareRequestPayload.Boards?.[0];
                        const targetBoardID = rejectedBoard?.ID ?? rejectedOffer?.TargetID;

                        if (targetBoardID) {
                            const workspaceID = rejectedBoard?.WorkspaceID ?? useBoardsStore.getState().findWorkspaceIdByBoardId(targetBoardID);
                            if (workspaceID) {
                                useBoardsStore.getState().removePendingRequestedBoardId(workspaceID, targetBoardID);
                            }
                        }
                    }
                    break;

                default:
                    return;
            }

        }



    },

    fetchWorkspaceShareOffers: async (workspaceID: string) => {
        try {
            // console.log("Fetching share offers for workspace", workspaceID);
            const res = await api.get(`/workspaces/${workspaceID}/shareoffers`);
            const shareOffers = res.data as WorkspaceOutgoingShareOfferResponse[] || [];
            // console.log("Fetched share offers for workspace", workspaceID, shareOffers);
            useCacheStore.getState().upsertWorkspaceOutgoingShareOffers(shareOffers);


        } catch (error) {
            // console.log("Error fetching share offers for workspace", workspaceID, error);
            throw error;
        }
    },
    fetchShareOfferDetailsByID: async (offerID: string) => {
        try {
            const response = await api.get(`/shareoffers/${offerID}`);
            const details = response.data as ShareOfferDetailsByIDResponse;

            useCacheStore.getState().upsertShareOfferDetails([details]);
            if (details.InvolvedUsers?.length) {
                useUserStore.getState().mergeUsers(details.InvolvedUsers);
            }

            return details;
        } catch (error) {
            throw error;
        }
    },
    getWorkspaceShareOffers: (workspaceID: string) => {
        const { offerById, offerIdsByWorkspaceId } = useCacheStore.getState();
        const offers = (offerIdsByWorkspaceId[workspaceID] ?? [])
            .map((offerID) => offerById[offerID])
            .filter((offer): offer is ShareOffer => Boolean(offer));

        return offers.sort((a, b) => {
            const aDate = new Date(a.CreatedAt).getTime();
            const bDate = new Date(b.CreatedAt).getTime();
            return bDate - aDate;
        });
    },
    createWorkspaceShareOffer: async (payload, workspaceID) => {
        await useAsyncRequestStore.getState().execute<AxiosResponse>(
            "workspace:shareoffer:create",
            () => api.post(`/workspaces/${workspaceID}/shareoffers`, payload),
            {
                successResetDelayMs: 2000,
                mapError: (err) => {
                    if (axios.isAxiosError(err) && err.response?.status === 409)
                        return "An invite has already been sent to this user"
                    return null
                },
                onSuccess(res) {
                    if (res.data && Array.isArray(res.data)) {
                        useCacheStore.getState().upsertShareOffers(res.data as ShareOffer[]);
                        get().mergeWorkspaceDetailsFromShareOffers(res.data as ShareOffer[]);
                    }
                },
            }
        )
    },
    createBoardShareOffer: async (payload, boardID) => {

        await useAsyncRequestStore.getState().execute<AxiosResponse>(
            "board:shareoffer:create",
            () => api.post(`/boards/${boardID}/shareoffers`, payload),
            {
                successResetDelayMs: 2000,
                mapError: (err) => {
                    if (axios.isAxiosError(err) && err.response?.status === 409)
                        return "An invite has already been sent to this user"
                    return null
                },
                onSuccess(res) {
                    //console.log("Board share offer created successfully:", res.data);
                    if (res.data && Array.isArray(res.data)) {
                        useCacheStore.getState().upsertShareOffers(res.data as ShareOffer[]);
                        get().mergeWorkspaceDetailsFromShareOffers(res.data as ShareOffer[]);
                    }
                },
            }
        )
    },

    revokeWorkspaceShareOffer: async (offerID: string, message: string) => {
        await useAsyncRequestStore.getState().execute(
            useAsyncKey("shareoffer:revoke", offerID),
            async () => {
                const res = await api.post(`/shareoffers/${offerID}/revoke`, { "Reason": message });
                const updatedOffer = res.data as ShareOffer;
                useCacheStore.setState((state) => {
                    const nextOfferById = { ...state.offerById };
                    nextOfferById[updatedOffer.ID] = updatedOffer;
                    return { offerById: nextOfferById };
                });
            },
            { successResetDelayMs: 1500 }
        );
    },

    respondToShareOffer: async (offerID: string, accept: boolean) => {
        await useAsyncRequestStore.getState().execute(
            useAsyncKey("shareoffer:respond", offerID),
            async () => {
                const payload: RespondToShareOfferPayload = {
                    Decision: accept ? "accepted" : "rejected"
                };
                await api.post(`/shareoffers/${offerID}/respond`, payload);
            },
            { successResetDelayMs: 1500 }
        );
    },
    createBoardAccessRequest: async (boardID: string, message: string, role: "owner" | "admin" | "member" | "viewer") => {
        try {
            set({
                isSendingShareOffer: true,
                isRequestSuccessful: false
            });
            await api.post(`/shareoffers/boards/${boardID}/request`, { RequestedRole: "viewer", Message: message });
            set({ isRequestSuccessful: true });
        } catch (error) {
            set({ isRequestSuccessful: false });
            // console.log("Error creating board access request", error);
            throw error;
        } finally {
            set({ isSendingShareOffer: false });
        }
    },
    createWorkspaceAccessRequest: async (workspaceID: string, message: string, role: "member" | "viewer" | "admin") => {
        try {
            set({
                isSendingShareOffer: true,
                isRequestSuccessful: false
            });
            const response = await api.post(`/shareoffers/workspaces/${workspaceID}/request`, { RequestedRole: role, Message: message });
            const createdOffer = response.data as ShareOffer | undefined;

            if (createdOffer?.ID) {
                useCacheStore.getState().upsertShareOffers([createdOffer]);
                const targetWorkspaceID = createdOffer.TargetID ?? workspaceID;
                const targetWorkspace = useCacheStore.getState().getWorkspaceById(targetWorkspaceID);
                useWorkspaceStore.getState().appendPendingWorkspaceId(targetWorkspaceID, "request", createdOffer.ID, targetWorkspace);

                set((state) => {
                    if (state.userWorkspaceAccessSentRequestsIds.includes(createdOffer.ID)) {
                        return state;
                    }
                    return {
                        userWorkspaceAccessSentRequestsIds: [...state.userWorkspaceAccessSentRequestsIds, createdOffer.ID]
                    }
                })
            } else {
                useWorkspaceStore.getState().appendPendingWorkspaceId(workspaceID, "request");
            }
            set({ isRequestSuccessful: true });
        } catch (error) {
            set({ isRequestSuccessful: false });
            throw error;
        } finally {
            set({ isSendingShareOffer: false });
        }
    },





    getIsSuccess: () => {
        return get().isRequestSuccessful;
    },
    fillUserLookup: async (shareOffers: ShareOffer[]) => {
        const ToUserIDs = shareOffers.map((offer) => offer.ToUserID);
        const FromUserIDs = shareOffers.map((offer) => offer.FromUserID);
        const uniqueUserIDs = Array.from(new Set([...ToUserIDs, ...FromUserIDs]));
        await useUserStore.getState().fetchUsersByIDs(uniqueUserIDs);
    },



    mergeWorkspaceDetailsFromShareOffers: (shareOffers: ShareOffer[]) => {
        const details = shareOffers.reduce((acc, offer) => {
            const detail = offer as unknown as ShareOfferDetailsResponse;
            if ("TargetWorkspaceDetails" in detail) {
                acc.push(detail);
            }
            return acc;
        }, [] as ShareOfferDetailsResponse[]);
        if (details.length > 0) {
            useCacheStore.getState().upsertShareOfferDetails(details);
        }
    },

    fetchUserBoardAccessSentRequests: async () => {
        try {
            const response = await api.get(`/shareoffers/boards/outgoing/requests`);
            const shareOffersDetails = (response.data ?? []) as UserBoardShareOffersDetails[];
            // console.log("Fetched user board access sent requests", shareOffersDetails);

            useCacheStore.getState().upsertShareOfferDetails(shareOffersDetails);
            const offerIds = shareOffersDetails.map((detail) => detail.ShareOffer.ID);
            set({
                userBoardAccessSentRequestsIds: offerIds
            })
        } catch (error) {
            const statusCode = (error as { response?: { status?: number } })?.response?.status;
            if (statusCode === 404) {
                set({ userBoardAccessSentRequestsIds: [] });
                return;
            }
            // console.log("Error fetching user board access sent requests", error);
            throw error;
        }
    },
    fetchUserBoardInvitesIncoming: async () => {
        try {
            const response = await api.get(`/shareoffers/boards/incoming/invites`);
            const shareOffersDetails = (response.data ?? []) as UserBoardShareOffersDetails[];
            // console.log("Fetched user board incoming invites", shareOffersDetails);
            useCacheStore.getState().upsertShareOfferDetails(shareOffersDetails);
            const offerIds = shareOffersDetails.map((detail) => detail.ShareOffer.ID);
            set({
                userBoardInvitesIncomingIds: offerIds
            })
        } catch (error) {
            // console.log("Error fetching user board incoming invites", error);
            throw error;
        }
    },


    fetchUserWorkspaceIncomingInvites: async () => {
        try {
            // console.log("Fetching incoming share offers details for user");
            const response = await api.get(`/shareoffers/incoming/details`);
            const shareOffersDetails = (response.data?.ShareOffers ?? []) as ShareOfferDetailsResponse[];
            // console.log("Fetched incoming share offers details for user", shareOffersDetails);
            useCacheStore.getState().upsertShareOfferDetails(shareOffersDetails);
            const offerIds = shareOffersDetails.map((detail) => detail.ShareOffer.ID);
            set({
                userWsIncomingOfferIds: offerIds
            })

        } catch (error) {
            // console.log("Error fetching incoming share offers details for user", error);
            throw error;
        }

    },
    fetchUserWorkspaceAccessSentRequests: async () => {
        try {
            const response = await api.get(`/shareoffers/workspaces/outgoing/requests`);
            const shareOffersDetails = (response.data ?? []) as ShareOfferDetailsResponse[];
            useCacheStore.getState().upsertShareOfferDetails(shareOffersDetails);
            const offerIds = shareOffersDetails.map((detail) => detail.ShareOffer.ID);
            set({
                userWorkspaceAccessSentRequestsIds: offerIds
            })
        } catch (error) {
            throw error;
        }
    },
    setBoardReceivedRequestsForBoards: (details: BoardShareOfferWithUserDetails[]) => {
        useCacheStore.getState().upsertBoardShareOfferDetails(details);
        const idsByBoard: Record<string, string[]> = {};
        for (const detail of details) {
            const boardID = detail.ShareOffer.TargetID;
            if (!idsByBoard[boardID]) idsByBoard[boardID] = [];
            idsByBoard[boardID].push(detail.ShareOffer.ID);
        }
        set((state) => {
            const next = { ...state.boardReceivedRequestsIdsByBoardId };
            for (const [boardID, ids] of Object.entries(idsByBoard)) {
                next[boardID] = ids;
            }
            return { boardReceivedRequestsIdsByBoardId: next };
        });
    },
    fetchBoardReceivedRequests: async (boardID: string) => {
        try {
            // console.log("Fetching board received requests for board", boardID);
            const response = await api.get(`/shareoffers/boards/${boardID}/incoming/requests`);
            const shareOffersDetails = (response.data ?? []) as BoardShareOfferWithUserDetails[];

            useCacheStore.getState().upsertBoardShareOfferDetails(shareOffersDetails);
            // console.log("Fetched board received requests for board", boardID, shareOffersDetails);
            const offerIds = shareOffersDetails.map((detail) => detail.ShareOffer.ID);
            set((state) => {
                const next = { ...state.boardReceivedRequestsIdsByBoardId };
                next[boardID] = offerIds;
                return {
                    boardReceivedRequestsIdsByBoardId: next
                }
            }
            )

        } catch (error) {
            // console.log("Error fetching board received requests for board", boardID, error);
            throw error;
        }
    },
    fetchWorkspaceReceivedRequests: async (workspaceID: string) => {
        try {
            const response = await api.get(`/shareoffers/workspaces/${workspaceID}/incoming/requests`);
            const shareOffersDetails = (response.data ?? []) as BoardShareOfferWithUserDetails[];

            useCacheStore.getState().upsertBoardShareOfferDetails(shareOffersDetails);
            const offerIds = shareOffersDetails.map((detail) => detail.ShareOffer.ID);
            set((state) => {
                const next = { ...state.workspaceReceivedRequestsIdsByWorkspaceId };
                next[workspaceID] = offerIds;
                return {
                    workspaceReceivedRequestsIdsByWorkspaceId: next
                }
            });
        } catch (error) {
            throw error;
        }
    },
    fetchBoardSentInvites: async (boardID: string) => {
        try {
            const response = await api.get(`/shareoffers/boards/${boardID}/outgoing/invites`);
            const shareOffersDetails = (response.data ?? []) as BoardShareOfferWithUserDetails[];

            useCacheStore.getState().upsertBoardShareOfferDetails(shareOffersDetails);
            const offerIds = shareOffersDetails.map((detail) => detail.ShareOffer.ID);
            set((state) => {
                const next = { ...state.boardSentInvitesIdsByBoardId };
                next[boardID] = offerIds;
                return {
                    boardSentInvitesIdsByBoardId: next
                }
            });
        } catch (error) {
            throw error;
        }
    },







}

))
