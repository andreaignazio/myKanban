import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { BaseBtn } from "@/pages/BoardView";
import { BellIcon, CheckIcon } from "@heroicons/react/24/outline";
import { forwardRef, useEffect, useRef, useState, type MutableRefObject } from "react";
import { ActionMenuWrapper } from "./ListActionsMenu";
import { useUserWatchStore } from "@/stores/userWatchStore";
import { useUserNotificationStore } from "@/stores/userNotificationStore";
import { useAuditStore } from "@/stores/auditStore";
import { useListsStore } from "@/stores/listsStore";
import { useCardsStore } from "@/stores/cardsStore";
import { useBoardsStore } from "@/stores/boardsStore";
import type { Board, Card, List } from "@/stores/types";
import { useShallow } from "zustand/react/shallow";
import { UserAvatar } from "../badges/UserAvatar";
import { UserNotificationTabPlaceholder } from "./UserNotificationTabPlaceholder";
import { FloatingTabSelector } from "../menuElements/floatingTabSelector";
import { Bell, XIcon } from "lucide-react";

type UserNotificationMenuBtnProps = {
    className?: string;
    overrideClassName?: string;
    style?: React.CSSProperties;
    menuId?: string;
}

export const UserNotificationMenuBtn = forwardRef<HTMLButtonElement, UserNotificationMenuBtnProps>(({ menuId, style, className, overrideClassName }, ref) => {
    const openOverlay = useOverlayStore((state) => state.open);
    const onMenuClose = useOverlayStore((state) => state.close);
    const unreadCount = useUserNotificationStore((state) => state.unreadCount)
    const generateRenderNotifications = useUserNotificationStore((state) => state.generateRenderNotifications)
    const notificationsIds = useUserNotificationStore(useShallow((state) => state.notificationsIDs))
    const fetchUserNotifications = useUserNotificationStore((state) => state.fetchUserNotifications)


    useEffect(() => {
        const fetchData = async () => {
            await fetchUserNotifications()
            generateRenderNotifications()
            // console.log("Fetched user notifications and generated render notifications")
            //console.log("Render notifications:", renderNotifications)
        }
        fetchData()
    }, [notificationsIds])



    const listActionsMenuRef = useRef<HTMLDivElement>(null)
    const anchorRef = useRef<HTMLButtonElement | null>(null);
    const setAnchorRefs = (node: HTMLButtonElement | null) => {
        anchorRef.current = node;
        if (typeof ref === "function") {
            ref(node);
            return;
        }
        if (ref) {
            (ref as MutableRefObject<HTMLButtonElement | null>).current = node;
        }
    };
    function handleOpenUserNotificationMenu() {
        // console.log("Opening respond modal for share offer");
        const id = menuId || "user-notification-menu";
        const descriptor: OverlayDescriptor = {
            id: id,
            render: () => <UserNotificationMenu onClose={() => onMenuClose(id)} ref={listActionsMenuRef} />,
            anchorRef: anchorRef,
            panelRef: listActionsMenuRef,
            type: "modal",
            renderType: "anchored",
            exclusiveGroup: "share-action-modal",
            opts: {
                closeOnMouseLeave: false,
                closeOnClickOutside: true,
                closeOnEscape: true,
                lockBackdrop: true,

            },
            position: {
                placement: "bottom",
                offset: [8, 22],
            },
            desiredBackdropOpacity: 0.0,
        }
        openOverlay(descriptor);

    }

    return (
        <BaseBtn
            style={style}
            overrideClassName={overrideClassName}
            onClick={handleOpenUserNotificationMenu} ref={setAnchorRefs} className={className}>
            <div className="relative">
                <Bell size={18}></Bell>
                {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </div>
                )}
            </div>
        </BaseBtn>
    )
});

type UserNotificationMenuProps = {
    onClose: () => void;
}
type NotificationTabs = "watched" | "notifications"
export const UserNotificationMenu = forwardRef<HTMLDivElement, UserNotificationMenuProps>(({ onClose }, ref) => {

    const [activeTab, setActiveTab] = useState<NotificationTabs>("watched")
    const Title = { notifications: "Notifications", watched: "Watched Items" }[activeTab]
    const tabs: { id: NotificationTabs; label: string }[] = [
        { id: "watched", label: "Watched Items" },
        { id: "notifications", label: "Notifications" },
    ]

    const [showOnlyUnread, setShowOnlyUnread] = useState(false)

    return (
        <>
            <ActionMenuWrapper
                hideX={true}
                style={{ padding: 0, }}
                ref={ref} Title={""} onClose={onClose} width={480}>

                <div className="relative flex justify-between items-center min-h-[60px] ">
                    <div className="font-grotesk tracking-wide font-bold text-lg px-4">{Title}</div>
                    <div className="flex px-5 items-center gap-3" >
                        <div className="text-sm font-helvetica -translate-y-0 text-gray-400">
                            Only show unread</div>
                        <Switcher isOn={showOnlyUnread} onToggle={() => setShowOnlyUnread(!showOnlyUnread)} />
                    </div>
                </div>
                <div className="border-t border-gray-600 my-2 mx-4" />

                {false && <div className="fixed bottom-6 rounded-md bg-transparent w-full flex justify-center ">
                    <FloatingTabSelector activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />

                </div>}


                <UserNotificationTabPlaceholder onlyShowUnread={showOnlyUnread} />

            </ActionMenuWrapper>

        </>

    )
})

type SwitcherProps = {
    isOn: boolean;
    onToggle: () => void;
}

