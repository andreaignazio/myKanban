import { useBoardsStore } from "@/stores/boardsStore";
import { forwardRef, useEffect, useRef } from "react";
import { useShallow } from "zustand/shallow";
import { LabeledButtonPresetA } from "../buttons/labeledButton";
import { BoardCoverRenderer } from "../menuElements/BoardCoverRenderer";
import { LucideTrash2, TrashIcon } from "lucide-react";
import { ButtonXMark } from "../menuElements/buttonXMark";
import { useBoardActionRegistry } from "@/actionRegistry/boardActionRegistry";
import { CommonMenuWrapper } from "../menuElements/menuWrapper";

type ViewDeletedBoardsProps = {
    onClose: () => void;
    workspaceId: string;
}

export const ViewDeletedBoards = forwardRef<HTMLDivElement, ViewDeletedBoardsProps>(({ onClose, workspaceId }, ref) => {

    const deletedBoardsIds = useBoardsStore(useShallow((state) => state.closedBoardIdsByWorkspaceId[workspaceId] ?? []))
    const fetchDeletedBoards = useBoardsStore((state) => state.getClosedBoardsInWorkspace)

    useEffect(() => {
        if (workspaceId) {
            fetchDeletedBoards(workspaceId);
        }
    }, [workspaceId])

    return (
        <CommonMenuWrapper ref={ref}>
            <div className="p-4 w-screen max-w-2xl">
                <ButtonXMark onClick={onClose} className="" />
                <div className="flex flex-row items-center gap-2 mb-4 text-neutral-300">
                    <TrashIcon className="h-5.5 aspect-square text-gray-400" />
                    <h2 className="text-xl font-semibold">Closed Boards</h2>
                </div>
                <p className="text-gray-400 mb-6">Here you can view and restore deleted boards.</p>
                {deletedBoardsIds.length > 0 && deletedBoardsIds.map((boardId) => (
                    <DeletedBoardRow key={boardId} boardId={boardId} workspaceId={workspaceId} />
                ))}
                {deletedBoardsIds.length === 0 && (
                    <p className="text-gray-400">No deleted boards found.</p>
                )}
            </div>
        </CommonMenuWrapper>
    )
});

const DeletedBoardRow = ({ boardId, workspaceId }: { boardId: string, workspaceId: string }) => {
    const board = useBoardsStore.getState().closedBoardById[boardId];
    const boardActions = useBoardActionRegistry();
    const buttonRef = useRef<HTMLDivElement>(null);
    const handleRestoreBoard = () => {
        boardActions.restoreBoard(workspaceId, boardId);
    }
    const handlePurgeBoard = () => {
        boardActions.purgeBoardWithConfirmation(workspaceId, boardId, buttonRef);
    }

    if (!board) return null;

    return (
        <div className="flex items-center justify-between">
            <div className="flex flex-row h-10 items-center gap-3">
                <BoardCoverRenderer board={board} />
                <div className="flex flex-col">
                    <div className="text-sm font-medium">{board.Name}</div>
                    <div className="text-xs text-gray-400">Deleted on {new Date(board.DeletedAt!).toLocaleDateString()}</div>
                </div>
            </div>
            <div ref={buttonRef}
                className="flex md:flex-row  sm:flex-col sm:items-start items-center gap-2">
                <LabeledButtonPresetA label="Restore" onClick={() => { handleRestoreBoard(); }}
                    className="!bg-accent !text-neutral-800 hover:!bg-accent-hover w-full" />
                <LabeledButtonPresetA label="Delete" onClick={() => { handlePurgeBoard(); }}
                    className="!bg-danger !text-neutral-800 hover:!bg-danger-hover" >
                    <LucideTrash2 className="h-4 w-4" />
                </LabeledButtonPresetA>
            </div>
        </div>
    )
}
