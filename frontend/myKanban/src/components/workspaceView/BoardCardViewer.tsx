type BoardRowProps = {
    workspaceId: string


}
import { BoardCardWrapper } from "./BoardCardWrapper";

import { useRef } from "react";

//import { useWorkspaceStore } from "@/stores/workspaceStore";

export function BoardCardViewer({ workspaceId }: BoardRowProps) {
    const anchorRef = useRef<HTMLDivElement>(null)
    // const getMaxBoardsByWorkspaceId = useWorkspaceStore((state) => state.getMaxBoardsByWorkspaceId);
    //const [availableBoards, maxBoards] = getMaxBoardsByWorkspaceId(workspaceId);





    return (
        <>
            <BoardCardWrapper
                className="bg-menusec"
            >
                <div
                    className="absolute transition-all ease-in-out duration-300
                    inset-0 z-10 hover:bg-black/0 cursor-default" />
                <div
                    ref={anchorRef}
                    className="flex flex-col h-full min-h-0 items-center justify-center text-center"
                >
                    <h3 className="text-sm font-normal">As a viewer you cannot directly create boards</h3>

                </div>

            </BoardCardWrapper>
        </>
    )
}