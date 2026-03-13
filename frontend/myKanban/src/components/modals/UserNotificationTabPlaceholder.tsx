import { useNotificationBackground } from "@/hooks/useNotificationBackground";
import { useUserNotificationStore, type ActorTimeKey, type NotificationsByActorAndTime, type RenderID } from "@/stores/userNotificationStore";
import { useShallow } from "zustand/shallow";
import { ImageColorRenderer } from "../menuElements/ImageColorRenderer";

import { useLookUpInterface } from "@/hooks/useLookUpInterface"
import type { MainEntityTypeStrict } from "@/hooks/useFeedFromAudit";
import { useState } from "react";
import { useUserStore } from "@/stores/userStore";
import { UserAvatar } from "../badges/UserAvatar";
import { AuditActivityItem } from "../activityfeed/AuditActivityItem";
import { CatalogIcon } from "@/icons/iconCatalog";
import { AnimatePresence, motion } from "framer-motion";


type UserNotificationTabPlaceholderProps = {
    onlyShowUnread?: boolean
}

export const UserNotificationTabPlaceholder = ({ onlyShowUnread }: UserNotificationTabPlaceholderProps) => {
    const RenderIds = useUserNotificationStore(useShallow((state) => state.sortedRenderIDs));
    const filteredRenderIds = onlyShowUnread ? RenderIds.filter((renderId) => renderId.split(":")[1] === "unread") : RenderIds;
    const visibleIds = filteredRenderIds.slice(0, 10)







    return (
        <div className="h-[600px] flex flex-col overflow-hidden ">
            {
                visibleIds.length === 0 ? (
                    <div className=" min-h-[500px] max-h-[650px] flex flex-col items-center justify-center h-full">
                        <h2 className="text-2xl font-bold mb-4">No Notifications</h2>
                        <p className="text-gray-600">You have no notifications at the moment.</p>
                    </div>
                ) : (
                    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hidden w-full flex flex-col
                      pr-1  py-0 gap-0">
                        <AnimatePresence initial={false} mode="popLayout">
                            {visibleIds.map((renderId) => (
                                <motion.div
                                    key={renderId}
                                    layout
                                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className="origin-top"
                                >
                                    <NotificationEntityRenderer renderId={renderId} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )
            }
        </div>
    );
};



type NotificationEntityRendererProps = {
    renderId: RenderID
}

const radius = 16
const padding = 8
const NotificationEntityRenderer = ({ renderId }: NotificationEntityRendererProps) => {
    const { map } = useUserNotificationStore(useShallow((state) => ({ map: state.notificationsByEntityAndReadStatus })));
    const notification = map[renderId];
    const notificationID = notification?.NotificationIds?.[0];
    const { backgroundType, color, imageUrl } = useNotificationBackground({ notificationID });
    const { getLookupForType } = useLookUpInterface()
    const lookup = getLookupForType(notification?.MainEntityType);
    const entityTitle = notification?.MainEntityID ? lookup.getTitle(notification.MainEntityID) : null
    const groupNotificationsByActor = useUserNotificationStore((state) => state.groupNotificationsByActor);


    const [limit, setLimit] = useState(8)
    const renderedIds = notification?.NotificationIds?.slice(0, limit) ?? []
    const { map: notificationByActorMap, ids: notificationByActorIds } = groupNotificationsByActor(renderedIds ?? [])

    const isRead = renderId.split(":")[1] === "read"

    const markBulkAsRead = useUserNotificationStore((state) => state.markBulkNoticationAsRead)
    const markBulkAsUnread = useUserNotificationStore((state) => state.markBulkNotificationAsUnread)

    const toggleReadStatus = () => {
        if (!notification?.NotificationIds) return;
        if (isRead) {
            markBulkAsUnread(notification.NotificationIds)
        } else {
            markBulkAsRead(notification.NotificationIds)
        }
    }


    const label = (entityType: MainEntityTypeStrict, entityID: string): { bold: string | null, normal: string | null } => {
        if (!entityID) return { bold: null, normal: null };
        if (entityType === "workspace") {
            return { bold: null, normal: null };
        }
        if (entityType === "board") {
            const workspace = lookup.getWorkspace?.(entityID)
            return workspace?.Name ? { bold: workspace.Name, normal: null } : { bold: null, normal: null };
        }
        if (entityType === "list") {
            const boardId = notification?.EntityRef?.BoardID
            if (!boardId) return { bold: null, normal: null };
            const boardLookup = getLookupForType("board")
            const boardName = boardLookup.getTitle(boardId)
            return boardName ? { bold: boardName, normal: null } : { bold: null, normal: null };
        }
        if (entityType === "card") {
            const boardId = notification?.EntityRef?.BoardID
            let boardName = ""
            let listName = ""
            if (!boardId) return { bold: null, normal: null }
            const boardLookup = getLookupForType("board")
            boardName = boardLookup.getTitle(boardId)
            const listId = notification?.EntityRef?.ListID
            if (listId) {
                const listLookup = getLookupForType("list")
                listName = listLookup.getTitle(listId)
            }
            if (boardName && listName) {
                return { bold: boardName + ":", normal: `${listName}` }
            }
            if (boardName) {
                return { bold: boardName, normal: null }
            }
            return { bold: null, normal: null }
        }
        return { bold: null, normal: null }
    }

    const entityLabel = notification?.MainEntityType && notification?.MainEntityID ? label(notification.MainEntityType, notification.MainEntityID) : null

    const moreToShow = (notification?.NotificationIds?.length ?? 0) > limit

    const handleShowMore = () => {
        if (moreToShow) {
            setLimit((prev) => prev + 8)
        }
        console.log("Show more clicked. New limit:", limit + 8);
    }
    const entityType = notification?.MainEntityType
    const iconId = entityType === "board" ? "boards" : entityType === "card" ? "cards" : entityType === "list" ? "lists" : entityType === "workspace" ? "workspaces" : "default"

    return (
        <div className={`grid grid-cols-[1fr_70px] ${!isRead ? "bg-blue-600/10" : ""} pb-4 pt-4 ps-6`}>

            <div style={{ borderRadius: radius }}
                className="flex flex-col gap-0 overflow-hidden bg-menusec
                shadow-lg shadow-black/30
                ">
                <ImageColorRenderer
                    overrideClassName
                    className="w-full h-[90px]  overflow-hidden relative"
                    backgroundType={backgroundType}
                    bgColor={color}
                    bgImage={imageUrl}
                >
                    <div style={{ padding: padding }}
                        className="absolute inset-0 flex flex-col items-center justify-start ">

                        <div style={{ borderRadius: radius - padding / 2 }}
                            className="bg-menusec w-full
                                shadow-md shadow-black/30
                              ps-3 h-12  gap-2 flex flex-row items-center ">
                            <CatalogIcon id={iconId} className="w-6 h-6 text-gray-300" />
                            <span className="text-sm font-semibold text-left text-neutral-300 line-clamp-1">
                                {entityTitle}
                            </span>
                        </div>
                        <div className="flex flex-row text-[12px] items-center gap-0.5 mt-2 w-full">
                            <span className=" font-bold text-gray-300 line-clamp-1">
                                {entityLabel?.bold}
                            </span>
                            <span className=" text-gray-300/80 line-clamp-1">
                                {entityLabel?.normal ? entityLabel.normal : null}
                            </span>
                        </div>
                    </div>

                </ImageColorRenderer>
                <div className="flex flex-col  gap-3 pt-4 pb-4 ps-2 pe-4">

                    {notificationByActorIds.map((actorTimeKey) => {
                        return (
                            <span key={actorTimeKey}>
                                <ActorNotificationRenderer id={actorTimeKey} map={notificationByActorMap} />
                            </span>
                        )
                    })}

                </div>
                <div className="border-t border-gray-700/50 mt-2 pt-2 pb-2 flex items-center justify-center">
                    <span className="text-xs text-gray-500 italic">
                        Showing {renderedIds.length} of {notification?.NotificationIds?.length ?? 0} notifications
                    </span>
                    {moreToShow && <button
                        onClickCapture={() => handleShowMore()}
                        className="text-xs text-neutral-300 font-semibold ms-4 px-2 py-1 rounded hover:bg-gray-700/50 transition-colors">
                        Show More
                    </button>}
                </div>
            </div>
            <div className="flex flex-col justify-start items-center pt-4">
                <div
                    onClick={() => toggleReadStatus()}
                    className={`rounded-full hover:scale-110 transition-transform cursor-pointer
                ${isRead
                            ? "bg-transparent border-2 border-gray-500/80"
                            : "bg-blue-600"} 
                w-4 h-4 shadow-md shadow-black/30`}></div>
            </div>

        </div>
    )

}

type ActorNotificationRendererProps = {
    id: ActorTimeKey;
    map: NotificationsByActorAndTime;
}

const ActorNotificationRenderer = ({ id, map }: ActorNotificationRendererProps) => {
    const notificationsForActor = map[id]
    const notificationsById = useUserNotificationStore((state) => state.notificationsById)

    const actorID = id.split(":")[0]
    const user = useUserStore(useShallow((state) => state.usersById[actorID]))

    return (
        <div className="grid grid-cols-[32px_1fr] items-center gap-3">
            <UserAvatar user={user}
                className="shadow-sm shadow-black/80"
            />
            <span className="text-sm font-semibold ">{user?.Name || "Unknown User"}</span>
            <div className="flex flex-col col-start-2 gap-3 -mt-2">

                {notificationsForActor.map((notificationId) => {
                    const notification = notificationsById[notificationId]
                    return (
                        <AuditActivityItem audit={notification} showAvatar={false} hideLeadingActorChunk />
                    )
                })}
            </div>


        </div>
    )
}


