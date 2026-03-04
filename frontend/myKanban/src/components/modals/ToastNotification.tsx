import { ActivityFeedItem } from "@/components/activityfeed/ActivityFeedItem";
import type { RenderFeed } from "@/hooks/useFeedFromAudit"


type ToastNotificationProps = {
    feed: RenderFeed | null
}
export const ToastNotification = ({ feed }: ToastNotificationProps) => {





    return (
        <div className="theme-dark w-[400px] min-h-[20px] bg-menu text-white px-4 py-4 rounded-2xl shadow-lg transition-all duration-300 ease-in-out">
            <ActivityFeedItem feed={feed} />
        </div>
    )
}