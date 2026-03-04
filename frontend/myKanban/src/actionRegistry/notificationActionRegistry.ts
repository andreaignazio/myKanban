import { useUserNotificationStore } from "@/stores/userNotificationStore";

export function useNotificationActionRegistry() {
    const userNotificationStore = useUserNotificationStore();
    function markNotificationAsRead(notificationIDs: string[]) {
        //  console.log("Marking notifications as read with IDs:", notificationIDs)
        return userNotificationStore.markBulkNoticationAsRead(notificationIDs);
    }

    function markNotificationAsUnread(notificationIDs: string[]) {
        return userNotificationStore.markBulkNotificationAsUnread(notificationIDs);
    }

    return {
        markNotificationAsRead,
        markNotificationAsUnread
    }
}