import type { AuditActor } from "@/stores/usertypes";
import { UserAvatar } from "../badges/UserAvatar";
import { AuditBodyRenderer, type TextClasses } from "../menuElements/AuditBodyRenderer";
import type { RenderFeed, RenderFeedExtended } from "@/hooks/useFeedFromAudit";
import { useDateTimeParser } from "@/hooks/useDateTimeParser";


type ActivityFeedItemProps = {
    feed: RenderFeed | RenderFeedExtended | null;
    ActorAsLink?: boolean;
    hideLeadingActorChunk?: boolean;
    TextClasses?: TextClasses;
    showAvatar?: boolean;

}

export const ActivityFeedItem = ({ feed, ActorAsLink = true, hideLeadingActorChunk = false, TextClasses, showAvatar = true }: ActivityFeedItemProps) => {

    if (!feed) return null;

    const { Actor, Body, CreatedAt } = feed;
    const readableCreatedAt = useDateTimeParser().stringifyDateTimePretty(CreatedAt);

    if (showAvatar) {
        return (
            <>
                <div className="w-full grid grid-cols-[32px_1fr] items-start gap-4">
                    <UserAvatar user={Actor as AuditActor} size={32} />
                    <div className="flex flex-col ">
                        <AuditBodyRenderer Body={Body} ActorAsLink={ActorAsLink} hideLeadingActorChunk={hideLeadingActorChunk} TextClasses={TextClasses} />
                        <div className="text-gray-500 text-xs">{readableCreatedAt || CreatedAt}</div>

                    </div>

                </div>
            </>
        )
    }
    return (
        <div className="flex flex-col ">
            <AuditBodyRenderer Body={Body} ActorAsLink={ActorAsLink} hideLeadingActorChunk={hideLeadingActorChunk} TextClasses={TextClasses} />
            <div className="text-gray-500 text-xs">{readableCreatedAt || CreatedAt}</div>

        </div>
    )

}
