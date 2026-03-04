import { useCacheStore } from "@/stores/cacheStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { forwardRef, useEffect, useState } from "react";
import { SubscriptionBadge } from "@/components/badges/subscriptionBadge";
import { useShallow } from "zustand/shallow";
import type { WorkspaceMembers } from "@/stores/workspaceStore";

type WorkspaceHoverCardProps = {
    workspaceID: string;
}

export const WorkspaceHoverCard = forwardRef<HTMLDivElement, WorkspaceHoverCardProps>((props, ref) => {
    const { workspaceID } = props;
    const [visible, setVisible] = useState(false);
    const cachedWorkspace = useCacheStore((state) => state.offerWorkspaceById[workspaceID]);
    const cachedSubscription = useCacheStore((state) => state.offerSubscriptionByWorkspaceId[workspaceID]);
    const getCachedMembers = useCacheStore((state) => state.getOfferWorkspaceMembers);
    const getWorkspaceMembers = useWorkspaceStore(useShallow((state) => state.getMembersByWorkspaceId));
    const workspace = cachedWorkspace ?? useWorkspaceStore((state) => state.workspacesById[workspaceID]);
    const subscription = cachedSubscription?.Plan ?? useWorkspaceStore((state) => state.wSubscriptionsById[workspaceID]?.Plan) ?? "free";

    const [members, setMembers] = useState<WorkspaceMembers[]>([])

    useEffect(() => {
        const cachedMembers = getCachedMembers(workspaceID);
        setMembers(cachedMembers.length > 0 ? cachedMembers : getWorkspaceMembers(workspaceID));
    }, [getCachedMembers, getWorkspaceMembers, workspaceID]);

    useEffect(() => {
        const id = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(id);
    }, []);

    return (
        <div
            ref={ref}
            className={`w-96 p-4 bg-white text-black rounded-lg shadow-md transition-opacity duration-150 ${visible ? "opacity-100 animate-fade-in" : "opacity-0"}`}
        >
            <div className="grid grid-cols-[1fr_2fr] gap-4">
                <div className="flex flex-col items-center justify-start">
                    <p className="font-semibold ">{workspace?.Name}</p>
                    <SubscriptionBadge plan={subscription} />

                </div>
                <div className="flex flex-col justify-end text-right gap-2">
                    <p className="text-sm text-black/70">Members:</p>
                    <div className="flex flex-col gap-1 max-h-56 justify-end overflow-y-auto">
                        {members.map((member) => (
                            <div key={member.User.ID} className="flex flex-row items-center gap-2">
                                <div className="bg-gray-500 w-6 h-6 rounded-full flex items-center justify-center">
                                    <p className="text-white text-xs">{member.User.Name[0]}</p>
                                </div>
                                <div className="flex flex-col items-start">
                                    <p className="text-sm ">{member.User.Name}</p>
                                    <p className="text-sm ">{member.User.Email}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
})
