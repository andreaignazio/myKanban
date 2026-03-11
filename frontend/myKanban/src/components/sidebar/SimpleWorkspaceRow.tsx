import { useBuildPublicURL } from "@/hooks/useBuildPublicURL"
import { useWorkspaceStore } from "@/stores/workspaceStore";
import HomeIcon from "@heroicons/react/24/outline/HomeIcon";
import { useNavigate } from "react-router-dom";

export const SimpleWorkspaceRow = ({ workspaceId, onClick }: { workspaceId: string, onClick?: () => void }) => {
    const workspace = useWorkspaceStore((state) => state.workspacesById[workspaceId]);
    const navigate = useNavigate()
    const buildPublicURL = useBuildPublicURL()
    const ulrFromWorkspceId = buildPublicURL.buildPublicURLFromWorkspaceID
    const handleOpenWorkspace = () => {

        navigate(ulrFromWorkspceId(workspaceId))
    }
    if (!workspace) return null;
    return (
        <div
            onClick={() => {
                handleOpenWorkspace()
                onClick && onClick()
            }

            }
            className={`flex grid-cols-4 h-11
        p-1 items-center relative  hover:bg-surface"
         rounded-xl text-text hover:bg-active cursor-pointer`}>
            <div className="col-span-1 h-full bg-neutral-600/20 aspect-square
             rounded-lg
             flex items-center justify-center">
                <HomeIcon className="h-5 aspect-square" />

            </div>
            <div className="flex flex-col items-start justify-center  col-span-3 ps-2 pb-0 ">
                <div className="text-sm font-medium">{workspace.Name}</div>
                <div className="text-xs font-extralight">{"Essential"}</div>
            </div>

        </div>
    )
}