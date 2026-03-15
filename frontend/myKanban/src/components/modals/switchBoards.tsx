import { forwardRef, useEffect, useMemo, useRef, useState } from "react"
import { CommonMenuWrapper } from "../menuElements/menuWrapper"
import { BoardGrid, BoardGridFlat } from "../workspaceView/BoardGrid";
import { useBoardsStore } from "@/stores/boardsStore";
import { useAsyncRequest } from "@/hooks/useAsyncRequest";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { Workspace } from "@/stores/types";
import { ChevronDownIcon, LockKeyholeIcon } from "lucide-react";
import { CustomInput } from "../menuElements/CustomInput";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useParams } from "react-router";
import { useFlatBoardsGrid } from "@/hooks/useFlatBoardsGrid";
import { useWorkspaceRolesById } from "@/hooks/useWorkspaceRolesById";
import { UserRoleBadge, type Role } from "../badges/UserRoleBadge";

type VisibilityFilter = "all" | "private" | "non-private";


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
    const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all")
    function cycleFilter() {
        setVisibilityFilter((v) => v === "all" ? "private" : v === "private" ? "non-private" : "all")
    }

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
    const { rolesByWorkspaceId } = useWorkspaceRolesById(workspaceIds)

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
                    <div className="flex flex-row h-9 items-center gap-2 mt-2">
                        <CustomInput
                            className="!min-h-9 !h-full flex-1"
                            focusColorClass="!ring-sky-200"
                            onInputChange={(input) => setSearchTerm(input?.current?.value ?? "")}
                            placeholder="Search boards..." />
                        <button
                            onClick={cycleFilter}
                            className={`shrink-0 flex items-center gap-1.5 px-3 !h-full rounded-md text-xs font-medium transition-colors
                                ${visibilityFilter === "private"
                                    ? "bg-accent text-white"
                                    : visibilityFilter === "non-private"
                                        ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40"
                                        : "bg-menubtn hover:bg-menubtn-hover text-text/70"
                                }`}
                        >
                            <LockKeyholeIcon className="h-3.5 w-3.5" strokeWidth={2} />
                            {visibilityFilter === "all" ? "All" : visibilityFilter === "private" ? "Private" : "Non-private"}
                        </button>
                    </div>
                    <div
                        style={{ opacity: isSearching ? 0 : 100, height: isSearching ? 0 : "auto", transition: "opacity 0.3s ease-in-out, height 0.3s ease-in-out" }}
                        className=" mt-2 py-2 px-1 w-full h-full overflow-auto scrollbar-hidden justify-center ">
                        {workspaceIds.map((id) => {
                            const role = rolesByWorkspaceId[id]
                            return (
                                <WorkspaceBoards key={id} workspaceId={id} userWorkspaceRole={role} currentWorkspaceId={currentWorkspaceId} visibilityFilter={visibilityFilter} />
                            )
                        })}
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
    userWorkspaceRole?: Role | null | undefined;
    visibilityFilter: VisibilityFilter;
}

const WorkspaceBoards = ({ workspaceId, currentWorkspaceId, userWorkspaceRole, visibilityFilter }: WorkspaceBoardsProps) => {
    const workspacesById = useWorkspaceStore((state) => state.workspacesById)
    const workspace = workspacesById[workspaceId]
    const [folded, setFolded] = useState(true);
    const gridRef = useRef<HTMLDivElement | null>(null)
    const gridHeight = gridRef.current?.scrollHeight ?? 0
    const boardsById = useBoardsStore((state) => state.boardsById)

    useEffect(() => {
        if (currentWorkspaceId === workspaceId) {
            setFolded(false)
        } else {
            setFolded(true)
        }
    }, [currentWorkspaceId, workspaceId])

    const filterFn = useMemo(
        () => visibilityFilter === "all"
            ? undefined
            : visibilityFilter === "private"
                ? (boardId: string) => boardsById[boardId]?.Visibility === "private"
                : (boardId: string) => boardsById[boardId]?.Visibility !== "private",
        [visibilityFilter, boardsById],
    )

    return (
        <div key={workspaceId} className="flex flex-col w-full">
            <WorkspaceHeader
                onClick={() => setFolded((prev) => !prev)}
                workspace={workspace}
                isFolded={folded}
                role={userWorkspaceRole}
            />
            <div className="mt-3"
                style={{ height: folded ? 0 : gridHeight, opacity: folded ? 0 : 1, overflow: "hidden", transition: "height 0.3s ease-in-out, opacity 0.3s ease-in-out" }}>
                <BoardGrid ref={gridRef}
                    overrideClassName={true}
                    className="grid-cols-2 sm:grid-cols-2 pb-6 md:grid-cols-3 xl:grid-cols-3"
                    overrideWorkspaceId={workspaceId}
                    filterFn={filterFn} />
            </div>

        </div>
    )
}

type WorkspaceHeaderProps = {
    workspace: Workspace
    onClick?: () => void
    isFolded?: boolean
    role?: Role | null | undefined
}

const WorkspaceHeader = ({ workspace, onClick, isFolded, role }: WorkspaceHeaderProps) => {

    const shouldShowRoleBadge = role && (role === "admin" || role === "owner")
    return (

        <div
            onClick={onClick}
            className={`group w-full h-12 flex flex-row  items-center justify-between pe-3
            cursor-pointer transition-all duration-300 ease-in-out
            [&:hover:not(:has(.no-row-hover:hover))]:bg-gray-400/20 rounded-md
            [&:hover:not(:has(.no-row-hover:hover))]:ring-2 [&:hover:not(:has(.no-row-hover:hover))]:ring-gray-100/90
            `}

        >
            <div className="flex flex-row items-center justify-start">
                <ChevronDownIcon size={22}
                    className={`mr-2 transition-transform`}
                    style={{ transform: `rotate(${isFolded ? -90 : 0}deg)` }} />
                <span className="font-medium text-md">{workspace?.Name}</span>
            </div>
            <div className="flex flex-row items-center justify-start">
                {shouldShowRoleBadge && <UserRoleBadge role={role} className={`${isFolded ? "opacity-30" : "opacity-100"} ms-2 !rounded-md  `} />}
            </div>
        </div>

    )
}