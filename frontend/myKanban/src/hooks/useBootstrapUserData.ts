import { useEffect } from "react";
import { useShareOffersStore } from "@/stores/shareOffersStore";
import { useUserNotificationStore } from "@/stores/userNotificationStore";

/**
 * Fetches user-scoped data that must be available immediately after login,
 * regardless of which route/component is currently mounted:
 * - incoming board invites  (userBoardInvitesIncomingIds)
 * - incoming workspace invites  (userWsIncomingOfferIds)
 * - user notifications  (sortedRenderIDs)
 *
 * Called once per session from AppLayout when userId becomes available.
 */
export function useBootstrapUserData(userId: string | null | undefined) {
    const fetchUserBoardInvitesIncoming = useShareOffersStore((state) => state.fetchUserBoardInvitesIncoming);
    const fetchUserWorkspaceIncomingInvites = useShareOffersStore((state) => state.fetchUserWorkspaceIncomingInvites);
    const fetchUserNotifications = useUserNotificationStore((state) => state.fetchUserNotifications);

    useEffect(() => {
        if (!userId) return;
        void fetchUserBoardInvitesIncoming();
        void fetchUserWorkspaceIncomingInvites();
        void fetchUserNotifications();
    }, [userId, fetchUserBoardInvitesIncoming, fetchUserWorkspaceIncomingInvites, fetchUserNotifications]);
}
