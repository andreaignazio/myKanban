import { forwardRef } from "react";
import { CustomDropDown, type CustomDropDownHandle, type MenuItem } from "../CustomDropDown"

type UniversalMembershipDropdownProps = {
    userId: string;
    isAdminOrOwner: boolean;
    isCurrentUser: boolean;
    currentRole?: string;
    setMemberRole?: (role: string) => void;
    style?: React.CSSProperties;
    className?: string;
    showChevron?: boolean;
    chevronClassName?: string;
    ownerLikeWhenLocked?: boolean;
    lockCurrentUser?: boolean;
}



export const UniversalMembershipDropdown = forwardRef<CustomDropDownHandle, UniversalMembershipDropdownProps>(({
    userId, isAdminOrOwner, isCurrentUser, currentRole, setMemberRole, style, className, showChevron = true, chevronClassName, ownerLikeWhenLocked = false, lockCurrentUser = true }: UniversalMembershipDropdownProps, ref) => {

    const isOwnerRole = currentRole === "owner";
    const shouldShowOwner = isOwnerRole;

    const roles: MenuItem[] = [
        ...(shouldShowOwner ? [{ id: "owner", label: "Owner", onClick: () => setMemberRole?.("Owner"), disabled: true }] : []),
        { id: "admin", label: "Admin", onClick: () => setMemberRole?.("Admin") },
        { id: "member", label: "Member", onClick: () => setMemberRole?.("Member") },
        { id: "viewer", label: "Viewer", onClick: () => setMemberRole?.("Viewer") },
    ]



    const lockRoleSelector = !isAdminOrOwner || (lockCurrentUser && isCurrentUser) || isOwnerRole;
    const useOwnerLikeVisualStyle = isOwnerRole || (ownerLikeWhenLocked && !isAdminOrOwner);
    const resolvedShowChevron = showChevron && !useOwnerLikeVisualStyle;
    const resolvedClassName = `${className ?? ""} text-[rgba(255, 255, 255, 0.5)] ${useOwnerLikeVisualStyle ? "opacity-60" : ""}`;

    return (
        <CustomDropDown disableGlobalState={true} ref={ref} isLocked={lockRoleSelector}
            items={roles} btnId={"member-role-selector-dropdown-" + userId}
            className={resolvedClassName}
            style={{


                borderColor: useOwnerLikeVisualStyle ? "transparent" : "rgba(200, 200, 200, 0.2)",
                justifyContent: "space-between",
                maxWidth: "120px",
                ...style,
            }}
            placeholderCustom="Select role"

            showChevron={resolvedShowChevron}
            chevronClassName={chevronClassName + " ml-[4px] h-4 aspect-square"} >

        </CustomDropDown>
    )

})