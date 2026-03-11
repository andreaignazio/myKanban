import { BoardCard } from "@/components/workspaceView/BoardCard";
import { BoardCardAdd } from "@/components/workspaceView/BoardCardAdd";
import { useBoardsStore } from "@/stores/boardsStore";
import { forwardRef, useMemo } from "react";
import { useParams } from "react-router";

import { useShallow } from "zustand/shallow";

import { useCurrentWorkspaceRole } from "@/hooks/useCurrentWorkspaceRole";
import { useSortByPosition } from "@/hooks/useSortByPosition";

type BoardGridProps = {
    overrideWorkspaceId?: string;
    className?: string;

}

export const BoardGrid = forwardRef<HTMLDivElement, BoardGridProps>(({ overrideWorkspaceId, className }: BoardGridProps, ref) => {
    const workspaceId = overrideWorkspaceId ?? (useParams().workspaceId as string);
    const gridColumnsClassName = className?.includes("grid-cols-")
        ? ""
        : "[grid-template-columns:repeat(auto-fit,minmax(clamp(140px,18vw,220px),1fr))]";

    const boardIds = useBoardsStore(useShallow((state) => state.boardIdsByWorkspaceId[workspaceId] ?? []));
    const boardsById = useBoardsStore((state) => state.boardsById);

    const userBoardsById = useBoardsStore((state) => state.userBoardsById);
    const { isMember } = useCurrentWorkspaceRole(workspaceId ?? null);

    const { sortByPosition } = useSortByPosition();

    const sortedBoardIds = useMemo(() => {
        if (!boardIds || boardIds.length === 0) return [];

        const boardIDsWithRelation: { BoardID: string; Position: string }[] = [];
        const boardIDsWithoutRelation: string[] = [];

        for (const boardId of boardIds) {
            const relation = userBoardsById[boardId];
            if (relation?.Position) {
                boardIDsWithRelation.push({ BoardID: boardId, Position: relation.Position });
            } else {
                boardIDsWithoutRelation.push(boardId);
            }
        }

        const sortedWithRelation = sortByPosition(boardIDsWithRelation).map((item) => item.BoardID);

        const sortedWithoutRelation = [...boardIDsWithoutRelation].sort((a, b) => {
            const aCreatedAt = boardsById[a]?.CreatedAt ? new Date(boardsById[a].CreatedAt).getTime() : 0;
            const bCreatedAt = boardsById[b]?.CreatedAt ? new Date(boardsById[b].CreatedAt).getTime() : 0;

            if (aCreatedAt === bCreatedAt) {
                return a.localeCompare(b);
            }
            return bCreatedAt - aCreatedAt;
        });

        return [...sortedWithRelation, ...sortedWithoutRelation];
    }, [boardIds, userBoardsById, boardsById, sortByPosition]);
    return (

        <div
            ref={ref}
            className={`w-full grid 
                        ${gridColumnsClassName}
                        justify-start items-start gap-4 ${className ?? ""}`}>
            {sortedBoardIds.length > 0 && sortedBoardIds.map((boardId: string) => (
                <BoardCard key={boardId} boardID={boardId} workspaceId={workspaceId} />
            ))}
            {isMember && <BoardCardAdd workspaceId={workspaceId} />}

        </div>
    )

})