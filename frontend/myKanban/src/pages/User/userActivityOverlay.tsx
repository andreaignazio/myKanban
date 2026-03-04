import { CommonMenuWrapper } from "@/components/menuElements/menuWrapper"
import { useFetchFeedsForUser } from "@/hooks/useFetchFeedsForUser";
import { forwardRef } from "react";
import { ActivityFeedRenderer } from "./acitivityFeedRenderer";
import { useAuditStore } from "@/stores/auditStore";
import { useShallow } from "zustand/shallow";

type UserActivityOverlayProps = {
    onClose?: () => void;
    userId?: string;
    workspaceId?: string;
}


export const UserActivityOverlay = forwardRef<HTMLDivElement, UserActivityOverlayProps>((props, ref) => {

    return (
        <CommonMenuWrapper ref={ref}
            Title="Activity">
            <div className="p-4 w-[400px] h-[80vh] overflow-hidden flex flex-col">
                User Activity Overlay
                <UserFeed userId={props.userId ?? ""} workspaceId={props.workspaceId} />
            </div>
        </CommonMenuWrapper>
    )

})

type UserFeedProps = {
    userId: string
    workspaceId?: string;
}

const UserFeed = ({ userId, workspaceId }: UserFeedProps) => {

    const { loadMore } = useFetchFeedsForUser(userId, workspaceId)
    const auditIds = useAuditStore(useShallow((state) => state.auditIdsByUserId[userId] ?? []));
    const auditLookUp = useAuditStore((state) => state.auditById);

    return (
        <div className="flex flex-col min-h-0 overflow-y-auto scrollbar-hidden">
            <div className="flex flex-col h-fit gap-2">


                <ActivityFeedRenderer
                    auditIds={auditIds}
                    auditLookUp={auditLookUp}
                    resetKey={userId}
                    onScrollEnd={() => {
                        void loadMore();
                    }}
                />
            </div>
        </div>
    )
}