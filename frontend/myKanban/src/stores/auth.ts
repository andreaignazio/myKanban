import { api } from "@/api/api";
import { create } from "zustand";

import type { User } from "./types";
import { useUserStore } from "./userStore";
type UserResponse = {
    User: User
}

type AuthStore = {
    userID: string | null
    user: User | null
    setUserID: (userID: string | null) => void
    setUserData: (user: User | null) => void
    hydrate: () => Promise<void>
    fetchUser: () => Promise<User | null>
    clearAuthSession: () => void
}


export const useAuthStore = create<AuthStore>((set, get) => ({
    userID: null,
    user: null,
    setUserID: (user) => set(() => ({ userID: user })),
    setUserData: (user) => set(() => ({ user, userID: user?.ID ?? null })),
    clearAuthSession: () => {
        set(() => ({
            userID: null,
            user: null,
        }));
    },

    async hydrate() {
        await get().fetchUser();
    },
    async fetchUser() {
        try {
            const response = await api.get("/users/me");
            const data = response.data as UserResponse;
            console.log("Fetched user data:", data);
            useUserStore.getState().mergeUsers([data.User])
            set(() => ({
                userID: data.User.ID,
                user: data.User,
            }));
            return data.User;
        } catch (error) {
            set(() => ({
                userID: null,
                user: null,
            }));
            return null;
        }
    },

})
)