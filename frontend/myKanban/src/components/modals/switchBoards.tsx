import { forwardRef, use, useEffect, useRef, useState } from "react"
import { CommonMenuWrapper } from "../menuElements/menuWrapper"
import { BoardGrid, BoardGridFlat } from "../workspaceView/BoardGrid";
import { useBoardsStore } from "@/stores/boardsStore";
import { useAsyncRequest } from "@/hooks/useAsyncRequest";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { Workspace } from "@/stores/types";
import { ChevronDownIcon } from "lucide-react";
import { CustomInput } from "../menuElements/CustomInput";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useParams } from "react-router";
import { useFlatBoardsGrid } from "@/hooks/useFlatBoardsGrid";


type SwitchBoardsModalProps = {
    onClose: () => void;
}

export const SwitchBoardsModal = forwardRef<HTMLDivElement, SwitchBoardsModalProps>((props, ref) => {
    const fetchAllBoards = useBoardsStore((state) => state.fetchUserBoardsAndWorkspaces);
    const currentWorkspaceId = useParams().workspaceId as string
    const handleFetchAllBoards = async () => {
        await fetchAllBoards()
    }
    const boardsById = useBoardsStore((state) => state.boardsById)
    const [searchTerm, setSearchTerm] = useState("")
    const [isSearching, setIsSearching] = useState(false)

    useAsyncRequest("workspace:boards:fetch:all")

    useEffect(() => {
        void handleFetchAllBoards();
    }, [fetchAllBoards]);

    useEffect(() => {
        if (searchTerm.trim() === "") {
            setIsSearching(false)
        } else {
            setIsSearching(true)
        }
    }, [searchTerm])

    const workspaceIds = useWorkspaceStore((state) => state.workspaceIds)

    const filterFn = (boardId: string) => {
        const board = boardsById[boardId]
        return board?.Name.toLowerCase().includes(searchTerm.toLowerCase())
    }

    const sortFn = (a: string, b: string) => {
        const boardA = boardsById[a]
        const boardB = boardsById[b]
        return boardA.Name.localeCompare(boardB.Name)
    }


    const { sortedBoardIds, workspaceIdByBoardId } = useFlatBoardsGrid({ workspaceIds, filterFn, sortFn })

    return (
        <>
            <CommonMenuWrapper className="!bg-menu"
                style={{ width: "min(80vw, 800px)", height: "80vh", zIndex: 50 }} >
                <div className="flex flex-col w-full h-full px-8 pt-6">
                    <div className="w-full h-12 flex flex-row items-center ">
                        <span className="font-bold text-lg">Switch Boards</span>
                    </div>
                    <CustomInput
                        className="!min-h-12 mt-2"
                        focusColorClass="!ring-sky-200"
                        onInputChange={(input) => setSearchTerm(input?.current?.value ?? "")}
                        placeholder="Search boards...">

                    </CustomInput>
                    <div
                        style={{ opacity: isSearching ? 0 : 100, height: isSearching ? 0 : "auto", transition: "opacity 0.3s ease-in-out, height 0.3s ease-in-out" }}
                        className=" mt-2 py-2 px-1 w-full h-full overflow-auto scrollbar-hidden justify-center ">
                        {workspaceIds.map((id) => (
                            <WorkspaceBoards key={id} workspaceId={id} currentWorkspaceId={currentWorkspaceId} />
                        ))}
                    </div>
                    <div style={{ opacity: !isSearching ? 0 : 100, height: !isSearching ? 0 : "auto", transition: "opacity 0.3s ease-in-out, height 0.3s ease-in-out" }}
                        className="mt-2 py-2 px-1 w-full h-full 
                         overflow-auto scrollbar-hidden justify-center ">
                        <BoardGridFlat
                            className="grid-cols-1 pb-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3"
                            boardIds={sortedBoardIds} workspaceIdByBoardId={workspaceIdByBoardId} />
                    </div>


                </div>
            </CommonMenuWrapper>
            {createPortal(
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute h-screen w-screen inset-0  backdrop-blur-sm" />,
                document.body
            )}

        </>
    )
})

type WorkspaceBoardsProps = {
    workspaceId: string;
    currentWorkspaceId: string;
}

const WorkspaceBoards = ({ workspaceId, currentWorkspaceId }: WorkspaceBoardsProps) => {
    const workspacesById = useWorkspaceStore((state) => state.workspacesById)
    const workspace = workspacesById[workspaceId]
    const [folded, setFolded] = useState(true);
    const gridRef = useRef<HTMLDivElement | null>(null)
    const gridHeight = gridRef.current?.scrollHeight ?? 0

    useEffect(() => {
        if (currentWorkspaceId === workspaceId) {
            setFolded(false)
        } else {
            setFolded(true)
        }
    }, [currentWorkspaceId, workspaceId])



    return (
        <div key={workspaceId} className="flex flex-col w-full">
            <WorkspaceHeader
                onClick={() => setFolded((prev) => !prev)}
                workspace={workspace}
                isFolded={folded}
            />
            <div className="mt-3"
                style={{ height: folded ? 0 : gridHeight, opacity: folded ? 0 : 1, overflow: "hidden", transition: "height 0.3s ease-in-out, opacity 0.3s ease-in-out" }}>
                <BoardGrid ref={gridRef}
                    overrideClassName={true}
                    className="grid-cols-2 sm:grid-cols-2 pb-6 md:grid-cols-3 xl:grid-cols-3"
                    overrideWorkspaceId={workspaceId} />
            </div>

        </div>
    )
}

type WorkspaceHeaderProps = {
    workspace: Workspace
    onClick?: () => void
    isFolded?: boolean
}

const WorkspaceHeader = ({ workspace, onClick, isFolded }: WorkspaceHeaderProps) => {

    return (

        <div
            onClick={onClick}
            className={`w-full h-12 flex flex-row  items-center
            cursor-pointer 
            hover:bg-gray-400/30 rounded-md
            hover:ring-2 hover:ring-gray-100/90
            `}

        >
            <ChevronDownIcon size={22}
                className={`mr-2 transition-transform`}
                style={{ transform: `rotate(${isFolded ? -90 : 0}deg)` }} />
            <span className="font-medium text-md">{workspace?.Name}</span>
        </div>

    )
}