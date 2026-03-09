
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
import { BoardGrid } from "@/components/workspaceView/BoardGrid";


export function WorkspaceView() {

    const workspaceId = useParams().workspaceId as string;

    const useWsRole = useCurrentWorkspaceRole(workspaceId ?? null);
    console.log("Current workspace role in WorkspaceView:", useWsRole);


    const { isAdminOrOwner, isMember } = useCurrentWorkspaceRole(workspaceId ?? null);


    return (
        <>
            <div className="max-w-[1200px] mx-auto justify-center py-4 flex flex-col px-[clamp(1rem,5vw,8rem)]">
                <WorkspaceHeader workspaceId={workspaceId} />
                <div className="w-full h-px bg-border my-3" />
                <div className="flex flex-row items-center gap-2  mb-4">
                    <UserRound className="h-5 text-text flex justify-center items-center" />
                    <div className="font-semibold font-grotesk text-lg">Your boards</div>
                </div>
                <BoardGrid overrideWorkspaceId={workspaceId} />
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