import { create } from "zustand";
import type { UserAuditNotification, UserNotificationResponse, MarkNotificationsRequest, UserEvent } from "./types";
import { api } from "@/api/api";
import type { RenderFeed } from "@/hooks/useFeedFromAudit";
import { buildFeedFromAudit } from "@/hooks/useFeedFromAudit";
import { useAuditEntityStore } from "./auditEntityStore";

export type EntityRef = {
    WorkspaceId: string | null | undefined;
    BoardID: string;
    ListID?: string;
    CardID?: string;
}

export type UserNotificationRender = {
    RenderID: string;
    MainEntityType: "card" | "list" | "board";
    MainEntityID: string;
    RelatedEntitiesRef: EntityRef;
    CreatedAt: string;
    Feeds: FeedsByActor[];
    NotificationRead?: boolean;
    NotificationIDs: string[];
}

export type FeedsByActor = {
    ActorID: string;

    Feeds: RenderFeed[];
}

type UserNotificationStore = {
    unreadCount: number;
    setUnreadCount: (count: number) => void;
    notificationsById: Record<string, UserAuditNotification>;
    notificationsIDs: string[];
    renderNotifications: UserNotificationRender[];

    fetchUserNotifications: () => Promise<void>;

    markNotificationAsRead: (notificationID: string) => Promise<void>;

    markBulkNoticationAsRead: (notificationIDs: string[]) => Promise<void>;
    markBulkNotificationAsUnread: (notificationIDs: string[]) => Promise<void>;

    markAllNotificationsAsRead: () => Promise<void>;
    generateRenderNotifications: () => void;
    renderFeedFromNotification: (notification: UserAuditNotification) => RenderFeed;
    applyEvent: (evt: any) => void;
    applyMarkReadEvent: (evt: UserEvent) => void;
    applyMarkUnreadEvent: (evt: UserEvent) => void;


}

