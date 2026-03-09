import type { User, UserBoard, UserWorkspace } from "@/stores/types"
import { UserAvatarDummy } from "../badges/UserAvatarDummy"
import { UserRoleBadge, type Role } from "../badges/UserRoleBadge"
import { UserAvatar } from "../badges/UserAvatar"

type MemberRowProps = {
    user: User
    member?: UserWorkspace | UserBoard
    showRole?: boolean
    useDummyAvatar?: boolean
    avatarSize?: number
    rowClassName?: string
    nameClassName?: string
    usernameClassName?: string
    children?: React.ReactNode
    showChildrenBeforeRole?: boolean
    endRowClassName?: string
}
export const MemberRow = ({ user, member, showRole = true, useDummyAvatar = true, avatarSize = 52, rowClassName, nameClassName, usernameClassName, children, showChildrenBeforeRole = false, endRowClassName }: MemberRowProps) => {


    const resolvedEndRowClassName = endRowClassName ?? "flex flex-row items-center"
    return (
        <div className={`group flex flex-row gap-3 items-center
            justify-between w-full
            h-[56px] p-[2px] rounded-full bg-neutral-500/20
            pr-4
            ${rowClassName ?? ""}`}>
            <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
                {useDummyAvatar && <UserAvatarDummy
                    disableHoverEffect={true}
                    user={user} size={avatarSize} />}
                {!useDummyAvatar && <UserAvatar
                    user={user}
                    size={avatarSize}
                />}
                <div className=" col-start-2 col-span-1 flex flex-col text-nowrap gap-0  overflow-hidden">
                    <div className={`text-sm font-medium text-neutral-300 ${nameClassName ?? ""}`}>{user.Name}</div>
                    <div className={`text-xs text-neutral-400/80 ${usernameClassName ?? ""}`}>@{user.Username}</div>
                </div>

            </div>
            <div className={`${resolvedEndRowClassName}`}>
                {showChildrenBeforeRole && children}
                {showRole && member && <UserRoleBadge role={member.Role as Role} />}
                {!showChildrenBeforeRole && children}

            </div>


        </div>
    )
}