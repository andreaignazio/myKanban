import { useNotificationBackground } from "@/hooks/useNotificationBackground";
import { useUserNotificationStore, type RenderID } from "@/stores/userNotificationStore";
import { useShallow } from "zustand/shallow";
import { ImageColorRenderer } from "../menuElements/ImageColorRenderer";

import { useLookUpInterface } from "@/hooks/useLookUpInterface"
import type { MainEntityTypeStrict } from "@/hooks/useFeedFromAudit";
import { act, useEffect } from "react";

export const UserNotificationTabPlaceholder = () => {
    const fetchUserNotifications = useUserNotificationStore((state) => state.fetchUserNotifications)

    const handleFetchNotifications = async () => {
        try {
            await fetchUserNotifications();
        } catch (error) {
            console.error("Error fetching user notifications:", error);
        }
    };

    useEffect(() => {
        console.log("Fetching user notifications...");
        handleFetchNotifications();
    }, [fetchUserNotifications])
    const RenderIds = useUserNotificationStore(useShallow((state) => state.sortedRenderIDs));
    const visibleIds = RenderIds.slice(0, 20)







    return (
        <div className="h-[600px] flex flex-col overflow-hidden ">
            {
                visibleIds.length === 0 ? (
                    <div className=" min-h-[500px] max-h-[650px] flex flex-col items-center justify-center h-full">
                        <h2 className="text-2xl font-bold mb-4">No Notifications</h2>
                        <p className="text-gray-600">You have no notifications at the moment.</p>
                    </div>
                ) : (
                    <div className="min-h-0 flex-1 overflow-y-auto w-full flex flex-col  pr-1 ps-8 py-2 gap-4">
                        {visibleIds.map((renderId) => (
                            <>

                                <NotificationEntityRenderer key={renderId} renderId={renderId} />
                            </>
                        ))}
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
    const { map: notificationByActorMap, ids: notificationByActorIds } = groupNotificationsByActor(notification?.NotificationIds ?? [])

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
            let boardName: String = ""
            let listName: String = ""
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

    return (
        <div className="grid grid-cols-[1fr_60px]">
            <div style={{ borderRadius: radius }}
                className="flex flex-col gap-0 overflow-hidden">
                <ImageColorRenderer
                    overrideClassName
                    className="w-full h-[90px]  overflow-hidden relative"

                    backgroundType="color" bgColor={color}
                >
                    <div style={{ padding: padding }}
                        className="absolute inset-0 flex flex-col items-center justify-start ">

                        <div style={{ borderRadius: radius - padding / 2 }}
                            className="bg-menusec w-full  ps-2 h-12 flex flex-row items-center ">
                            <span className="text-sm font-semibold text-left text-neutral-300 line-clamp-1">
                                {entityTitle}</span>
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
                <div className="flex flex-col bg-black gap-0">
                    <span>ciao</span>
                    {notificationByActorIds.map((actorTimeKey) => {
                        return (
                            <span>
                                {actorTimeKey}
                            </span>
                        )
                    })}

                </div>

            </div>

        </div>
    )

}