export const useUserNotificationStore = create<UserNotificationStore>((set, get) => ({
    unreadCount: 0,
    setUnreadCount: (count: number) => set({ unreadCount: count }),
    notificationsById: {},
    notificationsIDs: [],
    renderNotifications: [],
    fetchUserNotifications: async () => {
        try {
            const response = await api.get("/users/notifications");
            const data = response.data as UserNotificationResponse;

            const notificationsById: Record<string, UserAuditNotification> = {};
            data.UserNotifications.forEach(notification => {
                notificationsById[notification.NotificationID] = notification;
            });
            set({
                notificationsById,
                notificationsIDs: notificationsById ? data.UserNotifications.map(n => n.NotificationID) : [],
                unreadCount: data.UnreadCount,
            });
            const { Boards, Lists, Cards } = data;

            useAuditEntityStore.getState().mergeAuditEntities({
                Boards: Boards as Array<Record<string, unknown> & { ID: string }>,
                Lists: Lists as Array<Record<string, unknown> & { ID: string }>,
                Cards: Cards as Array<Record<string, unknown> & { ID: string }>,
            })




        } catch (error) {
            // console.error("Failed to fetch user notifications:", error);
        }
    },
    markNotificationAsRead: async (notificationID: string) => { },

    markBulkNoticationAsRead: async (notificationIDs: string[]) => {
        try {
            const payload: MarkNotificationsRequest = { NotificationIDs: notificationIDs }
            await api.patch("/users/notifications/markread", payload)
        } catch (error) {
            // console.error("Failed to mark notifications as read:", error)
        }

    },
    markBulkNotificationAsUnread: async (notificationIDs: string[]) => {
        try {
            const payload: MarkNotificationsRequest = { NotificationIDs: notificationIDs }
            await api.patch("/users/notifications/markunread", payload)
        } catch (error) {
            // console.error("Failed to mark notifications as unread:", error)
        }
    },
    markAllNotificationsAsRead: async () => { },
    renderFeedFromNotification: (notification: UserAuditNotification): RenderFeed => {
        return buildFeedFromAudit(notification)

    },
    generateRenderNotifications: () => {
        return
        const { notificationsById, notificationsIDs } = get();
        // console.log("Generating render notifications from user notifications")
        //   console.log("User notifications by ID:", notificationsById)
        //  console.log("User notification IDs:", notificationsIDs)
        const renderNotifications: UserNotificationRender[] = [];
        notificationsIDs.forEach((id) => {
            const notification = notificationsById[id];
            if (renderNotifications.at(-1)?.MainEntityID === notification.MainEntityID
                && renderNotifications.at(-1)?.MainEntityType === notification.MainEntityType) {
                if (renderNotifications.at(-1)?.Feeds.at(-1)?.ActorID === notification.Payload.Actor.ID) {
                    renderNotifications.at(-1)?.Feeds.at(-1)?.Feeds.push(get().renderFeedFromNotification(notification))
                    renderNotifications.at(-1)?.NotificationIDs.push(notification.NotificationID)
                } else {
                    renderNotifications.at(-1)?.Feeds.push({
                        ActorID: notification.Payload.Actor.ID,
                        Feeds: [get().renderFeedFromNotification(notification)]
                    })
                    renderNotifications.at(-1)?.NotificationIDs.push(notification.NotificationID)
                    //renderNotifications.at(-1)!.Feeds.push(get().renderFeedFromNotification(notification))
                }
                //renderNotifications.at(-1)?.Feeds.push(get().renderFeedFromNotification(notification))
            }
            else {
                renderNotifications.push({
                    RenderID: notification.NotificationID,
                    MainEntityID: notification.MainEntityID,
                    MainEntityType: notification.MainEntityType as "card" | "list" | "board",
                    CreatedAt: notification.NotificationCreatedAt,
                    RelatedEntitiesRef: {
                        WorkspaceId: notification.WorkspaceID,
                        BoardID: notification?.BoardID ?? "",
                        ListID: notification.Payload.Links.list?.EntityID,
                        CardID: notification.Payload.Links.card?.EntityID,
                    },
                    Feeds: [{
                        ActorID: notification.Payload.Actor.ID,
                        Feeds: [get().renderFeedFromNotification(notification)]
                    }],
                    NotificationIDs: [notification.NotificationID],
                    NotificationRead: notification.Read,

                })
            }
        })

        set({ renderNotifications: renderNotifications })
    },
    applyEvent: (evt: any) => {
        // console.log("[userNotificationStore] applying event", evt)
        const event = evt as UserEvent
        switch (event.Type) {
            case "notification.created":
                const notification = event.Payload.UserNotificationCreatedPayload?.Notification
                const unreadCount = event.Payload.UserNotificationCreatedPayload?.UnreadCount ?? get().unreadCount + 1
                if (notification) {
                    const prevNotificationsById = get().notificationsById
                    const prevNotificationsIDs = get().notificationsIDs
                    const newNotificationsById = { ...prevNotificationsById, [notification.NotificationID]: notification }
                    const newNotificationsIDs = [notification.NotificationID, ...prevNotificationsIDs]
                    set({
                        notificationsById: newNotificationsById,
                        notificationsIDs: newNotificationsIDs,
                        unreadCount: unreadCount,
                    })
                    //get().generateRenderNotifications()
                }
                break;
            case "notification.markread":
                get().applyMarkReadEvent(event)
                break;

            case "notification.markunread":
                get().applyMarkUnreadEvent(event)
                break;

        }
    },
    applyMarkReadEvent: (evt: UserEvent) => {
        const IDs = evt.Payload.UserNotificationReadPayload?.NotificationIDs ?? []
        const unreadCount = evt.Payload.UserNotificationReadPayload?.UnreadCount ?? get().unreadCount
        const prevNotificationsById = get().notificationsById
        const prevNotificationsIDs = get().notificationsIDs
        const newNotificationsById = { ...prevNotificationsById }
        const newNotificationsIDs = [...prevNotificationsIDs]
        IDs.forEach(id => {
            newNotificationsById[id].Read = true
            // console.log("Marked notification as read in store for ID:", id)
        })
        set({
            notificationsById: newNotificationsById,
            notificationsIDs: newNotificationsIDs,
            unreadCount: unreadCount,
        })
        //get().generateRenderNotifications()
    },
    applyMarkUnreadEvent: (evt: UserEvent) => {
        const IDs = evt.Payload.UserNotificationReadPayload?.NotificationIDs ?? []
        const unreadCount = evt.Payload.UserNotificationReadPayload?.UnreadCount ?? get().unreadCount
        const prevNotificationsById = get().notificationsById
        const prevNotificationsIDs = get().notificationsIDs
        const newNotificationsById = { ...prevNotificationsById }
        const newNotificationsIDs = [...prevNotificationsIDs]
        IDs.forEach(id => {
            newNotificationsById[id].Read = false
            // console.log("Marked notification as unread in store for ID:", id)
        })
        set({
            notificationsById: newNotificationsById,
            notificationsIDs: newNotificationsIDs,
            unreadCount: unreadCount,
        })
        //get().generateRenderNotifications()
    }

}))
