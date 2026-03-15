import { useWorkspaceStore } from "@/stores/workspaceStore";

import { useAuthStore } from "@/stores/auth";
import { useWsMembersStore } from "@/stores/wsMembersStore";
import type { Role } from "@/components/badges/UserRoleBadge";

export function useWorkspaceRolesById(overrideWorkspaceIds?: string[] | null) {
    const workspaceIds = overrideWorkspaceIds ?? useWorkspaceStore((state) => state.workspaceIds)
    const currentUserId = useAuthStore((state) => state.userID);
    const userWorkspacesByWorkspaceId = useWsMembersStore((state) => state.userWorkspacesByWorkspaceId)

    const rolesByWorkspaceId = workspaceIds.reduce((acc, workspaceId) => {
        const userWorkspace = userWorkspacesByWorkspaceId[workspaceId]?.[currentUserId ?? ""]
        if (userWorkspace) {
            acc[workspaceId] = userWorkspace.Role as Role
        }
        return acc
    }, {} as Record<string, Role | undefined>)

    return { rolesByWorkspaceId }
}