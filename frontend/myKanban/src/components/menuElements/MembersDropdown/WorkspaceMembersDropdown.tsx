import { UniversalMembershipDropdown } from "./UniversalMembershipDropdown";
import type { CustomDropDownHandle } from "../CustomDropDown";
import { useEffect, useRef } from "react";
import { useWorkspaceActionRegistry } from "@/actionRegistry/workspaceActionRegistry";
import { useWsMembersStore } from "@/stores/wsMembersStore";
import { useShallow } from "zustand/shallow";

type WorkspaceMembersDropdownProps = {
    userId: string;
    workspaceID: string;
    isAdminOrOwner: boolean;
    isCurrentUser: boolean;
    style?: React.CSSProperties;
    className?: string;
    showChevron?: boolean;
    chevronClassName?: string;
}


export const WorkspaceMembersDropdown = ({ userId, workspaceID, isAdminOrOwner, isCurrentUser, style, className, showChevron, chevronClassName }: WorkspaceMembersDropdownProps) => {

    const workspaceActions = useWorkspaceActionRegistry();
    const roleDropdownRef = useRef<CustomDropDownHandle>(null);

    const member = useWsMembersStore(useShallow((state) => state.userWorkspacesByWorkspaceId[workspaceID]?.[userId]));

    const setMemberRole = (role: string) => {
        roleDropdownRef.current?.setActiveId(role.toLowerCase());
        workspaceActions.setWorkspaceMemberRole(workspaceID, userId, role.toLowerCase());
        // console.log(`Setting role ${role} for user ${user?.Name}`);
    }

    useEffect(() => {
        roleDropdownRef.current?.setActiveId((member?.Role ?? "Member").toLowerCase());
    }, [member?.Role])


    return (
        <UniversalMembershipDropdown ref={roleDropdownRef} userId={userId} isAdminOrOwner={isAdminOrOwner}
            isCurrentUser={isCurrentUser} setMemberRole={setMemberRole} style={style} className={className}
            showChevron={showChevron} chevronClassName={chevronClassName} />
    )
}