import { create } from "zustand";
import { api } from "@/api/api";

import type { ChangeWorkspaceMemberRoleRequest, User, UserWorkspace } from "./types";
import { useUserStore } from "./userStore";
import { useAsyncRequestStore } from "./asyncRequestStore";
import type { AsyncRequestKey } from "./asyncRequestTypes";

export type WorkspaceMemberData = {
    User: User[];
    UserWorkspace: UserWorkspace[];
}


type WsMembersState = {
    userWorkspacesByWorkspaceId: Record<string, Record<string, UserWorkspace>>;
    userIdsByWorkspaceId: Record<string, string[]>;
    fetchWorkspaceMembers: (workspaceID: string) => Promise<void>;
    addWorkspaceMember: (workspaceID: string, userID: string, role: string) => Promise<void>;
    hardReplaceWorkspaceMembers: (workspaceID: string, data: WorkspaceMemberData) => void;
    mergeMembersData: (data: WorkspaceMemberData) => void;
    mergeUserWorkspaceRelation: (userWorkspaces: UserWorkspace[]) => void;
    getMembersByWorkspaceId: (workspaceId: string) => UserWorkspace[];
    getUserWorkspacesByUserId: (userId: string) => UserWorkspace[];
    updateMemberRole: (workspaceID: string, userID: string, payload: ChangeWorkspaceMemberRoleRequest) => Promise<void>;
    replaceMemberPendingSuspensionSelection: (workspaceID: string, markedUserIDs: string[], unmarkedUserIDs: string[], asyncKey?: AsyncRequestKey) => Promise<void>;
    applyUpsertUserWorkspaceRelations: (userWorkspaces: UserWorkspace[]) => void;
    deleteWorkspaceMember: (workspaceID: string, userID: string) => Promise<void>;
    applyDeleteWorkspaceRelations: (data: UserWorkspace[]) => void;

}

