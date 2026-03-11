type BoardRowProps = {
    workspaceId: string


}
import { BoardCardWrapper } from "./BoardCardWrapper";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { useRef } from "react";
import { CreateBoardModal } from "../modals/CreateBoardModal";

export function BoardCardAdd({ workspaceId }: BoardRowProps) {
    const onOpenOverlay = useOverlayStore((state) => state.open)
    const closeOverlay = useOverlayStore((state) => state.close)
    const createPanelRef = useRef<HTMLDivElement>(null)
    const anchorRef = useRef<HTMLDivElement>(null)

    function handleOpenCreateWizard() {

        const id = "create-board-modal"
        const descriptor: OverlayDescriptor = {
            id: "create-board-modal",
            render: () => <CreateBoardModal ref={createPanelRef} onClose={() => closeOverlay(id)} workspaceId={workspaceId} />,
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



    return (
        <>
            <BoardCardWrapper>
                <div onClickCapture={() => handleOpenCreateWizard()}
                    className="absolute inset-0 z-10 hover:bg-black/20 cursor-pointer" />
                <div
                    ref={anchorRef}

                    className="flex h-full min-h-0 items-center justify-center text-center"
                >
                    <h3 className="text-sm font-normal">Add Board</h3>
                </div>

            </BoardCardWrapper>
        </>
    )
}