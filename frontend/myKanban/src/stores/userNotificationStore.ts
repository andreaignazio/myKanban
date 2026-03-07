import { create } from "zustand";
import type { UserAuditNotification, UserNotificationResponse, MarkNotificationsRequest, UserEvent } from "./types";
import { api } from "@/api/api";
import type { MainEntityTypeStrict, RenderFeed } from "@/hooks/useFeedFromAudit";
import { buildFeedFromAudit } from "@/hooks/useFeedFromAudit";
import { useAuditEntityStore } from "./auditEntityStore";
import { act, use } from "react";
import { useBoardsStore } from "./boardsStore";
import { useListsStore } from "./listsStore";
import { useCardsStore } from "./cardsStore";
import { useWorkspaceStore } from "./workspaceStore";

export type EntityRef = {
    WorkspaceId: string | null | undefined;
    BoardID?: string;
    ListID?: string;
    CardID?: string;
}

export type UserNotificationRender = {
    RenderID: string;
    MainEntityType: "card" | "list" | "board";
    MainEntityID: string;
    RelatedEntitiesRef: EntityRef;
    Feeds: FeedsByActor[];
    NotificationRead?: boolean;
    NotificationIDs: string[];
}

export type FeedsByActor = {
    ActorID: string;

    Feeds: RenderFeed[];
}

export type NotificationByEntity = {
    RenderID: RenderID; //KEY: ${MainEntityID}:${Read}
    MainEntityType: MainEntityTypeStrict;
    MainEntityID: string;
    EntityRef: EntityRef;
    NotificationIds: string[]; //List of notification IDs that relate to this entity and read status sorted by created date desc
}

export type NotificationsByActorAndTime = Record<ActorTimeKey, string[]> //KEY: ${ActorID}:${LastActivityTime} , Value: List of notification IDs sorted by created date desc

export type ActorUserID = string
export type ActorTimeKey = `${ActorUserID}:${string}`

function groupNotificationsByActor(ids: string[], notificationsById: Record<string, UserAuditNotification>): { ids: ActorTimeKey[], map: NotificationsByActorAndTime } {
    const map: NotificationsByActorAndTime = {}
    const actorTimeKeys: ActorTimeKey[] = []
    let prevActorID = ""
    let key: ActorTimeKey = "" as ActorTimeKey
    ids.forEach(id => {
        const notification = notificationsById[id]
        const actorID = notification.ActorUserID

        if (actorID !== prevActorID) {
            prevActorID = actorID
            const lastActivityTime = notification.CreatedAt
            key = `${actorID}:${lastActivityTime}` as ActorTimeKey
            actorTimeKeys.push(key)
        }
        if (!map[key]) {
            map[key] = []
        }
        map[key].push(id)

    })
    return { ids: actorTimeKeys, map }
}

function sortNotificationByEntityAndReadStatusByCreatedDate(renderIDs: RenderID[], notificationsById: Record<string, UserAuditNotification>, map: Record<RenderID, NotificationByEntity>): RenderID[] {
    const dateFromRenderID = (renderID: RenderID): Date => {
        const lastNotificationID = map[renderID].NotificationIds[0]
        return new Date(notificationsById[lastNotificationID].CreatedAt)
    }
    return renderIDs.sort((a, b) => dateFromRenderID(b).getTime() - dateFromRenderID(a).getTime())
}


function groupNotificationsByEntityAndReadStatus(ids: string[], notificationsById: Record<string, UserAuditNotification>): { ids: RenderID[], map: Record<RenderID, NotificationByEntity> } {
    const map: Record<RenderID, NotificationByEntity> = {}
    const renderIds: RenderID[] = [] //List of render IDs in the order they should be rendered, sorted by created date desc of the most recent notification for that entity and read status
    ids.forEach(id => {
        const notification = notificationsById[id]
        const mainEntityType = notification.MainEntityType
        const mainEntityID = notification.MainEntityID
        const readStatus = notification.Read ? "read" : "unread"
        const key = `${mainEntityID}:${readStatus}` as RenderID
        const entityRef: EntityRef = {
            WorkspaceId: notification.WorkspaceID,
            BoardID: notification.BoardID ? notification.BoardID : undefined,
            ListID: notification.Payload.Links?.["list"] ? notification.Payload.Links["list"].EntityID : undefined,
            CardID: notification.Payload.Links?.["card"] ? notification.Payload.Links["card"].EntityID : undefined,
        }
        if (!map[key]) {
            map[key] = {
                RenderID: key,
                MainEntityType: mainEntityType as MainEntityTypeStrict,
                MainEntityID: mainEntityID,
                EntityRef: entityRef,
                NotificationIds: []

            }
            renderIds.push(key)
        }
        map[key].NotificationIds.push(id)

    })
    return { ids: renderIds, map }
}

