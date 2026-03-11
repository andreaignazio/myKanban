import type { ApiAuditLogEvent } from "@/stores/audittypes";
import { useFeedFromAudit } from "@/hooks/useFeedFromAudit";
import { ActivityFeedItem } from "./ActivityFeedItem";
import type { TextClasses } from "../menuElements/AuditBodyRenderer";

type AuditActivityItemProps = {
    audit: ApiAuditLogEvent;
    ActorAsLink?: boolean;
    hideLeadingActorChunk?: boolean;
    TextClasses?: TextClasses;
    isDebug?: boolean;
    showAvatar?: boolean;
}

export const AuditActivityItem = ({ audit, ActorAsLink = true, hideLeadingActorChunk = false, TextClasses, isDebug = false, showAvatar = true }: AuditActivityItemProps) => {
    const { feedFromAudit } = useFeedFromAudit();
    const feed = feedFromAudit(audit);

    return (
        <div>

            <ActivityFeedItem feed={feed} ActorAsLink={ActorAsLink} hideLeadingActorChunk={hideLeadingActorChunk} TextClasses={TextClasses} showAvatar={showAvatar} />
            {isDebug && <pre className="mt-2 text-xs text-gray-500">{JSON.stringify(audit.ID, null, 2)}</pre>}
        </div>
    )
}