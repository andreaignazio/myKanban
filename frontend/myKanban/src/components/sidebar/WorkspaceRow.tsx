
type WorkspaceRowProps = {
    workspaceId: string;
    activeSubRowId?: string | null;
    onSubRowToggle?: (workspaceId: string) => void;
    className?: string;
    isActive?: boolean;
    status?: "accessible" | "offered" | "requested" | "none";

}

import { HomeIcon } from "@heroicons/react/24/solid";


import { useWorkspaceStore } from "@/stores/workspaceStore";
import { forwardRef, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

export const WorkspaceRow = forwardRef<HTMLDivElement, WorkspaceRowProps>(({ workspaceId, activeSubRowId, onSubRowToggle, className, isActive, status }, ref) => {
    const workspace = useWorkspaceStore((state) => state.workspacesById[workspaceId]);

    const subscription = useWorkspaceStore((state) => state.wSubscriptionsById[workspaceId]?.Plan ?? "free")
    const subscriptionLabel = subscription.charAt(0).toUpperCase() + subscription.slice(1)

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




    return (
        <>
            <div ref={ref}
                onClick={(e) => onSubRowToggle && isWorkspaceAccessible && onSubRowToggle(workspaceId)}
                className={`flex grid-cols-4 h-11 ${className}
        p-1 items-center relative ${resolvedActive ? "bg-active" : "hover:bg-surface"}
         rounded-xl text-text hover:bg-active 
         ${isWorkspaceAccessible ? "cursor-pointer" : "cursor-default opacity-50"}
          transition-[padding,height,border-color,background-color] duration-300 ease-in-out`}>
                <div className="col-span-1 h-full bg-neutral-600/20 aspect-square
             rounded-lg
             flex items-center justify-center">
                    <HomeIcon className="h-5 aspect-square" />

                </div>
                <div className="flex flex-col items-start justify-center  col-span-3 ps-2 pb-0 ">
                    <div className="text-sm font-medium">{workspace.Name}</div>
                    <div className="text-xs font-extralight">{subscriptionLabel}</div>
                </div>
                <div className="absolute end-2">
                    <ChevronDown className={`h-6 w-6 text-neutral-400
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