export type RenderID = `${string}:${"read" | "unread"}`



type UserNotificationStore = {

    sortedRenderIDs: RenderID[]; //List of render IDs in the order they should be rendered, sorted by created date desc of the most recent notification for that entity and read status
    notificationsByEntityAndReadStatus: Record<RenderID, NotificationByEntity>;

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

    groupNotificationsByActor: (ids: string[]) => { ids: ActorTimeKey[], map: NotificationsByActorAndTime }
    generateRenderIdsAndGroupByEntityAndReadStatus: () => void;
    applyLocalPatch: (notificationIDs: string[], read: boolean, unreadCount?: number) => void;


}

export const useUserNotificationStore = create<UserNotificationStore>((set, get) => ({
    sortedRenderIDs: [],
    notificationsByEntityAndReadStatus: {},

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
            get().generateRenderIdsAndGroupByEntityAndReadStatus();
            console.log("Fetched user notifications:", data.UserNotifications);
            const { Workspaces, Boards, Lists, Cards } = data;

            useAuditEntityStore.getState().mergeAuditEntities({
                Workspaces: Workspaces as Array<Record<string, unknown> & { ID: string }>,
                Boards: Boards as Array<Record<string, unknown> & { ID: string }>,
                Lists: Lists as Array<Record<string, unknown> & { ID: string }>,
                Cards: Cards as Array<Record<string, unknown> & { ID: string }>,
            })
            useWorkspaceStore.getState().mergeWorkspaces(Workspaces)
            useBoardsStore.getState().mergeBoards(Boards)
            useListsStore.getState().mergeLists(Lists)
            useCardsStore.getState().mergeCards(Cards)




        } catch (error) {
            console.error("Failed to fetch user notifications:", error);
        }
    },
    generateRenderIdsAndGroupByEntityAndReadStatus: () => {
        const notificationsById = get().notificationsById
        const notificationsIDs = get().notificationsIDs
        const { ids, map } = groupNotificationsByEntityAndReadStatus(notificationsIDs, notificationsById)
        const sortedIDs = sortNotificationByEntityAndReadStatusByCreatedDate(ids, notificationsById, map)
        set({
            sortedRenderIDs: sortedIDs,
            notificationsByEntityAndReadStatus: map,
        })
    },




    markNotificationAsRead: async (notificationID: string) => { },

    markBulkNoticationAsRead: async (notificationIDs: string[]) => {
        try {
            const payload: MarkNotificationsRequest = { NotificationIDs: notificationIDs }
            await api.patch("/users/notifications/markread", payload)
            get().applyLocalPatch(notificationIDs, true)

        } catch (error) {
            // console.error("Failed to mark notifications as read:", error)
        }

    },
    markBulkNotificationAsUnread: async (notificationIDs: string[]) => {
        try {
            const payload: MarkNotificationsRequest = { NotificationIDs: notificationIDs }
            await api.patch("/users/notifications/markunread", payload)
            get().applyLocalPatch(notificationIDs, false)

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

        get().applyLocalPatch(IDs, true, unreadCount)
    },
    applyMarkUnreadEvent: (evt: UserEvent) => {
        const IDs = evt.Payload.UserNotificationReadPayload?.NotificationIDs ?? []
        const unreadCount = evt.Payload.UserNotificationReadPayload?.UnreadCount ?? get().unreadCount

        get().applyLocalPatch(IDs, false, unreadCount)
    },
    groupNotificationsByActor: (ids: string[]) => {
        const notificationsById = get().notificationsById;
        return groupNotificationsByActor(ids, notificationsById)
    },

    applyLocalPatch(notificationIDs: string[], read: boolean, unreadCount?: number) {
        const prevNotificationsById = get().notificationsById
        const prevNotificationsIDs = get().notificationsIDs
        const newNotificationsById = { ...prevNotificationsById }
        const newNotificationsIDs = [...prevNotificationsIDs]
        notificationIDs.forEach(id => {
            if (newNotificationsById[id]) {
                newNotificationsById[id].Read = read
            }
        })
        set({
            notificationsById: newNotificationsById,
            notificationsIDs: newNotificationsIDs,
            unreadCount: unreadCount !== undefined ? unreadCount : get().unreadCount + (read ? -notificationIDs.length : notificationIDs.length),
        })
        get().generateRenderIdsAndGroupByEntityAndReadStatus();
    }



}))
