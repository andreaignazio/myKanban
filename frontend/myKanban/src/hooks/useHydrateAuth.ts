import { useAuth } from "@clerk/react";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/userStore";
import { useEffect } from "react";

export function useHydrateAuth() {
    const hydrateAuth = useAuthStore((state) => state.hydrate);
    const currentUserId = useAuthStore((state) => state.userID);
    const userById = useUserStore((state) => state.usersById);
    const { isLoaded, isSignedIn } = useAuth()

    useEffect(() => {
        if (!isLoaded || !isSignedIn) {
            return
        }
        void hydrateAuth();
    }, [hydrateAuth, isLoaded, isSignedIn]);

    return {
        isAuthenticated: isLoaded && isSignedIn,
        currentUserId: currentUserId,
        currentUser: currentUserId ? userById[currentUserId] : null,
    }

}
