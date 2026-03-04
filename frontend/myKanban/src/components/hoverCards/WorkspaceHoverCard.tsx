import { useCacheStore } from "@/stores/cacheStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { forwardRef, useEffect, useState } from "react";
import type { WorkspaceMembers } from "@/stores/workspaceStore";
import { useWorkspaceDerivedProps } from "@/hooks/useWorkspaceDerivedProps";
import { useDateTimeParser } from "@/hooks/useDateTimeParser";
import { EntityHoverCard } from "./EntityHoverCard";
import { MembersList } from "../common/MemberList";

type WorkspaceHoverCardProps = {
    workspaceID: string;
    onClose?: () => void;
}

export const WorkspaceHoverCard = forwardRef<HTMLDivElement, WorkspaceHoverCardProps>(({ workspaceID, onClose }, ref) => {
    const cachedWorkspace = useCacheStore((state) => state.offerWorkspaceById[workspaceID]);
    const cachedSubscription = useCacheStore((state) => state.offerSubscriptionByWorkspaceId[workspaceID]);
    const getCachedMembers = useCacheStore((state) => state.getOfferWorkspaceMembers);
    const getWorkspaceMembers = useWorkspaceStore((state) => state.getMembersByWorkspaceId);

    const workspaceById = useWorkspaceStore((state) => state.workspacesById);
    const subscriptionsByWorkspaceId = useWorkspaceStore((state) => state.wSubscriptionsById);

    const workspace = cachedWorkspace ?? workspaceById[workspaceID];
    const subscription = cachedSubscription?.Plan ?? subscriptionsByWorkspaceId[workspaceID]?.Plan ?? "free";

    const [members, setMembers] = useState<WorkspaceMembers[]>([])

    useEffect(() => {
        const cachedMembers = getCachedMembers(workspaceID);
        setMembers(cachedMembers.length > 0 ? cachedMembers : getWorkspaceMembers(workspaceID));
    }, [getCachedMembers, getWorkspaceMembers, workspaceID]);

    const { avatarProps, headerProps } = useWorkspaceDerivedProps("", workspace)
    const workspaceCreatedAt = workspace ? useDateTimeParser().stringifyDatePretty(new Date(workspace?.CreatedAt) ?? "")?.date : "";

    return (
        <EntityHoverCard
            ref={ref}
            onClose={onClose}
            entityCreatedAt={workspaceCreatedAt}
            iconId={avatarProps.iconId}
            entityName={workspace?.Name}
            description={workspace?.Props?.Description as string | undefined}
            plan={subscription}
            coverType={headerProps.coverType as "color" | "image" | undefined}
            coverColor={headerProps.coverColor}
            coverImage={headerProps.coverImage}
            headerInRowChilden={
                <div className="flex flex-col">
                    <span className="text-sm text-neutral-800/80 font-medium">
                        {workspace?.Name}
                    </span>
                    <span className="text-xs text-neutral-400/80">{workspaceCreatedAt}</span>
                </div>
            }
            detailsChildren={
                <>
                    <h3 className="text-sm font-semibold">{workspace?.Name}</h3>
                    <span className="text-xs text-neutral-400/80">{members.length} {members.length === 1 ? "member" : "members"}</span>
                    <div className="h-px w-full bg-neutral-300/10" />
                    <div className="flex-1 flex flex-col overflow-y-auto gap-2 scrollbar-hidden">
                        <MembersList members={members.map((member) => member.UserWorkspace)} />
                    </div>
                </>
            }
        />
    )
})