import { useBoardsStore } from "@/stores/boardsStore"
import { useWorkspaceStore } from "@/stores/workspaceStore"
import { useMatch } from "react-router-dom"

export function useResolveSubscriptionPlan() {
    const isBoard = useMatch("/board/:boardId")
    const isWorkspace = useMatch("/workspaces/:workspaceId/*")
    const workspaceIdByBoardId = useBoardsStore((state) => state.findWorkspaceIdByBoardId)
    const wSubscriptionsById = useWorkspaceStore((state) => state.wSubscriptionsById)

    const boardId = isBoard?.params.boardId as string | undefined
    const workspaceId = boardId
        ? workspaceIdByBoardId(boardId)
        : (isWorkspace?.params.workspaceId as string | undefined)
    const subscription = workspaceId ? wSubscriptionsById[workspaceId]?.Plan ?? "free" : "free"
    const getMaxBoardsByWorkspaceId = useWorkspaceStore((state) => state.getMaxBoardsByWorkspaceId);
    const boardCount = workspaceId ? getMaxBoardsByWorkspaceId(workspaceId) : 0
    return { subscription, boardCount }
}