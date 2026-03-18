import { useBuildPublicURL } from "@/hooks/useBuildPublicURL"
import { useWorkspaceStore } from "@/stores/workspaceStore";
import HomeIcon from "@heroicons/react/24/outline/HomeIcon";
import { useNavigate } from "react-router-dom";
import { useShallow } from "zustand/shallow";

type SimpleWorkspaceRowProps = {
    workspaceId: string;
    onClick?: () => void;
    radius?: number;
}

export const SimpleWorkspaceRow = ({ workspaceId, onClick, radius: radiusProp }: SimpleWorkspaceRowProps) => {
    const workspace = useWorkspaceStore(useShallow((state) => state.workspacesById[workspaceId]));
    const subscription = useWorkspaceStore(useShallow((state) => state.wSubscriptionsById[workspaceId]));
    const navigate = useNavigate()
    const buildPublicURL = useBuildPublicURL()
    const ulrFromWorkspceId = buildPublicURL.buildPublicURLFromWorkspaceID
    const handleOpenWorkspace = () => {

        navigate(ulrFromWorkspceId(workspaceId))
    }
    const planLabel = subscription?.Plan?.slice(0, 1).toUpperCase() + subscription?.Plan?.slice(1)
    const radius = radiusProp ?? 8
    const padding = 4
    const innerRadius = radius - padding / 2

    if (!workspace) return null;
    return (
        <div
            style={{ borderRadius: radius, padding: padding }}
            onClick={() => {
                handleOpenWorkspace()
                onClick && onClick()
            }

            }
            className={`flex grid-cols-4 h-11
        p-1 items-center relative  hover:bg-surface"
         rounded-md text-text hover:bg-active cursor-pointer`}>
            <div
                style={{ borderRadius: innerRadius }}
                className="col-span-1 h-full bg-neutral-600/20 aspect-square
             
             flex items-center justify-center">
                <HomeIcon className="h-5 aspect-square" />

            </div>
            <div className="flex flex-col truncate text-ellipsis w-full  items-start justify-center  col-span-3 ps-2 pb-0 ">
                <div className="text-sm font-medium truncate text-ellipsis  max-w-[90%]">{workspace.Name}</div>
                <div className="text-xs font-mono text-zinc-400">{planLabel}</div>
            </div>

        </div>
    )
}