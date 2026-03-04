import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/userStore";
import { useEffect } from "react";

export function useHydrateAuth() {
    const userStore = useUserStore();
    const hydrateAuth = useAuthStore((state) => state.hydrate);
    const currentUserId = useAuthStore((state) => state.userID);
    const userById = useUserStore((state) => state.usersById);

    useEffect(() => {
        hydrateAuth();
    }, [hydrateAuth]);

    return {
        isAuthenticated: !!currentUserId,
        currentUserId: currentUserId,
        currentUser: currentUserId ? userById[currentUserId] : null,
    }

}
