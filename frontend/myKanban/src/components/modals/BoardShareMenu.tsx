import { BaseBtn } from "@/pages/BoardView";

import type { OverlayDescriptor } from "@/overlays/overlayStore";
import { useOverlayStore } from "@/overlays/overlayStore";
import { useParams } from "react-router-dom";
import { useRef } from "react";
import { UserPlus } from "lucide-react";
import { BoardShareModal } from "./BoardShareModal";


type BoardShareMenuProps = {
    className?: string;
}
export const BoardShareMenu = ({ className }: BoardShareMenuProps) => {
    const openOverlay = useOverlayStore((state) => state.open);
    const onMenuClose = useOverlayStore((state) => state.close);
    const boardID = useParams().boardId as string;

    const shareBoardMenu = useRef<HTMLDivElement>(null)
    function handleOpenShareBoardMenu() {
        // console.log("Opening respond modal for share offer");
        const id = "shareBoardModal";
        const descriptor: OverlayDescriptor = {
            id,
            render: () => <BoardShareModal ref={shareBoardMenu}
                onClose={() => onMenuClose(id)}
                targetID={boardID}
                style={{ width: "680px" }}
            />,
            panelRef: shareBoardMenu,
            type: "modal",
            renderType: "virtual",
            exclusiveGroup: "board-view-modals",
            opts: {
                closeOnMouseLeave: false,
                closeOnClickOutside: true,
                closeOnEscape: true,
                lockBackdrop: true,
            },
            position: {
                virtual: "viewport-center"
            }
        }
        openOverlay(descriptor);

    }
    return (
        <BaseBtn className={`bg-blue-950 text-white mx-2 ${className}`} label="Share"
            labelClassName="font-manrope text-niherit" onClick={handleOpenShareBoardMenu}>
            <UserPlus className="w-4 h-4 text-inherit " />
        </BaseBtn>
    )
}
