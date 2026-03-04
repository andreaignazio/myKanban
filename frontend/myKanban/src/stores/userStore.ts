
import { create } from "zustand";
import { api } from "@/api/api";

import type { PatchMeDetailRequest, PatchMePropsRequest, User, UserLite } from "./types";
import { useAuthStore } from "./auth";

type GetUsersByIDsRequest = {
    UserIDs: string[];
}

type UserState = {
    usersById: Record<string, User | UserLite>
    searchUser: (query: string) => Promise<User[]>
    fetchUsersByIDs: (userIDs: string[]) => Promise<void>
    patchMeProps: (payload: PatchMePropsRequest) => Promise<User>
    patchMeDetail: (payload: PatchMeDetailRequest) => Promise<User>
    getUserByID: (userID: string) => User | UserLite | undefined
    mergeUsers: (users: User[] | UserLite[]) => void

}


export const useUserStore = create<UserState>((set, get) => ({
    usersById: {},
    searchUser: async (query) => {
        const response = await api.get(`/users/search?query=${encodeURIComponent(query)}`);
        return response.data.Users as User[];
        if (!response.data || !Array.isArray(response.data)) {
            //console.error("Invalid response data for user search:", response.data);
            return [];
        }
        const newUsersByID: Record<string, User> =
            response.data.reduce((acc: Record<string, User>, user: User) => {
                acc[user.ID] = user;
                return acc;
            }, {});
        set((state) => {
            const nextUsersByID = { ...state.usersById, ...newUsersByID };
            return { usersById: nextUsersByID };
        });
        return response.data as User[];
    },
    fetchUsersByIDs: async (userIDs) => {
        const cachedUsers = get().usersById;
        const cachedIds = new Set(Object.keys(cachedUsers))
        const missingIds = userIDs.filter((id) => !cachedIds.has(id))

        const payload: GetUsersByIDsRequest = { UserIDs: missingIds };
        const response = await api.post(`/users/lookup`, payload);
        // console.log("Fetched users by IDs:", userIDs, response.data);
        const users: User[] = response.data as User[];
        const newUsersByID: Record<string, User> =
            users.reduce((acc: Record<string, User>, user: User) => {
                acc[user.ID] = user;
                return acc;
            }, {});
        set((state) => {
            const nextUsersByID = { ...state.usersById, ...newUsersByID };
            return { usersById: nextUsersByID };
        });
    },
    patchMeProps: async (payload) => {
        const response = await api.patch(`/users/me/props`, payload);
        const updatedUser = response.data as User;
        get().mergeUsers([updatedUser]);
        useAuthStore.getState().setUserData(updatedUser);
        return updatedUser;
    },
    patchMeDetail: async (payload) => {
        const response = await api.patch(`/users/me/detail`, payload);
        const updatedUser = response.data as User;
        get().mergeUsers([updatedUser]);

        useAuthStore.getState().setUserData(updatedUser);
        return updatedUser;
    },
    getUserByID: (userID) => {
        return get().usersById[userID];
    },
    mergeUsers: (users: User[] | UserLite[]) => {
        const newUsersByID: Record<string, User | UserLite> =
            users.reduce((acc: Record<string, User | UserLite>, user: User | UserLite) => {
                acc[user.ID] = user;
                return acc;
            }, {});
        set((state) => {
            const nextUsersByID = { ...state.usersById, ...newUsersByID };
            return { usersById: nextUsersByID };
        });
    },


}))