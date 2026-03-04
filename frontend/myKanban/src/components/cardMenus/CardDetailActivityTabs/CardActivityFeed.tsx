import { useAuditStore } from "@/stores/auditStore";
import { useShallow } from "zustand/shallow";
import type { ApiAuditLogEvent } from "@/stores/audittypes";
import { ActivityFeedRenderer } from "@/pages/User/acitivityFeedRenderer";


type UserActivityFeedProps = {
    filterFn: (audit: ApiAuditLogEvent) => boolean;
    cardID?: string | null;
    workspaceId?: string;
}

export const CardActivityFeed = ({ filterFn, cardID, workspaceId }: UserActivityFeedProps) => {
    // const auditIdsByUserId = useAuditStore(useShallow((state) => state.auditIdsByUserId));
    const auditByCardId = useAuditStore(useShallow((state) => state.auditIdsByCardId));
    return (

        <>
            <ActivityFeedRenderer
                auditIds={auditByCardId[cardID ?? ""] ?? []}
                auditLookUp={useAuditStore.getState().auditById}
                filterFn={filterFn}
                resetKey={cardID ?? ""}
            />
            {(auditByCardId[cardID ?? ""] ?? []).length === 0 && <span className="mt-4 text-[14px] text-[rgba(255,255,255,0.5)]">
                No activity yet
            </span>}
        </>
    )




}