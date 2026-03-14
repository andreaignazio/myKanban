import { forwardRef, useEffect } from "react";
import { useBoardsStore } from "@/stores/boardsStore";
import { useBoardBackground } from "@/hooks/useBoardBackground";
import { useBoardMembersStore, boardMemberKey } from "@/stores/boardMembersStore";
import { MembersList } from "../common/MemberList";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useDateTimeParser } from "@/hooks/useDateTimeParser";
import { useWorkspaceDerivedProps } from "@/hooks/useWorkspaceDerivedProps";
import { useBoardDescription } from "@/hooks/useBoardDescription";
import { EntityHoverCard } from "./EntityHoverCard";
import { useCacheStore } from "@/stores/cacheStore";
import { useShallow } from "zustand/shallow";


type BoardHoverCardProps = {
    boardID: string;
    onClose?: () => void;
}
export const BoardHoverCard = forwardRef<HTMLDivElement, BoardHoverCardProps>(({ boardID, onClose }, ref) => {
    const boardById = useBoardsStore(state => state.boardsById)

    const cachedBoardById = useCacheStore(state => state.offerBoardById)

    const board = boardById[boardID] ?? cachedBoardById[boardID]
    const { backgroundColorClassName, backgroundImageUrl, backgroundType } = useBoardBackground({ board })

    const getCachedBoardMembers = useCacheStore(state => state.getBoardMembers)

    const fetchBoardMembers = useBoardMembersStore(state => state.fetchBoardMembers)
    const cachedMembers = getCachedBoardMembers(boardID)
    const hasCachedMembers = !!cachedMembers?.length

    useEffect(() => {
        if (boardID && !hasCachedMembers) {
            fetchBoardMembers(boardID).catch((error) => {
                console.error("Error fetching board members:", error);
            })
        }
    }, [boardID, hasCachedMembers, fetchBoardMembers])

    const membersById = useBoardMembersStore(state => state.membersById)
    const membersIds = useBoardMembersStore(useShallow(state => state.membersIdsByBoardId[boardID])) || []

    const members = cachedMembers ?? (membersIds?.map(memberId => membersById[boardMemberKey(boardID, memberId)]) || [])

    const workspaceId = board?.WorkspaceID
    const workspaceById = useWorkspaceStore(state => state.workspacesById)
    const subscriptionsByWorkspaceId = useWorkspaceStore(state => state.wSubscriptionsById)
    const workspace = workspaceById[workspaceId ?? ""]
    const workspacePlan = workspaceId ? subscriptionsByWorkspaceId[workspaceId]?.Plan ?? "free" : undefined
    const workpaceDateCreated = useDateTimeParser().stringifyDatePretty(workspace?.CreatedAt ? new Date(workspace.CreatedAt) : undefined)?.date
    const { avatarProps } = useWorkspaceDerivedProps("", workspace)
    const iconId = avatarProps.iconId

    const boardCreatedAt = useDateTimeParser().stringifyDatePretty(board?.CreatedAt ? new Date(board.CreatedAt) : undefined)?.date


    const boardDescription = useBoardDescription({ boardID })
    return (
        <EntityHoverCard
            ref={ref}
            onClose={onClose}
            entityCreatedAt={boardCreatedAt}
            iconId={iconId}
            entityName={board?.Name}
            description={boardDescription}
            plan={workspacePlan}
            coverType={backgroundType}
            coverColor={backgroundColorClassName}
            coverImage={backgroundImageUrl}
            headerInRowChilden={workspace ?
                <div className="flex flex-col">
                    <span className="text-sm text-neutral-800/80 font-medium">
                        {workspace.Name}
                    </span>
                    <span className="text-xs text-neutral-400/80">{workpaceDateCreated}</span>
                </div>
                : undefined}
            detailsChildren={
                <>
                    <h3 className="text-sm font-semibold">{board?.Name}</h3>
                    <span className="text-xs text-neutral-400/80">{members.length} {members.length === 1 ? "member" : "members"}</span>
                    <div className="h-px w-full bg-neutral-300/10" />
                    <div className="flex-1 flex flex-col overflow-y-auto gap-2 scrollbar-hidden">
                        <MembersList members={members} />
                    </div>
                </>
            }
        />
    )
})

