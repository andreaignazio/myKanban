import { UserActivityFeed } from "@/pages/User/userActivityFeed"
import { WorkspaceVisibility } from "@/components/workspaceView/WorkspaceVisibility"
import { useWorkspaceStore } from "@/stores/workspaceStore"
import { ListTodo, UsersRoundIcon } from "lucide-react"
import { useState } from "react"
import { useShallow } from "zustand/shallow"
import { UserPagesWrapper } from "./userPagesWrapper"
import type { ApiAuditLogEvent } from "@/stores/audittypes"
import { useAuthStore } from "@/stores/auth"


const PADDING_S = "ps-10 pe-5"

export const UserActivity = () => {
    const currentUserID = useAuthStore((state) => state.userID);
    const [filterWorkspaceId, setFilterWorkspaceId] = useState<string | null>(null);

    const filterFn = (audit: ApiAuditLogEvent) => {
        if (!filterWorkspaceId) return true;
        return audit.WorkspaceID === filterWorkspaceId;
    }

    return (
        <UserPagesWrapper Title="Activity">
            <div className="ps-0">
                <div className="flex flex-row items-center gap-2 mt-5 ps-4
                     text-neutral-300">
                    <UsersRoundIcon className="" size={16} />
                    <span className="text-md font-semibold">Workspaces</span>
                </div>
                <div className={`flex flex-col mt-2 mb-4 w-full ${PADDING_S} `} >
                    <UserWorkspaces filterWorkspaceId={filterWorkspaceId} setFilterWorkspaceId={setFilterWorkspaceId} />
                </div>
            </div>

            <div className="relative flex flex-row items-center gap-2 mb-4 mt-3">
                <ListTodo className="absolute left-3" size={16} />
                <div className={`text-sm font-bold ${PADDING_S}`}>Activity</div>
            </div>

            <div className={`${PADDING_S}`}>
                <UserActivityFeed filterFn={filterFn} currentUserID={currentUserID} />
            </div>

        </UserPagesWrapper>
    )

}

type UserWorkspacesProps = {
    filterWorkspaceId?: string | null;
    setFilterWorkspaceId?: (id: string | null) => void;
}

const UserWorkspaces = ({ filterWorkspaceId, setFilterWorkspaceId }: UserWorkspacesProps) => {
    const workspacesIds = useWorkspaceStore(useShallow((state) => state.workspaceIds));
    const workspacesbyId = useWorkspaceStore(useShallow((state) => state.workspacesById));

    const handleToggleFilter = (id: string) => {
        if (filterWorkspaceId === id) {
            setFilterWorkspaceId?.(null);
        } else {
            setFilterWorkspaceId?.(id);
        }
    }

    return (
        workspacesIds.map((id) => {
            const workspace = workspacesbyId[id]
            const isActive = filterWorkspaceId === id;
            return (
                <div key={id} className="flex flex-col items-start gap-0 mt-1">
                    <div
                        onClick={() => handleToggleFilter(id)}
                        key={id} className={`flex flex-row items-center gap-2 ${isActive ? "bg-neutral-400/10" : ""}
                 text-neutral-300 hover:bg-neutral-400/10 rounded 
                 h-9
                 px-2 py-1 cursor-pointer`}>

                        <span className="text-sm">{workspace?.Name}</span>
                        <WorkspaceVisibility
                            showColor={true}
                            mode="compact"
                            visibility={workspace?.Visibility || "private"} />

                    </div>
                    <div className="bg-neutral-700/50 mt-1 h-px w-full" />
                </div>
            )
        })
    )

}


