import { AuditActivityItem } from "@/components/activityfeed/AuditActivityItem";
import { useActivityRenderWindow } from "@/hooks/useActivityRenderWindow";
import type { ApiAuditLogEvent } from "@/stores/audittypes";


type UserActivityFeedProps = {
    auditIds: string[];
    auditLookUp: Record<string, ApiAuditLogEvent>;
    filterFn?: (audit: ApiAuditLogEvent) => boolean;
    onScrollEnd?: () => void;
    resetKey?: string;

}


export const ActivityFeedRenderer = ({ auditIds, auditLookUp, filterFn, onScrollEnd, resetKey }: UserActivityFeedProps) => {
    const { rootRef, displayedAuditIds } = useActivityRenderWindow(auditIds, {
        maxRendered: 50,
        shiftSize: 15,
        topThreshold: 0.15,
        bottomThreshold: 0.85,
        onScrollEnd,
        resetKey,
    });


    return (
        <div ref={rootRef} className="flex flex-col min-h-0 gap-4">
            {displayedAuditIds.map((auditId) => {
                const audit = auditLookUp[auditId];
                if (!audit) {
                    return null;
                }
                const isVisibleId = !filterFn || filterFn(audit);
                return (
                    <div key={auditId}>
                        <div className={`${isVisibleId ? "" : "h-0 opacity-0"} transition-all duration-300 overflow-hidden`}>
                            <AuditActivityItem
                                audit={audit} ActorAsLink={false} />
                        </div>
                    </div>
                )
            }
            )}
        </div>

    )
}