const Switcher = ({ isOn, onToggle }: SwitcherProps) => {


    return (
        <div className={` flex flex-row items-center justify-between cursor-pointer
         ${isOn ? "bg-lime-500" : "bg-gray-300"} rounded-full w-10 h-[20px] ps-[2px] pr-[2px] relative`}
            onClick={onToggle}
        >
            <div className={`w-4 h-4 bg-black/90 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${isOn ? "translate-x-5" : "translate-x-0"}`}></div>
            <CheckIcon className={`w-3 h-3 absolute left-[6px] text-black/90
                 transition-opacity duration-200 ease-in-out 
                ${isOn ? "opacity-100" : "opacity-0"}`}
                strokeWidth={3} />
            <XIcon className={`w-[12px] h-[12px]  absolute right-[6px] text-black/90
                 transition-opacity duration-200 ease-in-out 
                ${isOn ? "opacity-0" : "opacity-100"}`}
                strokeWidth={3} />
        </div>
    )
}


export const UserNotificationsTab = () => {
    const fetchUserNotifications = useUserNotificationStore((state) => state.fetchUserNotifications)
    const notificationsIds = useUserNotificationStore(useShallow((state) => state.notificationsIDs))

    useEffect(() => {
        fetchUserNotifications()
    }, [notificationsIds])

    return (

        <>
            <div className="px-2 ">Notifications</div>
            <div className="flex flex-col gap-2 px-4 py-2">
                {notificationsIds.length > 0 && notificationsIds.map((id) => {
                    return (<>
                        <div className="pr-16">
                            <NotificationItem key={id} id={id} />
                        </div>
                    </>)
                })}
            </div>

        </>
    )
}

export const NotificationItem = ({ id }: { id: string }) => {
    const notification = useUserNotificationStore((state) => state.notificationsById[id])
    // console.log("Rendering notification item for ID:", id, "Notification:", notification)
    const card = notification?.MainEntityID && notification.MainEntityType === "card" ? useCardsStore((state) => state.cardsById[notification.MainEntityID]) : undefined
    const actor = notification?.Payload?.Actor
    const board = useBoardsStore((state) => state.boardsById[notification?.BoardID || ""])
    const listTitle = notification?.Payload?.Params?.listTitle as string | undefined
    const fallbackBackgroundUrl = "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1920&q=80"
    const boardBackground = board?.Props?.Background?.Image?.Url ?? fallbackBackgroundUrl
    const readableFromTS = useAuditStore((state) => state.readableDateFromTimestamp)
    const actionNameFromActionType = useAuditStore((state) => state.actionNameFromActionType)
    if (!notification) return null
    return (
        <div className=" theme-dark rounded-xl bg-menu h-[192px] overflow-hidden shadow-md shadow-black/40">
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
            <div className="relative z-0 p-3 pb-6 pt-6 grid grid-cols-[40px_1fr]  items-center gap-2">
                <UserAvatar user={actor} className="scale-110" />
                <div className="relative col-start-2 row-start-1 text-sm font-helvetica text-gray-300">

                    <p className="text-base font-grotesk font-bold">{actor?.Name}</p>

                    <div className="absolute left-0 top-full mt-0 flex flex-row items-baseline gap-2">
                        <p className="text-base"> {actionNameFromActionType(notification.ActionType)}</p> <p className="text-xs text-gray-500"> {readableFromTS(notification.NotificationCreatedAt)}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}



export const UserWatchedMenu = () => {
    const userWatchStore = useUserWatchStore()
    const listWatctIds = useUserWatchStore(useShallow((state) => state.listWatchIds))
    const cardWatchIds = useUserWatchStore(useShallow((state) => state.cardWatchIds))
    const boardWatchIds = useUserWatchStore(useShallow((state) => state.boardWatchIds))

    useEffect(() => {
        userWatchStore.fetchUserWatches()
    }, [listWatctIds, cardWatchIds, boardWatchIds])

    return (
        <>
            <div className="px-2">Watched Cards: {cardWatchIds.length}</div>
            {
                cardWatchIds.length > 0 && cardWatchIds.map((cardId) => {
                    return (<>
                        <WatchedItem key={cardId} id={cardId} type="card" />
                    </>)
                })
            }
            <div className="px-2">Watched Lists: {listWatctIds.length}</div>
            {
                listWatctIds.length > 0 && listWatctIds.map((listId) => {
                    return (<>
                        <WatchedItem key={listId} id={listId} type="list" />
                    </>)
                })
            }

            <div className="px-2">Watched Boards: {boardWatchIds.length}</div>

            {
                boardWatchIds.length > 0 && boardWatchIds.map((boardId) => {
                    return (<>
                        <WatchedItem key={boardId} id={boardId} type="board" />
                    </>)
                })
            }
        </>
    )

}

type WatchedItemProps = {
    id: string;
    type: "card" | "list" | "board";
}
export const WatchedItem = ({ id, type }: WatchedItemProps) => {

    let entity: Card | List | Board | undefined
    if (type === "card") {
        entity = useCardsStore.getState().cardsById[id]
    } else if (type === "list") {
        entity = useListsStore.getState().listsById[id]
    } else if (type === "board") {
        entity = useBoardsStore.getState().boardsById[id]
    }

    return (
        <div className="px-2 py-1 rounded hover:bg-gray-100 cursor-pointer">
            {(entity && type !== "board") ? (entity as Card | List).Title : (entity as Board)?.Name || "Unknown"}
        </div>
    )
}
