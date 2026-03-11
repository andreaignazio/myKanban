import { api } from "@/api/api";
import { getSubscriptionMaxBoards } from "@/domain/plans";
import { create } from "zustand";

import type { BoardDetailPatch, DeltaPayload } from "./boardDetailStore";
import type { PatchWorkspacePropsRequest, SubscriptionPlan, User, UserEvent, UserWorkspace, UserWorkspaceBoardRestoredPayload, Workspace, WorkspaceEvent, WorkspaceSubscription } from "./types";
import { useWsMembersStore } from "./wsMembersStore";
import { useUserStore } from "./userStore";
import { useBoardsStore, type UserBoardData } from "./boardsStore";
import type { AnyUser } from "./usertypes";
import { useUiStore } from "./uiStore";
import { useAuthStore } from "./auth";
import type { RequestSubscriptionCheckout, SubscriptionCheckoutResponse } from "@/types/subscriptiontypes";
import type { ShareOffer } from "./shareOfferTypes";
import { useAsyncRequestStore } from "./asyncRequestStore";

export type WorkspaceMembers = {
    User: AnyUser;
    UserWorkspace: UserWorkspace
}
export type UserWorkspaceData = WorkspaceData & {

    UserWorkspaces: UserWorkspace[];

};

export type WorkspaceData = {
    Workspaces: Workspace[];
    WorkspaceSubscriptions: WorkspaceSubscription[];
}

export type PendingOfferTargetWorkspacesResponse = WorkspaceData & {
    ShareOffers: ShareOffer[];
}

export type SearchPublicWorkspacesParams = {
    query?: string;
    page?: number;
    limit?: number;
    sort?: "name" | "updated";
}

export type SearchPublicWorkspacesResponse = WorkspaceData & {
    Page: number;
    Limit: number;
    Sort: "name" | "updated";
    Total: number;
}



