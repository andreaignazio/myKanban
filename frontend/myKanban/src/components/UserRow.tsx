import { useWsMembersStore } from "@/stores/wsMembersStore";
import { useUserStore } from "@/stores/userStore";
import { TextButton } from "./buttons/TextButton";

import type { User } from "@/stores/types";
import { UserAvatar } from "./badges/UserAvatar";
import { useCurrentWorkspaceRole } from "@/hooks/useCurrentWorkspaceRole";
import { WorkspaceMembersDropdown } from "./menuElements/MembersDropdown/WorkspaceMembersDropdown";
import { useAuthStore } from "@/stores/auth";
import { LabeledButtonPresetA } from "./buttons/labeledButton";
import { X } from "lucide-react";
import { useWorkspaceActionRegistry } from "@/actionRegistry/workspaceActionRegistry";
import { LeaveRemoveMember } from "./common/leaveRemoveMember";

export function UserRow({ userID, workspaceId }: { userID: string; workspaceId: string }) {

    const currentUserId = useAuthStore((state) => state.userID);
    const user = useUserStore((state) => state.usersById[userID]);
    const isCurrentUser = userID === currentUserId;
    const membership = useWsMembersStore((state) => state.userWorkspacesByWorkspaceId[workspaceId]?.[userID]);
    const { isAdminOrOwner } = useCurrentWorkspaceRole(workspaceId);
    const isLocked = (membership?.Role === "owner" && isCurrentUser) || (!isAdminOrOwner && !isCurrentUser);


    const removeMember = useWorkspaceActionRegistry().deleteWorkspaceMember;
    const leaveWorkspaceWithConfirmation = useWorkspaceActionRegistry().leaveWorkspaceWithConfirmation;
    const updateMemberRole = useWorkspaceActionRegistry().setWorkspaceMemberRole;

    const canLeave = membership?.Role !== "owner" && isCurrentUser;

    const handleRemoveMember = async () => {
        await removeMember(workspaceId, userID);
    }

    const handleLeaveWorkspace = async () => {
        leaveWorkspaceWithConfirmation(workspaceId, userID);
    }
    const handleChangeRole = async (newRole: string) => {
        await updateMemberRole(workspaceId, userID, newRole);
    }


    if (!userID) return;
    return (
        <div>
            <div className="flex flex-row items-center justify-between gap-3">
                <div className="flex flex-row items-center gap-3 h-full ">
                    <UserAvatar user={user} size={42} />
                    <div className="flex flex-col min-h-14 items-start justify-center  ">
                        <p className="font-bold text-sm">{user?.Name}</p>
                        <p className="text-xs text-gray-500">@{user?.Username === "" ? "username" : user?.Username}</p>
                    </div>
                </div>
                <div className="flex flex-row gap-4 items-center justify-center h-full +">
                    <WorkspaceMembersDropdown userId={userID} workspaceID={workspaceId} isAdminOrOwner={isAdminOrOwner} isCurrentUser={isCurrentUser}
                        showChevron={!isLocked}
                        chevronClassName="h-5"
                        style={{ border: "none", borderRadius: "6px", }}
                        className={`h-9 font-semibold text-sm
                            ${isLocked ? "" : " !bg-menubtn hover:!bg-white/15"} 
                            ${isAdminOrOwner ? "!text-neutral-300 bg-transparent" : "!text-neutral-600"}`} />

                    <LeaveRemoveMember canRemove={!isLocked} canLeave={canLeave} isCurrentUser={isCurrentUser} onLeave={handleLeaveWorkspace} onRemove={handleRemoveMember} />
                    {/*<LabeledButtonPresetA label="Remove" onClick={handleRemoveMember} disabled={isLocked}
                        className={`h-9 
                    ${isCurrentUser ? "hidden" : ""}
                    font-semibold text-sm ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`} />

                    <LabeledButtonPresetA label="Leave" onClick={handleLeaveWorkspace} disabled={!canLeave}
                        className={`h-9  px-6
                    ${isCurrentUser ? "" : "hidden"}
                    font-semibold text-sm ${canLeave ? "" : "opacity-50 cursor-not-allowed"}`} >
                        <X className="h-4 w-4" />
                    </LabeledButtonPresetA>*/}

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