export const useWsMembersStore = create<WsMembersState>((set, get) => ({
    userWorkspacesByWorkspaceId: {}, //by workspaceID -> userID
    userIdsByWorkspaceId: {}, //by workspaceID

    fetchWorkspaceMembers: async (workspaceID: string) => {
        try {
            const response = await api.get(`/workspaces/${workspaceID}/members`);
            get().hardReplaceWorkspaceMembers(workspaceID, response.data as WorkspaceMemberData);
        } catch (error) {
            // console.log("Error fetching workspace members");
            throw error;
        }
    },
    hardReplaceWorkspaceMembers: (workspaceID: string, data: WorkspaceMemberData) => {
        const usersByID: Record<string, User> = data.User.reduce((acc, user) => {
            acc[user.ID] = user;
            return acc;
        }, {} as Record<string, User>);

        const userWorkspacesById: Record<string, UserWorkspace> = {};
        const userIDs: string[] = [];
        data.UserWorkspace.forEach((userWorkspace) => {
            userWorkspacesById[userWorkspace.UserID] = userWorkspace;
            if (!userIDs.includes(userWorkspace.UserID)) {
                userIDs.push(userWorkspace.UserID);
            }
        });

        useUserStore.setState((state) => ({
            usersById: { ...state.usersById, ...usersByID }
        }));

        set((state) => ({
            userWorkspacesByWorkspaceId: {
                ...state.userWorkspacesByWorkspaceId,
                [workspaceID]: userWorkspacesById,
            },
            userIdsByWorkspaceId: {
                ...state.userIdsByWorkspaceId,
                [workspaceID]: userIDs,
            }
        }));
    },
    addWorkspaceMember: async (workspaceID: string, userID: string, role: string) => {
        try {
            await api.post(`/workspaces/${workspaceID}/members`, { TargetUserID: userID, Role: role });
            get().fetchWorkspaceMembers(workspaceID);
        } catch (error) {
            // console.log("Error adding workspace member");
            throw error;
        }
    },
    mergeMembersData: (data: WorkspaceMemberData) => {
        const usersByID: Record<string, User> = data.User.reduce((acc, user) => {
            acc[user.ID] = user;
            return acc;
        }, {} as Record<string, User>);
        const userWorkspacesById: Record<string, UserWorkspace> = data.UserWorkspace.reduce((acc, userWorkspace) => {
            acc[userWorkspace.UserID] = userWorkspace;
            return acc;
        }, {} as Record<string, UserWorkspace>);

        const userIdsByWorkspaceId: Record<string, string[]> = {};
        data.UserWorkspace.forEach((userWorkspace) => {
            if (!userIdsByWorkspaceId[userWorkspace.WorkspaceID]) {
                userIdsByWorkspaceId[userWorkspace.WorkspaceID] = [];
            }
            userIdsByWorkspaceId[userWorkspace.WorkspaceID].push(userWorkspace.UserID);
        });

        useUserStore.setState((state) => ({
            usersById: { ...state.usersById, ...usersByID }
        }));
        set((state) => {
            const nextUserWorkspacesByWorkspaceId = { ...state.userWorkspacesByWorkspaceId };
            Object.entries(userIdsByWorkspaceId).forEach(([workspaceId, userIds]) => {
                nextUserWorkspacesByWorkspaceId[workspaceId] = {
                    ...(nextUserWorkspacesByWorkspaceId[workspaceId] ?? {})
                };
                userIds.forEach((userId) => {
                    if (userWorkspacesById[userId]) {
                        nextUserWorkspacesByWorkspaceId[workspaceId][userId] = userWorkspacesById[userId];
                    }
                });
            });
            return {
                userWorkspacesByWorkspaceId: nextUserWorkspacesByWorkspaceId,
                userIdsByWorkspaceId: { ...state.userIdsByWorkspaceId, ...userIdsByWorkspaceId }
            };
        });
    },
    mergeUserWorkspaceRelation: (userWorkspaces: UserWorkspace[]) => {
        set((state) => {
            const nextUserWorkspacesByWorkspaceId: Record<string, Record<string, UserWorkspace>> = { ...state.userWorkspacesByWorkspaceId };
            const nextUserIdsByWorkspaceId: Record<string, string[]> = { ...state.userIdsByWorkspaceId };

            userWorkspaces.forEach((userWorkspace) => {
                const workspaceId = userWorkspace.WorkspaceID;
                const userId = userWorkspace.UserID;

                const existingMembers = { ...(nextUserWorkspacesByWorkspaceId[workspaceId] ?? {}) };
                existingMembers[userId] = userWorkspace;
                nextUserWorkspacesByWorkspaceId[workspaceId] = existingMembers;

                const existingUserIds = [...(nextUserIdsByWorkspaceId[workspaceId] ?? [])];
                if (!existingUserIds.includes(userId)) {
                    existingUserIds.push(userId);
                }
                nextUserIdsByWorkspaceId[workspaceId] = existingUserIds;
            });

            return {
                userWorkspacesByWorkspaceId: nextUserWorkspacesByWorkspaceId,
                userIdsByWorkspaceId: nextUserIdsByWorkspaceId
            };
        });
    },
    getMembersByWorkspaceId: (workspaceId: string) => {
        const members = get().userWorkspacesByWorkspaceId[workspaceId];
        if (!members) {
            return [];
        }
        return Object.values(members);
    },
    updateMemberRole: async (workspaceID: string, userID: string, payload: ChangeWorkspaceMemberRoleRequest) => {
        try {
            const resposne = await api.patch(`/workspaces/${workspaceID}/members/${userID}`, payload);
            const data: UserWorkspace = resposne.data;
            //console.log("Updated member role", data);
            get().applyUpsertUserWorkspaceRelations([data]);
        } catch (error) {
            // console.log("Error updating member role");
            throw error;
        }
    },
    replaceMemberPendingSuspensionSelection: async (workspaceID, markedUserIDs, unmarkedUserIDs, asyncKey?) => {
        const run = async () => {
            await api.post(`/workspaces/${workspaceID}/subscription/suspension/members`, {
                MarkedUserIDs: markedUserIDs,
                UnmarkedUserIDs: unmarkedUserIDs,
            });
            await get().fetchWorkspaceMembers(workspaceID);
        };
        if (asyncKey) {
            await useAsyncRequestStore.getState().execute(asyncKey, run, { successResetDelayMs: 1500 });
        } else {
            await run();
        }
    },
    applyUpsertUserWorkspaceRelations: (userWorkspaces: UserWorkspace[]) => {
        console.log("Applying upsert for user workspace relations", userWorkspaces);
        set((state) => {
            const nextUserIdsByWorkspaceId: Record<string, string[]> = { ...state.userIdsByWorkspaceId };
            const nextUserWorkspacesByWorkspaceId: Record<string, Record<string, UserWorkspace>> = { ...state.userWorkspacesByWorkspaceId };

            userWorkspaces.forEach((userWorkspace) => {
                const workspaceId = userWorkspace.WorkspaceID;
                const userId = userWorkspace.UserID;

                const nextUserIds = [...(nextUserIdsByWorkspaceId[workspaceId] ?? [])];
                if (!nextUserIds.includes(userId)) {
                    nextUserIds.push(userId);
                }
                nextUserIdsByWorkspaceId[workspaceId] = nextUserIds;

                const nextWorkspaceMembers = { ...(nextUserWorkspacesByWorkspaceId[workspaceId] ?? {}) };
                nextWorkspaceMembers[userId] = userWorkspace;
                nextUserWorkspacesByWorkspaceId[workspaceId] = nextWorkspaceMembers;
            });

            //console.log("prevState:", state.userWorkspacesByWorkspaceId, "nextState:", nextUserWorkspacesByWorkspaceId);
            return {
                userIdsByWorkspaceId: nextUserIdsByWorkspaceId,
                userWorkspacesByWorkspaceId: nextUserWorkspacesByWorkspaceId
            };
        });
    },

    deleteWorkspaceMember: async (workspaceID: string, userID: string) => {
        try {
            const respone = await api.delete(`/workspaces/${workspaceID}/members/${userID}`);
            const data: UserWorkspace = respone.data;
            get().applyDeleteWorkspaceRelations([data])
        } catch (error) {
            // console.log("Error deleting workspace member");
            throw error;
        }
    },
    applyDeleteWorkspaceRelations: (data: UserWorkspace[]) => {
        console.log("Applying delete workspace member relations", data);
        set((state) => {
            const nextUserIdsByWorkspaceId: Record<string, string[]> = { ...state.userIdsByWorkspaceId };
            const nextUserWorkspacesByWorkspaceId: Record<string, Record<string, UserWorkspace>> = { ...state.userWorkspacesByWorkspaceId };

            data.forEach((userWorkspace) => {
                const workspaceId = userWorkspace.WorkspaceID;
                const userId = userWorkspace.UserID;

                nextUserIdsByWorkspaceId[workspaceId] = (nextUserIdsByWorkspaceId[workspaceId] ?? []).filter((id) => id !== userId);

                if (nextUserWorkspacesByWorkspaceId[workspaceId]) {
                    const nextWorkspaceMembers = { ...nextUserWorkspacesByWorkspaceId[workspaceId] };
                    delete nextWorkspaceMembers[userId];
                    nextUserWorkspacesByWorkspaceId[workspaceId] = nextWorkspaceMembers;
                }
            });

            return {
                userIdsByWorkspaceId: nextUserIdsByWorkspaceId,
                userWorkspacesByWorkspaceId: nextUserWorkspacesByWorkspaceId
            };
        });
    },
    getUserWorkspacesByUserId: (userId: string) => {
        const workspacesById = get().userWorkspacesByWorkspaceId;
        const userworkspaces: UserWorkspace[] = Object.values(workspacesById)
            .flatMap((usersById) => Object.values(usersById))

        const filtered = userworkspaces.filter((uw) => uw.UserID === userId);
        return filtered;
    }










}))