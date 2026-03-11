import { useWsMembersStore } from "@/stores/wsMembersStore";
import { useUserStore } from "@/stores/userStore";

import type { User } from "@/stores/types";
import { useCurrentWorkspaceRole } from "@/hooks/useCurrentWorkspaceRole";
import { WorkspaceMembersDropdown } from "./menuElements/MembersDropdown/WorkspaceMembersDropdown";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceActionRegistry } from "@/actionRegistry/workspaceActionRegistry";
import { LeaveRemoveMember } from "./common/leaveRemoveMember";
import { UserIdentityRow } from "./common/UserIdentityRow";

export function UserRow({ userID, workspaceId }: { userID: string; workspaceId: string }) {

    const currentUserId = useAuthStore((state) => state.userID);
    const user = useUserStore((state) => state.usersById[userID]);
    const isCurrentUser = userID === currentUserId;
    const membership = useWsMembersStore((state) => state.userWorkspacesByWorkspaceId[workspaceId]?.[userID]);
    const { isAdminOrOwner } = useCurrentWorkspaceRole(workspaceId);
    const isLocked = (membership?.Role === "owner" && isCurrentUser) || (!isAdminOrOwner && !isCurrentUser);


    const removeMember = useWorkspaceActionRegistry().deleteWorkspaceMember;
    const leaveWorkspaceWithConfirmation = useWorkspaceActionRegistry().leaveWorkspaceWithConfirmation;

    const canLeave = membership?.Role !== "owner" && isCurrentUser;

    const handleRemoveMember = async () => {
        await removeMember(workspaceId, userID);
    }

    const handleLeaveWorkspace = async () => {
        leaveWorkspaceWithConfirmation(workspaceId, userID);
    }

    if (!userID) return;
    return (
        <div>
            <div className="flex flex-row items-center justify-between gap-3">
                <UserIdentityRow user={user} />
                <div className="flex flex-row gap-4 items-center justify-center h-full +">
                    <WorkspaceMembersDropdown userId={userID} workspaceID={workspaceId} isAdminOrOwner={isAdminOrOwner} isCurrentUser={isCurrentUser}
                        showChevron={!isLocked}
                        chevronClassName="h-5"
                        style={{ border: "none", borderRadius: "6px", }}
                        className={`h-9 font-semibold text-sm
                            ${isLocked ? "" : " !bg-menubtn hover:!bg-white/15"} 
                            ${isAdminOrOwner ? "!text-neutral-300 bg-transparent" : "!text-neutral-600"}`} />
                    <LeaveRemoveMember canRemove={!isLocked} canLeave={canLeave} isCurrentUser={isCurrentUser} onLeave={handleLeaveWorkspace} onRemove={handleRemoveMember} />
                </div>
            </div>
        </div>
    )
}

export function UserRowData({ user, onClick }: { user: User | null, onClick: () => void }) {
    if (!user) return null
    return (
        <div
            onClick={onClick}
            className="flex flex-row items-center
             hover:bg-black hover:bg-opacity-25 hover:cursor-pointer 
             rounded-lg w-full px-4 pt-2">
            <div className="bg-gray-500 min-w-9 min-h-9 rounded-full flex items-center justify-center mr-4 -translate-y-1">
                <p className="text-white">{user?.Name[0].toUpperCase() ?? "U"}</p>
            </div>
            <div className="flex flex-col min-h-14 items-start  ">
                <p className="font-semibold">{user?.Name}</p>
                <p className="text-sm text-gray-500">@{user?.Username === "" ? "username" : user?.Username}</p>
            </div>
        </div >
    )
}
