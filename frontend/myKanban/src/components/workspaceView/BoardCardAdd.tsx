type BoardRowProps = {
    workspaceId: string


}
import { BoardCardWrapper } from "./BoardCardWrapper";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { useRef } from "react";
import { CreateBoardModal } from "../modals/CreateBoardModal";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function BoardCardAdd({ workspaceId }: BoardRowProps) {
    const onOpenOverlay = useOverlayStore((state) => state.open)
    const closeOverlay = useOverlayStore((state) => state.close)
    const createPanelRef = useRef<HTMLDivElement>(null)
    const anchorRef = useRef<HTMLDivElement>(null)
    const getMaxBoardsByWorkspaceId = useWorkspaceStore((state) => state.getMaxBoardsByWorkspaceId);
    const [availableBoards, maxBoards] = getMaxBoardsByWorkspaceId(workspaceId);

    function handleOpenCreateWizard() {

        const id = "create-board-modal"
        const descriptor: OverlayDescriptor = {
            id: "create-board-modal",
            render: () => <CreateBoardModal ref={createPanelRef} onClose={() => closeOverlay(id)} workspaceId={workspaceId} overlayId={id} />,
            panelRef: createPanelRef,
            anchorRef: anchorRef,
            type: "modal",
            opts: {
                closeOnClickOutside: true,
                closeOnEscape: true,
                closeOnMouseLeave: false,
                lockBackdrop: true,
            },
            position: {
                placement: "right",
                offset: [0, 0],

            },
            renderType: "anchored",
            exclusiveGroup: "workspace-overlays",

        }
        onOpenOverlay(descriptor);
    }

    const resolveAvailableBoards = (max: number, current: number) => {
        if (max === -1) {
            return "∞"
        }
        return `${current}/${max} boards`


    }

    const availableBoardsLabel = resolveAvailableBoards(maxBoards, availableBoards)



    return (
        <>
            <BoardCardWrapper
                className="bg-menusec"
            >
                <div onClickCapture={() => handleOpenCreateWizard()}
                    className="absolute transition-all ease-in-out duration-300
                    inset-0 z-10 hover:bg-black/20 cursor-pointer" />
                <div
                    ref={anchorRef}
                    className="flex flex-col h-full min-h-0 items-center justify-center text-center"
                >
                    <h3 className="text-sm font-normal">Add Board</h3>
                    <p className="text-xs text-gray-400 mt-1">{availableBoardsLabel}</p>
                </div>

            </BoardCardWrapper>
        </>
    )
}