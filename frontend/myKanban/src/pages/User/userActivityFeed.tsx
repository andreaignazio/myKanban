import { useAuditStore } from "@/stores/auditStore";
import { useShallow } from "zustand/shallow";
import type { ApiAuditLogEvent } from "@/stores/audittypes";
import { ActivityFeedRenderer } from "./acitivityFeedRenderer";
import { useFetchFeedsForMe } from "@/hooks/useFetchFeedsForMe";


type UserActivityFeedProps = {
    filterFn: (audit: ApiAuditLogEvent) => boolean;
    currentUserID?: string | null;
}

export const UserActivityFeed = ({ filterFn, currentUserID }: UserActivityFeedProps) => {
    const { loadMore } = useFetchFeedsForMe();

    const auditIdsByUserId = useAuditStore(useShallow((state) => state.auditIdsByUserId));
    return (

        <>
            <ActivityFeedRenderer
                auditIds={auditIdsByUserId[currentUserID ?? ""] ?? []}
                auditLookUp={useAuditStore.getState().auditById}
                filterFn={filterFn}
                resetKey={currentUserID ?? "me"}
                onScrollEnd={() => {
                    void loadMore();
                }}
            />
        </>
    )




}