import type { User, UserBoard, UserWorkspace } from "@/stores/types";
import { MemberRow } from "./MemberRow";
import { useUserStore } from "@/stores/userStore";

type MemberListProps = {
    members?: UserWorkspace[] | UserBoard[];
    showPresence?: boolean;
    presenceByUserId?: Record<string, boolean>;
    filterFn?: (member: UserWorkspace | UserBoard) => boolean;
}

export const MembersList = ({ members, showPresence, presenceByUserId, filterFn }: MemberListProps) => {
    const userById = useUserStore(state => state.usersById)

    const visibleMembers = filterFn ? members?.filter(filterFn) : members

    return (
        <>
            {visibleMembers && visibleMembers.length > 0 ? (
                visibleMembers.map((member) => {
                    const user = userById[member?.UserID]
                    return (
                        <MemberRow key={member?.UserID} user={user as User} member={member} showPresence={showPresence} presence={showPresence && presenceByUserId?.[member?.UserID]} />
                    )
                })
            ) : (
                <div className="text-sm text-neutral-900/80">No members found</div>
            )}
        </>
    )
}