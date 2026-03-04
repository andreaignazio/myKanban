import type { User, UserBoard, UserWorkspace } from "@/stores/types";
import { MemberRow } from "./MemberRow";
import { useUserStore } from "@/stores/userStore";

type MemberListProps = {
    members?: UserWorkspace[] | UserBoard[];
}

export const MembersList = ({ members }: MemberListProps) => {
    const userById = useUserStore(state => state.usersById)

    return (
        <>
            {members && members.length > 0 ? (
                members.map((member) => {
                    const user = userById[member.UserID]
                    return (
                        <MemberRow key={member.UserID} user={user as User} member={member} />
                    )
                })
            ) : (
                <div className="text-sm text-neutral-900/80">No members found</div>
            )}
        </>
    )

}