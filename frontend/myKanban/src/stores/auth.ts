import { api } from "@/api/api";
import { create } from "zustand";

import type { SubscriptionPlan, User } from "./types";
import { useUserStore } from "./userStore";
type UserResponse = {
    User: User
    UserDerivedData: {
        Subscription: SubscriptionPlan

    }
}

type AuthStore = {
    userID: string | null
    user: User | null
    userSubscription: SubscriptionPlan | null
    setUserID: (user: string) => void
    setUserData: (user: User) => void
    hydrate: () => Promise<void>
    fetchUser: () => Promise<void>
    clearAuthSession: () => void
}


export const useAuthStore = create<AuthStore>((set, get) => ({
    userID: null,
    user: null,
    userSubscription: null,
    setUserID: (user) => set(() => ({ userID: user })),
    setUserData: (user) => set(() => ({ user })),
    clearAuthSession: () => {
        window.localStorage.removeItem("userID");
        window.localStorage.removeItem("token");
        delete api.defaults.headers.common["x-userID"];

        set(() => ({
            userID: null,
            user: null,
            userSubscription: null,
        }));
    },

    async hydrate() {
        const userToken = window.localStorage.getItem("userID")
        const userID = get().userID
        await get().fetchUser();
        if (!userID || userID != userToken) {
            set(() => ({
                userID: userToken
            }))
        }
    },
    async fetchUser() {
        try {
            const response = await api.get("/users/me");
            const data = response.data as UserResponse;
            console.log("Fetched user data:", data);
            useUserStore.getState().mergeUsers([data.User])
            set(() => ({
                user: data.User,
                userSubscription: data.UserDerivedData.Subscription
            }));
        } catch (error) {
            // console.error("Failed to fetch user:", error);
        }
    },

})
)