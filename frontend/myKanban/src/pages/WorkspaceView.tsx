import { WorkspaceHeader } from "@/components/workspaceView/WorkspaceHeader";
import { useParams } from "react-router";
import { LockKeyholeIcon, UserRound } from "lucide-react";
import { LabeledButtonPresetA } from "@/components/buttons/labeledButton";
import { ViewDeletedBoards } from "@/components/modals/ViewDeletedBoards";
import { CardRowMenuBtn } from "@/components/cardMenus/cardRowMenus";
import { useCurrentWorkspaceRole } from "@/hooks/useCurrentWorkspaceRole";
import { BoardGrid } from "@/components/workspaceView/BoardGrid";
import { useState, useMemo } from "react";
import { useBoardsStore } from "@/stores/boardsStore";
import { useShallow } from "zustand/shallow";

type VisibilityFilter = "all" | "private" | "non-private";

export function WorkspaceView() {

    const workspaceId = useParams().workspaceId as string;

    const { isAdminOrOwner } = useCurrentWorkspaceRole(workspaceId ?? null);
    const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
    const boardsById = useBoardsStore((state) => state.boardsById);
    const boardIds = useBoardsStore(useShallow((state) => state.boardIdsByWorkspaceId[workspaceId] ?? []));

    const hasPrivateBoards = useMemo(
        () => boardIds.some((id) => boardsById[id]?.Visibility === "private"),
        [boardIds, boardsById],
    );

    const showFilterBtn = isAdminOrOwner || hasPrivateBoards;

    const filterFn = useMemo<((boardId: string) => boolean) | undefined>(
        () => visibilityFilter === "all"
            ? undefined
            : visibilityFilter === "private"
                ? (boardId: string) => boardsById[boardId]?.Visibility === "private"
                : (boardId: string) => boardsById[boardId]?.Visibility !== "private",
        [visibilityFilter, boardsById],
    );

    function cycleFilter() {
        setVisibilityFilter((v) => v === "all" ? "private" : v === "private" ? "non-private" : "all");
    }

    return (
        <>
            <div className="max-w-[1200px] mx-auto justify-center py-4 flex flex-col px-[clamp(1rem,5vw,8rem)]">
                <WorkspaceHeader workspaceId={workspaceId} />
                <div className="w-full h-px bg-border my-3" />
                <div className="flex flex-row items-center gap-2  mb-4">
                    <UserRound className="h-5 text-text flex justify-center items-center" />
                    <div className="font-semibold font-grotesk text-lg">Your boards</div>
                    {showFilterBtn && <button
                        onClick={cycleFilter}
                        className={`ml-auto flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium transition-colors
                            ${visibilityFilter === "private"
                                ? "bg-accent text-white"
                                : visibilityFilter === "non-private"
                                    ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40"
                                    : "bg-menubtn hover:bg-menubtn-hover text-text/70"
                            }`}
                    >
                        <LockKeyholeIcon className="h-3.5 w-3.5" strokeWidth={2} />
                        {visibilityFilter === "all" ? "All" : visibilityFilter === "private" ? "Private" : "Non-private"}
                    </button>}
                </div>
                <BoardGrid overrideWorkspaceId={workspaceId} filterFn={filterFn} />
                <div className="w-full h-px bg-border my-6" />
                {isAdminOrOwner && <CardRowMenuBtn cardID="view-deleted-boards"
                    placement="top"
                    renderType="virtual"
                    menuComponent={({ onClose }) => <ViewDeletedBoards onClose={onClose} workspaceId={workspaceId} />} >
                    <LabeledButtonPresetA label="View Deleted Boards" onClick={() => { }}
                        className="col-span-full bg-menubtn hover:bg-menubtn-hover w-full !h-9" />
                </CardRowMenuBtn>}
            </div>
        </>
    );
}