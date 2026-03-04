import { useWorkspaceStore } from "@/stores/workspaceStore";
import HomeIcon from "@heroicons/react/24/solid/HomeIcon";
import { LockClosedIcon, } from "@heroicons/react/24/solid";
import { GlobeAltIcon } from "@heroicons/react/24/solid";
import { WorkspaceVisibility } from "./WorkspaceVisibility";

type WorkspaceHeaderProps = {
    workspaceId: string
}

export function WorkspaceHeader({ workspaceId }: WorkspaceHeaderProps) {
    const workspace = useWorkspaceStore((state) => state.workspacesById[workspaceId]);

    const visibilityText = workspace?.Visibility === "public" ? "Public" : "Private";

    return (
        <div className="flex items-center justify-start w-full pb-8 pt-6">
            <div className="flex grid-cols-4 h-14
        p-1 items-center
         rounded-xl text-text">
                <div className="col-span-1 h-14 w-14
             rounded-lg bg-surface
             flex items-center justify-center">
                    <HomeIcon className="h-7 w-7" />

                </div>
                <div className="flex flex-col  col-span-3 ps-2  ">
                    <div className="text-md font-bold">{workspace?.Name}</div>
                    <WorkspaceVisibility visibility={workspace?.Visibility || "private"} />
                </div>
            </div>
        </div>
    )
}

