import type { ApiAuditLogEvent, AuditActor } from "@/stores/audittypes";
import { useFeedFromAudit } from "@/hooks/useFeedFromAudit";
import { ActivityFeedItem } from "./ActivityFeedItem";
import { UserAvatar } from "../badges/UserAvatar";
import type { TextClasses } from "../menuElements/AuditBodyRenderer";

type AuditActivityItemProps = {
    audit: ApiAuditLogEvent;
    ActorAsLink?: boolean;
    TextClasses?: TextClasses;
    isDebug?: boolean;
}

export const AuditActivityItem = ({ audit, ActorAsLink = true, TextClasses, isDebug = false }: AuditActivityItemProps) => {
    const { feedFromAudit } = useFeedFromAudit();
    const feed = feedFromAudit(audit);

    return (
        <div>

            <ActivityFeedItem feed={feed} ActorAsLink={ActorAsLink} TextClasses={TextClasses} />
            {isDebug && <pre className="mt-2 text-xs text-gray-500">{JSON.stringify(audit.ID, null, 2)}</pre>}
        </div>
    )
}