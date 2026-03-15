import { useBoardsStore } from "@/stores/boardsStore";
import { useShallow } from "zustand/react/shallow";

type FlatBoardsGridData = {
    workspaceIdByBoardId: Record<string, string>;
    sortedBoardIds: string[];

}

type UseFlatBoardsGridOptions = {
    workspaceIds: string[];
    filterFn?: (boardId: string) => boolean;
    sortFn?: (a: string, b: string) => number;
}
export function useFlatBoardsGrid({ workspaceIds, filterFn, sortFn }: UseFlatBoardsGridOptions): FlatBoardsGridData {
    const boardIdsByWorkspaceId = useBoardsStore(useShallow((state) => state.boardIdsByWorkspaceId));
    const workspaceIdByBoardId: Record<string, string> = {};
    const boardIds: string[] = [];

    for (const workspaceId of workspaceIds) {
        const ids = boardIdsByWorkspaceId[workspaceId] ?? [];
        for (const boardId of ids) {
            workspaceIdByBoardId[boardId] = workspaceId;
            boardIds.push(boardId);
        }
    }

    let filteredBoardIds = filterFn ? boardIds.filter(filterFn) : boardIds;
    let sortedBoardIds = sortFn ? [...filteredBoardIds].sort(sortFn) : filteredBoardIds;




    return { workspaceIdByBoardId, sortedBoardIds };
}

