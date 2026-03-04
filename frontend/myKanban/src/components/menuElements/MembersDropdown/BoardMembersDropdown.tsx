import { useBoardActionRegistry } from "@/actionRegistry/boardActionRegistry";
import { UniversalMembershipDropdown } from "./UniversalMembershipDropdown";
import type { CustomDropDownHandle } from "../CustomDropDown";
import { useEffect, useRef } from "react";
import { useBoardMembersStore } from "@/stores/boardMembersStore";

type BoardMembersDropdownProps = {
    userId: string;
    boardID: string;
    isAdminOrOwner: boolean;
    isCurrentUser: boolean;
    style?: React.CSSProperties;
    className?: string;
}


export const BoardMembersDropdown = ({ userId, boardID, isAdminOrOwner, isCurrentUser, style, className }: BoardMembersDropdownProps) => {

    const boardActions = useBoardActionRegistry();
    const roleDropdownRef = useRef<CustomDropDownHandle>(null);
    const member = useBoardMembersStore((state) => state.membersById[userId]);
    const setMemberRole = (role: string) => {
        roleDropdownRef.current?.setActiveId(role.toLowerCase());
        boardActions.setBoardMemberRole(boardID, userId, role.toLowerCase());
        // console.log(`Setting role ${role} for user ${user?.Name}`);
    }

    useEffect(() => {
        roleDropdownRef.current?.setActiveId((member?.Role ?? "Member").toLowerCase());
    }, [member?.Role])



    return (
        <UniversalMembershipDropdown ref={roleDropdownRef} userId={userId} isAdminOrOwner={isAdminOrOwner}
            isCurrentUser={isCurrentUser} setMemberRole={setMemberRole} style={style} className={className}
            ownerLikeWhenLocked={true}
            lockCurrentUser={false}
            currentRole={(member?.Role ?? "").toLowerCase()} />
    )
}