export type WorkspaceStore = {
    workspacesById: Record<string, Workspace>;
    workspaceIds: string[];
    hasHydratedWorkspaces: boolean;
    pendingOfferedWorkspaceIds: string[];
    pendingRequestedWorkspaceIds: string[];
    offerIdByWorkspaceId: Record<string, string>;
    searchedWorkspacesIds: string[];
    wSubscriptionsById: Record<string, WorkspaceSubscription>;
    fetchWorkspaces: () => Promise<void>;
    searchPublicWorkspaces: (params?: SearchPublicWorkspacesParams) => Promise<SearchPublicWorkspacesResponse>;
    fetchPendingOfferTargetWorkspaces: () => Promise<PendingOfferTargetWorkspacesResponse>;
    mergeWorkspaceData: (data: UserWorkspaceData) => void;
    mergeWorkspaces: (workspaces: Workspace[]) => void;
    createWorkspace: (Name: string) => Promise<void>
    applyWorkspaceEventDelta: (delta: DeltaPayload) => void;
    applyWorkspaceCreated: (payload: UserWorkspaceData) => void;
    hydrateWorkspaces: () => Promise<void>;
    getWorkspaceById: (id: string) => Workspace;
    getMembersByWorkspaceId: (workspaceId: string) => WorkspaceMembers[];
    getMaxBoardsByWorkspaceId: (workspaceId: string) => [number, number]; // [currentBoards, maxBoards]
    applyWorkspaceEvent: (evt: WorkspaceEvent | UserEvent) => void;
    applyBoardClosed: (evt: WorkspaceEvent) => void;
    createUpgradeSubscriptionRequest: (plan: SubscriptionPlan, seats: number, workspaceID: string) => Promise<void>;
    cancelWorkspaceSubscription: (workspaceID: string) => Promise<WorkspaceSubscription | null>;
    resumeWorkspaceSubscription: (workspaceID: string) => Promise<WorkspaceSubscription | null>;
    patchWorkspaceProps: (workspaceID: string, payload: PatchWorkspacePropsRequest) => Promise<Workspace>;
    getWorkspaceWhereUserIsMember: (userId: string) => Workspace[];
    isWorkspaceAccessible: (workspaceId: string) => boolean;
    removeWorkspace: (workspaceId: string) => void;
    appendPendingWorkspaceId: (workspaceId: string, offerKind: "invite" | "request", offerID?: string, workspace?: Workspace) => void;
    removePendingWorkspaceId: (workspaceId: string, offerKind: "invite" | "request") => void;
    getWorkspaceStatus: (workspaceId: string) => "accessible" | "offered" | "requested" | "none";
};

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
    workspacesById: {},
    workspaceIds: [],
    hasHydratedWorkspaces: false,
    wSubscriptionsById: {},
    searchedWorkspacesIds: [],
    pendingOfferedWorkspaceIds: [],
    pendingRequestedWorkspaceIds: [],
    offerIdByWorkspaceId: {},

    hydrateWorkspaces: async () => {
        await get().fetchWorkspaces()
        await get().fetchPendingOfferTargetWorkspaces()
        set(() => ({ hasHydratedWorkspaces: true }))
    },
    fetchWorkspaces: async () => {
        try {
            const response = await api.get("/workspaces");
            const data: UserWorkspaceData = response.data;
            // console.log("Fetched workspaces", data)



            const workspaceIds: string[] = data.Workspaces.map((ws) => ws.ID)

            const workspacesById: Record<string, Workspace> = data.Workspaces.reduce((acc, item) => {
                acc[item.ID] = item
                return acc
            }, {} as Record<string, Workspace>)

            const workspaceSubscriptionsById: Record<string, WorkspaceSubscription> = data.WorkspaceSubscriptions.reduce((acc, item) => {
                acc[item.WorkspaceID] = item
                return acc
            }, {} as Record<string, WorkspaceSubscription>)

            if (data.UserWorkspaces.length > 0) {
                useWsMembersStore.getState().mergeUserWorkspaceRelation(data.UserWorkspaces)
            }

            set((state) => ({
                workspaceIds: workspaceIds,
                workspacesById: workspacesById,
                wSubscriptionsById: workspaceSubscriptionsById
            }))
        } catch (error) {
            // console.log("Error fetching workspaces")
            throw error
        }

    },
    searchPublicWorkspaces: async (params = {}) => {
        const query = (params.query ?? "").trim();
        const page = params.page ?? 1;
        const limit = params.limit ?? 20;
        const sort = params.sort ?? "updated";

        const response = await api.get("/workspaces/search", {
            params: {
                query,
                page,
                limit,
                sort,
            },
        });

        const data = response.data as SearchPublicWorkspacesResponse;

        set((state) => {
            const nextWorkspacesById = { ...state.workspacesById };
            data.Workspaces.forEach((workspace) => {
                nextWorkspacesById[workspace.ID] = workspace;
            });

            const nextSubscriptionsById = { ...state.wSubscriptionsById };
            data.WorkspaceSubscriptions.forEach((subscription) => {
                nextSubscriptionsById[subscription.WorkspaceID] = subscription;
            });

            const nextWorkspaceIds = new Set(state.searchedWorkspacesIds);
            data.Workspaces.forEach((workspace) => nextWorkspaceIds.add(workspace.ID));

            return {
                workspacesById: nextWorkspacesById,
                searchedWorkspacesIds: Array.from(nextWorkspaceIds),
                wSubscriptionsById: nextSubscriptionsById,
            };
        });

        return data;
    },
    fetchPendingOfferTargetWorkspaces: async () => {
        const response = await api.get("/workspaces/pending-offers/targets");
        const data = response.data as PendingOfferTargetWorkspacesResponse;

        console.log("Fetched pending offer target workspaces", data)
        set((state) => {
            const nextWorkspacesById = { ...state.workspacesById };
            data.Workspaces.forEach((workspace) => {
                nextWorkspacesById[workspace.ID] = workspace;
            });

            const nextSubscriptionsById = { ...state.wSubscriptionsById };
            data.WorkspaceSubscriptions.forEach((subscription) => {
                nextSubscriptionsById[subscription.WorkspaceID] = subscription;
            });

            const nextWorkspaceIds = new Set(state.workspaceIds);
            data.Workspaces.forEach((workspace) => nextWorkspaceIds.add(workspace.ID));

            const nextPendingOfferedWorkspaceIds = new Set(state.pendingOfferedWorkspaceIds);
            const nextPendingRequestedWorkspaceIds = new Set(state.pendingRequestedWorkspaceIds);
            data.ShareOffers.forEach((offer) => {
                if (offer.Kind === "invite") {
                    nextPendingOfferedWorkspaceIds.add(offer.TargetID)
                }
                if (offer.Kind === "request") {
                    nextPendingRequestedWorkspaceIds.add(offer.TargetID)
                }
            })

            return {
                workspacesById: nextWorkspacesById,
                workspaceIds: Array.from(nextWorkspaceIds),
                wSubscriptionsById: nextSubscriptionsById,
                pendingOfferedWorkspaceIds: Array.from(nextPendingOfferedWorkspaceIds),
                pendingRequestedWorkspaceIds: Array.from(nextPendingRequestedWorkspaceIds),
                offerIdByWorkspaceId: data.ShareOffers.reduce((acc, offer) => {
                    acc[offer.TargetID] = offer.ID;
                    return acc;
                }, {} as Record<string, string>)
            };
        });

        return data;
    },
    createWorkspace: async (Name: string) => {
        try {
            await api.post("/workspaces", { Name });
            //const data: UserWorkspaceData = response.data;
        } catch (error) {
            // console.log("Error creating workspace")
            throw error
        }
    },
    applyWorkspaceEventDelta: (delta: DeltaPayload) => {

        const { Type, Payload } = delta

        switch (Type) {
            case "workspace.created": {
                get().applyWorkspaceCreated(Payload as unknown as UserWorkspaceData)
                break
            }
        }


    },
    applyWorkspaceCreated: (payload: UserWorkspaceData) => {
        const workspace = payload.Workspaces[0]
        const userWorkspace = payload.UserWorkspaces[0]
        const subscription = payload.WorkspaceSubscriptions[0]
        if (userWorkspace) {
            useWsMembersStore.getState().mergeUserWorkspaceRelation([userWorkspace])
        }
        set((state) => ({
            workspacesById: { ...state.workspacesById, [workspace.ID]: workspace },
            workspaceIds: [...state.workspaceIds, workspace.ID],
            wSubscriptionsById: { ...state.wSubscriptionsById, [workspace.ID]: subscription }
        }))
    },
    mergeWorkspaceData: (data: UserWorkspaceData) => {
        set((state) => {
            const nextWorkspacesById = { ...state.workspacesById };
            data.Workspaces.forEach((workspace) => {
                nextWorkspacesById[workspace.ID] = workspace;
            });

            const nextSubscriptionsById = { ...state.wSubscriptionsById };
            data.WorkspaceSubscriptions.forEach((subscription) => {
                nextSubscriptionsById[subscription.WorkspaceID] = subscription;
            });

            const nextWorkspaceIds = new Set(state.workspaceIds);
            data.Workspaces.forEach((workspace) => nextWorkspaceIds.add(workspace.ID));

            if (data.UserWorkspaces.length > 0) {
                useWsMembersStore.getState().mergeUserWorkspaceRelation(data.UserWorkspaces)
            }

            return {
                workspacesById: nextWorkspacesById,
                workspaceIds: Array.from(nextWorkspaceIds),
                wSubscriptionsById: nextSubscriptionsById
            };
        });
    },
    mergeWorkspaces: (workspaces) => {
        if (workspaces.length === 0) return;

        set((state) => {
            const nextWorkspacesById = { ...state.workspacesById };

            workspaces.forEach((workspace) => {
                nextWorkspacesById[workspace.ID] = workspace;
            });

            return {
                workspacesById: nextWorkspacesById,
            };
        });
    },
    getWorkspaceById: (id: string) => {
        const workspace = get().workspacesById[id]
        if (!workspace) {
            throw new Error(`Workspace with id ${id} not found`)
        }
        return workspace
    },
    getMembersByWorkspaceId: (workspaceId: string) => {
        const members = useWsMembersStore.getState().getMembersByWorkspaceId(workspaceId)
        const users = useUserStore.getState().usersById
        return members.map((member) => ({
            User: users[member.UserID],
            UserWorkspace: member
        }))
    },
    getMaxBoardsByWorkspaceId: (workspaceId: string) => {
        const subscription = get().wSubscriptionsById[workspaceId];
        if (!subscription) {
            return [0, getSubscriptionMaxBoards("free")]; // Default to free plan limits if no subscription found
        }
        const totalBoardsCount = useBoardsStore.getState().boardIdsByWorkspaceId[workspaceId]?.length || 0;
        return [totalBoardsCount, getSubscriptionMaxBoards(subscription.Plan)];
    },
    applyWorkspaceEvent: (evt: WorkspaceEvent | UserEvent) => {
        console.log("Applying workspace event", evt)
        switch (evt.Type) {
            case "workspace.board.created": {
                const payload = evt.Payload.StatePayload as BoardDetailPatch

                useBoardsStore.getState().mergeBoardsInWorkspace(evt.WorkspaceID, payload.Boards)
                break
            }
            case "workspace.board.closed": {
                const currentUserId = useAuthStore.getState().userID
                if (evt.ActorUserID === currentUserId) {
                    return;
                }
                useBoardsStore.getState().applyBoardClosedEvent(evt)
                get().applyBoardClosed(evt)
                break
            }
            case "workspace.board.restored": {
                console.log("Applying board restored event", evt)
                const data: UserBoardData = {
                    Boards: Object.values(evt.Payload.StatePayload.Boards),
                    UserBoards: []
                }
                useBoardsStore.getState().applyCrateBoard(data)
                useBoardsStore.getState().applyRemoveBoardFromClosed(data)
                break
            }
            case "workspace.user.board.restored": {
                console.log("Applying user board restored event", evt)
                const payload = (evt as UserEvent).Payload.WorkspaceBoardRestoredPayload as UserWorkspaceBoardRestoredPayload | undefined
                if (!payload) {
                    return
                }
                const data: UserBoardData = {
                    Boards: [payload.Board],
                    UserBoards: [payload.UserBoard]
                }
                useBoardsStore.getState().applyCrateBoard(data)
                break
            }
            case "workspace.board.purged": {
                console.log("Applying board purged event", evt)
                const payload = evt.Payload.StatePayload as BoardDetailPatch
                const boardId = Object.keys(payload.Boards)[0] ?? "";
                useBoardsStore.getState().applyRemoveIdsFromClosed(evt.WorkspaceID, [boardId])
                break
            }
            case "workspace.member.role.changed": {
                const data = evt.Payload.StatePayload as BoardDetailPatch
                const relations = data.UserWorkspaceRelations ?? []
                useWsMembersStore.getState().applyUpsertUserWorkspaceRelations(relations)
                break
            }
            case "workspace.member.removed":
            case "workspace.user.member.removed": {
                const currentUserId = useAuthStore.getState().userID
                const userPayload = (evt as UserEvent).Payload?.WorkspaceMembershipPayload
                const statePayload = (evt as WorkspaceEvent).Payload?.StatePayload as BoardDetailPatch | undefined
                const removedRelation = userPayload?.UserWorkspace ?? statePayload?.UserWorkspaceRelations?.[0]
                if (!removedRelation || removedRelation.UserID !== currentUserId) {
                    break
                }

                useWsMembersStore.getState().applyDeleteWorkspaceRelations([removedRelation])
                get().removeWorkspace(removedRelation.WorkspaceID)

                const currentRouteWorkspaceId = useUiStore.getState().currentRouteParams.workspaceId
                if (currentRouteWorkspaceId === removedRelation.WorkspaceID) {
                    useUiStore.getState().setLostWorkspaceAccessModalOpen(true, removedRelation.WorkspaceID)
                }
                break
            }
            case "workspace.user.updated": {
                const user = evt.Payload?.User as User | undefined
                if (!user) {
                    return
                }
                useUserStore.getState().mergeUsers([user])
                break
            }

        }
    },
    applyBoardClosed(evt: WorkspaceEvent) {
        // const payload = evt?.Payload.StatePayload as BoardDetailPatch;
        //const boardID = Object.keys(payload.Boards)[0] ?? "";
        const closedBoardId = evt ? Object.keys(evt.Payload.StatePayload.Boards)[0] : null;
        const currentBoardId = useUiStore.getState().currentRouteParams.boardId
        console.log("Applying board closed logic. Closed board ID:", closedBoardId, "Current board ID:", currentBoardId)
        if (closedBoardId && currentBoardId === closedBoardId) {
            useUiStore.getState().setDeletedBoardModalOpen(true)
        }
    },
    createUpgradeSubscriptionRequest: async (plan: SubscriptionPlan, seats: number, workspaceID: string) => {

        const request: RequestSubscriptionCheckout = {
            PlanCode: plan,
            Seats: seats,
            SuccessUrl: `http://localhost:5173/workspaces/${workspaceID}/settings/subscription/success`,
            CancelUrl: `http://localhost:5173/workspaces/${workspaceID}/settings/subscription/failed`
        }


        await useAsyncRequestStore.getState().execute("subscription:checkout",
            () => api.post(`/workspaces/${workspaceID}/subscription/checkout`, request),
            {
                onSuccess: (data) => {
                    applySubscription(data)
                }
            }
        )

        //const response = await api.post(`/workspaces/${workspaceID}/subscription/checkout`, request)

        function applySubscription(response: any) {
            const data = response.data as SubscriptionCheckoutResponse

            if (data.Subscription) {
                const subscription = data.Subscription

                set((state) => ({
                    wSubscriptionsById: {
                        ...state.wSubscriptionsById,
                        [workspaceID]: subscription,
                    },
                }))
            }

            if (data.Action === "checkout" && data.CheckoutUrl) {
                window.location.href = data.CheckoutUrl
            }
        }
    },
    cancelWorkspaceSubscription: async (workspaceID: string) => {
        const response = await useAsyncRequestStore.getState().execute(
            "subscription:cancel",
            () => api.post(`/workspaces/${workspaceID}/subscription/cancel`),
            {
                onSuccess: (result) => {
                    const subscription = result.data as WorkspaceSubscription

                    set((state) => ({
                        wSubscriptionsById: {
                            ...state.wSubscriptionsById,
                            [workspaceID]: subscription,
                        },
                    }))
                }
            }
        )

        return response?.data as WorkspaceSubscription | null
    },
    resumeWorkspaceSubscription: async (workspaceID: string) => {
        const response = await useAsyncRequestStore.getState().execute(
            "subscription:resume",
            () => api.post(`/workspaces/${workspaceID}/subscription/resume`),
            {
                onSuccess: (result) => {
                    const subscription = result.data as WorkspaceSubscription

                    set((state) => ({
                        wSubscriptionsById: {
                            ...state.wSubscriptionsById,
                            [workspaceID]: subscription,
                        },
                    }))
                }
            }
        )

        return response?.data as WorkspaceSubscription | null
    },
    patchWorkspaceProps: async (workspaceID: string, payload: PatchWorkspacePropsRequest) => {
        const response = await api.patch(`/workspaces/${workspaceID}/props`, payload);
        const updatedWorkspace = response.data as Workspace;
        set((state) => ({
            workspacesById: {
                ...state.workspacesById,
                [workspaceID]: updatedWorkspace,
            },
        }));
        return updatedWorkspace;
    },

    getWorkspaceWhereUserIsMember: (userId: string) => {
        const userWorkspaces = useWsMembersStore.getState().getUserWorkspacesByUserId(userId)
        const workspaces = get().workspacesById

        const validWorkspaces = userWorkspaces.map((uw) => workspaces[uw.WorkspaceID]).filter((ws) => ws !== undefined)
        return validWorkspaces


    },
    isWorkspaceAccessible: (workspaceId: string) => {
        const userWorkspacesByUserId = useWsMembersStore.getState().userWorkspacesByWorkspaceId[workspaceId] || []
        const currentUserId = useAuthStore.getState().userID
        const uw = userWorkspacesByUserId[currentUserId ?? ""]
        return !!uw
    },
    removeWorkspace: (workspaceId: string) => {
        set((state) => {
            const nextIds = [...state.workspaceIds].filter((id) => id !== workspaceId)
            const { [workspaceId]: _, ...nextWorkspacesById } = state.workspacesById
            const { [workspaceId]: __, ...nextSubscriptionsById } = state.wSubscriptionsById
            const { [workspaceId]: ___, ...nextOfferIdByWorkspaceId } = state.offerIdByWorkspaceId
            const nextPendingOfferedWorkspaceIds = state.pendingOfferedWorkspaceIds.filter((id) => id !== workspaceId)
            const nextPendingRequestedWorkspaceIds = state.pendingRequestedWorkspaceIds.filter((id) => id !== workspaceId)
            return {
                workspaceIds: nextIds,
                workspacesById: nextWorkspacesById,
                wSubscriptionsById: nextSubscriptionsById,
                offerIdByWorkspaceId: nextOfferIdByWorkspaceId,
                pendingOfferedWorkspaceIds: nextPendingOfferedWorkspaceIds,
                pendingRequestedWorkspaceIds: nextPendingRequestedWorkspaceIds,
            }
        })
    },
    appendPendingWorkspaceId: (workspaceId: string, offerKind: "invite" | "request", offerID?: string, workspace?: Workspace) => {
        set((state) => {
            const nextWorkspaceIds = new Set(state.workspaceIds);
            const nextPendingOfferedWorkspaceIds = new Set(state.pendingOfferedWorkspaceIds);
            const nextPendingRequestedWorkspaceIds = new Set(state.pendingRequestedWorkspaceIds);
            const nextOfferIdByWorkspaceId = { ...state.offerIdByWorkspaceId };
            const nextWorkspacesById = { ...state.workspacesById };

            nextWorkspaceIds.add(workspaceId);
            if (offerKind === "invite") {
                nextPendingOfferedWorkspaceIds.add(workspaceId)
            }
            if (offerKind === "request") {
                nextPendingRequestedWorkspaceIds.add(workspaceId)
            }
            if (offerID) {
                nextOfferIdByWorkspaceId[workspaceId] = offerID;
            }
            if (workspace) {
                nextWorkspacesById[workspaceId] = workspace;
            }
            return {
                workspaceIds: Array.from(nextWorkspaceIds),
                workspacesById: nextWorkspacesById,
                pendingOfferedWorkspaceIds: Array.from(nextPendingOfferedWorkspaceIds),
                pendingRequestedWorkspaceIds: Array.from(nextPendingRequestedWorkspaceIds),
                offerIdByWorkspaceId: nextOfferIdByWorkspaceId,
            }
        })
    },
    removePendingWorkspaceId: (workspaceId: string, offerKind: "invite" | "request") => {
        set((state) => {
            const nextPendingOfferedWorkspaceIds = new Set(state.pendingOfferedWorkspaceIds);
            const nextPendingRequestedWorkspaceIds = new Set(state.pendingRequestedWorkspaceIds);
            const nextWorkspaceIds = new Set(state.workspaceIds);
            const nextOfferIdByWorkspaceId = { ...state.offerIdByWorkspaceId };
            const nextWorkspacesById = { ...state.workspacesById };

            if (offerKind === "invite") {
                nextPendingOfferedWorkspaceIds.delete(workspaceId)
            }
            if (offerKind === "request") {
                nextPendingRequestedWorkspaceIds.delete(workspaceId)
            }

            const isStillPending = nextPendingOfferedWorkspaceIds.has(workspaceId) || nextPendingRequestedWorkspaceIds.has(workspaceId)
            const isAccessible = get().isWorkspaceAccessible(workspaceId)

            if (!isStillPending) {
                delete nextOfferIdByWorkspaceId[workspaceId]
            }
            if (!isStillPending && !isAccessible) {
                nextWorkspaceIds.delete(workspaceId)
                delete nextWorkspacesById[workspaceId]
            }

            return {
                workspaceIds: Array.from(nextWorkspaceIds),
                workspacesById: nextWorkspacesById,
                pendingOfferedWorkspaceIds: Array.from(nextPendingOfferedWorkspaceIds),
                pendingRequestedWorkspaceIds: Array.from(nextPendingRequestedWorkspaceIds),
                offerIdByWorkspaceId: nextOfferIdByWorkspaceId,
            }
        })
    },
    getWorkspaceStatus: (workspaceId: string) => {

        const { pendingOfferedWorkspaceIds, pendingRequestedWorkspaceIds } = get();
        const isAccessible = get().isWorkspaceAccessible(workspaceId)
        if (isAccessible) {
            return "accessible"
        }
        if (pendingOfferedWorkspaceIds.includes(workspaceId)) {
            return "offered"
        }
        if (pendingRequestedWorkspaceIds.includes(workspaceId)) {
            return "requested"
        }
        return "none"
    }





}));
