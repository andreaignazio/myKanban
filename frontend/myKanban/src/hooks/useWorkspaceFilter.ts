import type { CardFilterState } from "@/components/cardMenus/cardFilterMenu";
import type { WorkspaceFilterState } from "@/components/sidebar/Sidebar";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function useWorkspaceFilter(workspaceIds: string[], filterState: WorkspaceFilterState) {
    const { statusFilter, searchQuery } = filterState

    const getStatus = useWorkspaceStore((state) => state.getWorkspaceStatus)
    const workspacesById = useWorkspaceStore((state) => state.workspacesById)
    const normalizedQuery = (searchQuery ?? "").trim().toLowerCase()

    const filteredIds = workspaceIds.filter((id) => {
        const status = getStatus(id)
        if (statusFilter && status !== statusFilter) {
            return false
        }

        if (normalizedQuery.length > 0) {
            const workspaceName = workspacesById[id]?.Name?.toLowerCase() ?? ""
            if (!workspaceName.includes(normalizedQuery)) {
                return false
            }
        }

        return true
    })
    return filteredIds
}