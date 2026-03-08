
import { BoardCard } from "../components/workspaceView/BoardCard";
import { BoardCardAdd } from "../components/workspaceView/BoardCardAdd";
import { WorkspaceHeader } from "@/components/workspaceView/WorkspaceHeader";
import { useBoardsStore } from "@/stores/boardsStore";
import { useEffect, useMemo } from "react";
import { useParams } from "react-router";
import { UserRound } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { LabeledButtonPresetA } from "@/components/buttons/labeledButton";
import { ViewDeletedBoards } from "@/components/modals/ViewDeletedBoards";
import { CardRowMenuBtn } from "@/components/cardMenus/cardRowMenus";
import { useCurrentWorkspaceRole } from "@/hooks/useCurrentWorkspaceRole";
import { useSortByPosition } from "@/hooks/useSortByPosition";


export function WorkspaceView() {
    const boardsIdsByWorkspaceId = useBoardsStore((state) => state.boardIdsByWorkspaceId);
    //const [boardIds, setBoardIds] = useState<string[]>([]);


    const OpCounter = useBoardsStore((state) => state.OpCounter);
    const workspaceId = useParams().workspaceId as string;

    const useWsRole = useCurrentWorkspaceRole(workspaceId ?? null);
    console.log("Current workspace role in WorkspaceView:", useWsRole);

    const boardIds = useBoardsStore(useShallow((state) => state.boardIdsByWorkspaceId[workspaceId] ?? []));
    const boardsById = useBoardsStore((state) => state.boardsById);
    const userBoardsById = useBoardsStore((state) => state.userBoardsById);
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
    const { isAdminOrOwner, isMember } = useCurrentWorkspaceRole(workspaceId ?? null);


    useEffect(() => {
        if (workspaceId && boardsIdsByWorkspaceId[workspaceId]) {
            // setBoardIds(boardsIdsByWorkspaceId[workspaceId] ?? []);

        }
    }, [workspaceId, boardsIdsByWorkspaceId, OpCounter]);


    //useBoardWebSocket(workspaceId ?? "", null)

    return (
        <>
            <div className="max-w-[1200px] mx-auto justify-center py-4 flex flex-col px-[clamp(1rem,5vw,8rem)]">
                <WorkspaceHeader workspaceId={workspaceId} />
                <div className="w-full h-px bg-border my-3" />
                <div className="flex flex-row items-center gap-2  mb-4">
                    <UserRound className="h-5 text-text flex justify-center items-center" />
                    <div className="font-semibold font-grotesk text-lg">Your boards</div>
                </div>
                <div className="w-full grid 
                [grid-template-columns:repeat(auto-fit,minmax(clamp(140px,18vw,220px),220px))] 
                justify-start items-start gap-4">
                    {sortedBoardIds.length > 0 && sortedBoardIds.map((boardId: string) => (
                        <BoardCard key={boardId} boardID={boardId} />
                    ))}
                    {isMember && <BoardCardAdd workspaceId={workspaceId} />}

                </div>
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