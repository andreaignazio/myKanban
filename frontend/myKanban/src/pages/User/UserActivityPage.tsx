import { UserActivityFeed } from "@/pages/User/userActivityFeed"
import { ListTodo } from "lucide-react"
import { useState } from "react"
import { UserPagesWrapper } from "./userPagesWrapper"
import type { ApiAuditLogEvent } from "@/stores/audittypes"
import { useAuthStore } from "@/stores/auth"
import { WorkspaceFilter } from "@/components/common/WorkspaceFilter"


const PADDING_S = "ps-10 pe-5"

export const UserActivity = () => {
    const currentUserID = useAuthStore((state) => state.userID);
    const [filterWorkspaceId, setFilterWorkspaceId] = useState<string | null>(null);

    const filterFn = (audit: ApiAuditLogEvent) => {
        if (!filterWorkspaceId) return true;
        return audit.WorkspaceID === filterWorkspaceId;
    }

    return (
        <UserPagesWrapper Title="Activity"
            iconId="activities"
            description="View and manage your activity across different workspaces. This includes actions such as creating, updating, and deleting tasks, as well as other interactions within your workspaces."
        >
            <WorkspaceFilter filterWorkspaceId={filterWorkspaceId} setFilterWorkspaceId={setFilterWorkspaceId} />

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


