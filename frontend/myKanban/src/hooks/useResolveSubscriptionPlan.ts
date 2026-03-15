import { useBoardsStore } from "@/stores/boardsStore"
import { useWorkspaceStore } from "@/stores/workspaceStore"
import type { SubscriptionPlan } from "@/stores/types"
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

    const subscriptionObj = workspaceId ? wSubscriptionsById[workspaceId] : undefined;
    const currentPlan: SubscriptionPlan = subscriptionObj?.Plan ?? "free";
    const pendingPlan = subscriptionObj?.PendingPlan ?? undefined;

    const cancelAtEnd = subscriptionObj?.CancelAtPeriodEnd ?? false;
    const resolvedPendingPlan = cancelAtEnd ? "free" : pendingPlan;
    //const subscription: SubscriptionPlan = workspaceId ? wSubscriptionsById[workspaceId]?.Plan ?? "free" : "free"
    //const nextPlan: SubscriptionPlan | undefined = workspaceId ? wSubscriptionsById[workspaceId]?.PendingPlan ?? undefined : undefined
    const getMaxBoardsByWorkspaceId = useWorkspaceStore((state) => state.getMaxBoardsByWorkspaceId);
    const boardCount = workspaceId ? getMaxBoardsByWorkspaceId(workspaceId) : 0


    return { subscription: currentPlan, nextPlan: resolvedPendingPlan, boardCount }
}