import { BoardCard } from "@/components/workspaceView/BoardCard";
import { BoardCardAdd } from "@/components/workspaceView/BoardCardAdd";
import { useBoardsStore } from "@/stores/boardsStore";
import { forwardRef, useMemo } from "react";
import { useParams } from "react-router";
import { AnimatePresence, motion } from "framer-motion";

import { useShallow } from "zustand/shallow";

import { useCurrentWorkspaceRole } from "@/hooks/useCurrentWorkspaceRole";
import { useSortByPosition } from "@/hooks/useSortByPosition";
import { useAsyncRequest } from "@/hooks/useAsyncRequest";
import { useAsyncKey } from "@/stores/asyncRequestStore";
import { BoardCardViewer } from "./BoardCardViewer";

type BoardGridProps = {
    overrideWorkspaceId?: string;
    className?: string;

}

export const BoardGrid = forwardRef<HTMLDivElement, BoardGridProps>(({ overrideWorkspaceId, className }: BoardGridProps, ref) => {
    const workspaceId = overrideWorkspaceId ?? (useParams().workspaceId as string);
    const gridColumnsClassName = className?.includes("grid-cols-")
        ? ""
        : "[grid-template-columns:repeat(auto-fill,minmax(clamp(140px,18vw,220px),1fr))]";

    const boardIds = useBoardsStore(useShallow((state) => state.boardIdsByWorkspaceId[workspaceId] ?? []));
    const boardsById = useBoardsStore((state) => state.boardsById);

    const userBoardsById = useBoardsStore((state) => state.userBoardsById);
    const { isMember, isViewer } = useCurrentWorkspaceRole(workspaceId ?? null);

    const fetchKey = useAsyncKey("workspace:boards:fetch", workspaceId ?? "");
    const { isLoading: isFetching } = useAsyncRequest(fetchKey);

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
            <AnimatePresence mode="popLayout">
                {isFetching && sortedBoardIds.length === 0 && Array.from({ length: 4 }).map((_, i) => (
                    <motion.div
                        key={`skeleton-${i}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { duration: 0.2, delay: i * 0.06 } }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        className="w-full h-[120px] rounded-lg bg-menusec animate-pulse"
                    />
                ))}
            </AnimatePresence>
            <AnimatePresence mode="popLayout">
                {sortedBoardIds.map((boardId: string, i: number) => (
                    <motion.div
                        key={boardId}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut", delay: Math.min(i * 0.05, 0.3) } }}
                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                    >
                        <BoardCard boardID={boardId} workspaceId={workspaceId} />
                    </motion.div>
                ))}
            </AnimatePresence>
            {isMember && <BoardCardAdd workspaceId={workspaceId} />}
            {isViewer && <BoardCardViewer workspaceId={workspaceId} />}

        </div>
    )

})