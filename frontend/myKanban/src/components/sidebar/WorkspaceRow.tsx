
type WorkspaceRowProps = {
    workspaceId: string;
    activeSubRowId?: string | null;
    onSubRowToggle?: (workspaceId: string) => void;
    className?: string;
    isActive?: boolean;
    status?: "accessible" | "offered" | "requested" | "none";
    isCollapsed?: boolean;
}

import { HomeIcon } from "@heroicons/react/24/solid";


import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useWsMembersStore } from "@/stores/wsMembersStore";
import { useAuthStore } from "@/stores/auth";
import { WorkspaceSuspensionBadge } from "@/components/badges/WorkspaceSuspensionBadge";
import { forwardRef, useEffect, useState } from "react";
import { ChevronDown, MailOpen } from "lucide-react";

export const WorkspaceRow = forwardRef<HTMLDivElement, WorkspaceRowProps>(({ workspaceId, activeSubRowId, onSubRowToggle, className, isActive, status, isCollapsed }, ref) => {
    const workspace = useWorkspaceStore((state) => state.workspacesById[workspaceId]);

    const subscription = useWorkspaceStore((state) => state.wSubscriptionsById[workspaceId]?.Plan ?? "free")
    const subscriptionLabel = subscription.charAt(0).toUpperCase() + subscription.slice(1)

    const currentUserId = useAuthStore((state) => state.userID)
    const userWorkspace = useWsMembersStore((state) => state.userWorkspacesByWorkspaceId[workspaceId]?.[currentUserId ?? ""])
    const isSuspended = userWorkspace?.IsSuspended ?? false
    //const _isPendingSuspension = userWorkspace?.IsPendingSuspend ?? false

    const isWorkspaceAccessible = status === "accessible"
    const isStatusOffered = status === "offered"
    const isStatusRequested = status === "requested"

    // const [isActive, setIsActive] = useState(false);



    if (!workspace) {
        return null;
    }

    const [isSubRowsOpen, setIsSubRowsOpen] = useState(false);
    useEffect(() => {
        if (activeSubRowId === workspaceId) {
            setIsSubRowsOpen(true);
        } else {
            setIsSubRowsOpen(false);
        }
    }, [activeSubRowId, workspaceId])

    const resolvedActive = isActive ? isSubRowsOpen ? false : true : false

    const isCompact = !isActive


    const isClickable = isWorkspaceAccessible && !isSuspended

    if (isCollapsed) {
        return (
            <div
                ref={ref}
                onClick={() => onSubRowToggle && isClickable && onSubRowToggle(workspaceId)}
                title={workspace.Name}
                className={`flex items-center justify-center h-9 w-full rounded-xl relative transition-colors
                    ${isActive ? "bg-active" : "hover:bg-surface"}
                    ${isActive ? "text-zinc-100" : "text-zinc-600"}
                    ${isClickable ? "cursor-pointer" : "cursor-default"}
                    ${isWorkspaceAccessible ? "" : "opacity-50"}
                    ${isSuspended ? "opacity-50" : ""}`}
            >
                <HomeIcon className="h-5 w-5" />
                {isSuspended && (
                    <div className="absolute bottom-0.5 end-0.5">
                        <WorkspaceSuspensionBadge userWorkspace={userWorkspace} compact />
                    </div>
                )}
            </div>
        )
    }

    return (
        <>
            <div ref={ref}
                onClick={(e) => onSubRowToggle && isClickable && onSubRowToggle(workspaceId)}
                className={`grid grid-cols-[36px_1fr_1fr_1fr] h-11 
                    ${className}
        p-1 items-center relative ${resolvedActive ? "bg-active " : "hover:bg-surface"}
       
        ${isCompact ? "h-[36px]" : "h-[44px]"}
         rounded-xl text-text hover:bg-active
         ${isClickable ? "cursor-pointer" : "cursor-default"}
         ${isWorkspaceAccessible ? "" : isStatusOffered ? "opacity-80" : "opacity-50"}
         ${isSuspended ? "opacity-50" : ""}
          transition-[padding,height,border-color,background-color] duration-300 ease-in-out`}>
                <div className={`col-span-1   h-full w-full
             rounded-lg 
             ${isCompact ? "bg-transparent" : "bg-neutral-600/20"}
             flex items-center justify-center`}>
                    <HomeIcon className={`${isCompact ? "h-4" : "h-5"} aspect-square`} />

                </div>
                <div className="flex flex-col items-start justify-center col-start-2  col-span-3 ps-2 pb-0 ">
                    <div className={`truncate max-w-[80%]
                        ${isCompact
                            ? "text-[13px] font-normal text-gray-300/80"
                            : "text-gray-200 text-sm font-medium"}`}>
                        {workspace.Name}</div>
                    <div className={`
                        ${isCompact ? "h-0 opacity-0" : "h-auto opacity-100"}
                        flex flex-row items-center gap-1.5
                        text-xs font-extralight`}>
                        <span>{subscriptionLabel}</span>
                        <WorkspaceSuspensionBadge userWorkspace={userWorkspace} />
                    </div>
                </div>
                {/* Compact-mode suspension dot */}
                {isCompact && (
                    <div className="absolute bottom-1 start-1">
                        <WorkspaceSuspensionBadge userWorkspace={userWorkspace} compact />
                    </div>
                )}
                <div className={`absolute end-12 ${isStatusOffered ? "opacity-100" : "opacity-0"} transition-opacity`}>
                    <MailOpen className="w-4 h-4 text-white" />
                </div>
                <div className="absolute end-2">
                    <ChevronDown className={`
                    ${isCompact ? "h-5 w-5" : "h-6 w-6"} text-neutral-400
                     transition-transform ${isSubRowsOpen ? "rotate-180" : ""}`} />
                </div>
                <div className={`absolute inset-0
                 ${isWorkspaceAccessible ? "" : ""}
                 ${isStatusOffered ? "bg-yellow-700/50" : ""}
                 ${isStatusRequested ? "bg-fuchsia-500/20" : ""}
                rounded-xl`} />
            </div>



        </>

    )
})