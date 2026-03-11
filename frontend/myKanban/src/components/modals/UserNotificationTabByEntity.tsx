import { useAuditStore } from "@/stores/auditStore"
import type { RenderFeed } from "@/hooks/useFeedFromAudit"
import { useBoardsStore } from "@/stores/boardsStore"
import { useCardsStore } from "@/stores/cardsStore"
import { useUserNotificationStore, type FeedsByActor, type UserNotificationRender } from "@/stores/userNotificationStore"
import { use, useEffect } from "react"
import { useShallow } from "zustand/shallow"
import { UserAvatar } from "../badges/UserAvatar"
import { useListsStore } from "@/stores/listsStore"
import { AuditBodyRenderer } from "../menuElements/AuditBodyRenderer"
import { useUserStore } from "@/stores/userStore"
import { CheckCircleIcon } from "@heroicons/react/24/solid"
import { CheckCircleIcon as CheckCircleIconOutline } from "@heroicons/react/24/outline"
import { useNotificationActionRegistry } from "@/actionRegistry/notificationActionRegistry"

export const UserNotificationsTabByEntity = () => {
    const unreadCount = useUserNotificationStore((state) => state.unreadCount)
    //const fetchUserNotifications = useUserNotificationStore((state) => state.fetchUserNotifications)
    const generateRenderNotifications = useUserNotificationStore((state) => state.generateRenderNotifications)
    const renderNotifications = useUserNotificationStore(useShallow((state) => state.renderNotifications))
    // const notificationsIds = useUserNotificationStore(useShallow((state) => state.notificationsIDs))




    useEffect(() => {
        //    console.log("Unread count changed:", unreadCount)
        generateRenderNotifications()
    }, [unreadCount])

    // console.log("Rendering UserNotificationsTabByEntity with renderNotifications:", renderNotifications)
    return (

        <>
            <div className="px-2 ">Notifications</div>
            <div className="flex flex-col gap-2 px-4 py-2 overflow-auto h-[400px]">
                {renderNotifications.length > 0 && renderNotifications.map((notification) => {
                    const id = notification.RenderID
                    return (<>
                        <div className="">
                            <NotificationItemByEntity key={id} id={id} notification={notification} />
                        </div>
                    </>)
                })}
            </div>

        </>
    )
}

type NotificationItemByEntityProps = {
    id: string;
    notification: UserNotificationRender;
}

export const NotificationItemByEntity = ({ id, notification }: NotificationItemByEntityProps) => {
    //const notification = useUserNotificationStore((state) => state.notificationsById[id])
    const notificationActions = useNotificationActionRegistry();
    // console.log("Rendering notification item for ID:", id, "Notification:", notification)
    const isRead = notification.NotificationRead ?? false
    const card = notification?.MainEntityID && notification.MainEntityType === "card" ? useCardsStore((state) => state.cardsById[notification.MainEntityID]) : undefined
    const board = notification?.RelatedEntitiesRef.BoardID ? useBoardsStore((state) => state.boardsById[notification.RelatedEntitiesRef.BoardID ?? ""]) : undefined
    const list = notification?.RelatedEntitiesRef.ListID ? useListsStore((state) => state.listsById[notification.RelatedEntitiesRef.ListID ?? ""]) : undefined

    //const actor = notification?.Payload?.Actor
    //const board = useBoardsStore((state) => state.boardsById[notification?.BoardID || ""])
    const listTitle = list?.Title || "list not found"
    const fallbackBackgroundUrl = "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1920&q=80"
    const boardBackground = board?.Props?.Background?.Image?.Url ?? fallbackBackgroundUrl
    const readableFromTS = useAuditStore((state) => state.readableDateFromTimestamp)
    //const actionNameFromActionType = useAuditStore((state) => state.actionNameFromActionType)
    if (!notification) return null

    function handleMarkRead() {
        notificationActions.markNotificationAsRead(notification.NotificationIDs)
    }
    function handleMarkUnread() {
        notificationActions.markNotificationAsUnread(notification.NotificationIDs)
    }


    return (
        <div className="flex flex-row">
            <div className=" theme-dark w-[80%] rounded-xl bg-menu  overflow-hidden shadow-md shadow-black/40">
                {boardBackground && (
                    <div className="relative flex flex-col w-full h-[96px]  overflow-hidden">
                        <img src={boardBackground}
                            alt="Board Background"
                            className=" absolute w-full h-32 object-cover" />
                        <div className="absolute inset-0 bg-black/20" />
                        <div className=" relative flex flex-col h-full z-30 p-2">
                            <div className=" theme-dark bg-menusec min-h-12 rounded-lg
                         w-full flex items-center justify-start shadow-md">
                                <p className="px-3.5 py-1 font-grotesk text-md font-normal">{card?.Title}</p>
                            </div>
                            <div className="relative text-sm h-full flex flex-row items-center justify-start">
                                <p className="flex z-30 font-semibold ">{board?.Name}</p><p>:{listTitle}</p>
                            </div>
                        </div>
                    </div>)

                }
                <div className="flex min-h-[400px] px-3 py-2 flex-col gap-2 ">
                    {notification.Feeds.map((feed, index) => (
                        <NotificationActionItem key={index} FeedsByActor={feed} />
                    ))}
                </div>

            </div>
            <div className="w-[20%] flex flex-col items-center justify-start gap-2 px-2">
                {isRead ? <CheckCircleIcon onClick={handleMarkUnread} className="w-6 h-6 text-green-500 cursor-pointer" />
                    : <CheckCircleIconOutline onClick={handleMarkRead}
                        className="w-6 h-6 text-green-500 cursor-pointer" />}
            </div>
        </div>
    )
}

type NotificationActionItemProps = {
    FeedsByActor: FeedsByActor;
}
export const NotificationActionItem = ({ FeedsByActor: FeedsByActor }: NotificationActionItemProps) => {
    const actor = useUserStore((state) => state.usersById[FeedsByActor.ActorID])
    const readableFromTS = useAuditStore((state) => state.readableDateFromTimestamp)
    const actionNameFromActionType = useAuditStore((state) => state.actionNameFromActionType)

    return (
        <div className="relative z-0 p-3 pb-6 pt-6 grid grid-cols-[40px_1fr]  items-center gap-2">
            <UserAvatar user={actor} className="scale-110" />
            <div className="relative col-start-2 row-start-1 text-sm font-helvetica text-gray-300">

                <p className="text-base font-grotesk font-bold">{actor?.Name}</p>

                <div className="absolute left-0 top-full overflow-hidden mt-0 flex flex-row items-baseline gap-2">
                    <div className="flex flex-col  items-center gap-1">
                        {FeedsByActor.Feeds.map((feed, index) => (
                            <div key={index} className="flex flex-row items-center gap-1">
                                <AuditBodyRenderer Body={feed.Body} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

    )
}