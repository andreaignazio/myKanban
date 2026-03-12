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
    flip?: boolean
    showEndRow?: boolean
}
export const MemberRow = ({ user, member, showRole = true, useDummyAvatar = true, avatarSize = 52, rowClassName, nameClassName, usernameClassName, children, showChildrenBeforeRole = false, endRowClassName, flip = false, showEndRow = true }: MemberRowProps) => {


    const resolvedEndRowClassName = endRowClassName ?? "flex flex-row items-center"



    return (
        <div
            style={{ height: avatarSize + 4 }}
            className={`group flex flex-row gap-3 items-center
            justify-between w-full
            h-[56px] p-[2px] rounded-full bg-neutral-500/20
            ${flip ? "ps-4" : "pr-4"}
            ${rowClassName ?? ""}`}>
            {flip
                ? (
                    <>
                        {showEndRow && <div className={`${resolvedEndRowClassName}`}>
                            {showChildrenBeforeRole && children}
                            {showRole && member && <UserRoleBadge role={member.Role as Role} />}
                            {!showChildrenBeforeRole && children}
                        </div>}
                        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                            <UserDescription user={user} nameClassName={nameClassName} usernameClassName={usernameClassName} flip={flip} />
                            <ResolvedAvatar user={user} useDummyAvatar={useDummyAvatar} avatarSize={avatarSize} />
                        </div>

                    </>
                ) : (
                    <>
                        <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
                            <ResolvedAvatar user={user} useDummyAvatar={useDummyAvatar} avatarSize={avatarSize} />
                            <UserDescription user={user} nameClassName={nameClassName} usernameClassName={usernameClassName} />
                        </div>
                        {showEndRow && <div className={`${resolvedEndRowClassName}`}>
                            {showChildrenBeforeRole && children}
                            {showRole && member && <UserRoleBadge role={member.Role as Role} />}
                            {!showChildrenBeforeRole && children}
                        </div>}
                    </>

                )}

        </div>
    )
}

type UserDescriptionProps = {
    user: User;
    nameClassName?: string;
    usernameClassName?: string;
    flip?: boolean;
}
const UserDescription = ({ user, nameClassName, usernameClassName, flip = false }: UserDescriptionProps) => {
    return (
        <div className={` col-span-1 flex flex-col text-nowrap gap-0  overflow-hidden ${flip ? "text-right col-start-1" : "text-left col-start-2 "}`}>
            <div className={`text-sm font-medium text-neutral-300 ${nameClassName ?? ""}`}>{user.Name}</div>
            <div className={`text-xs text-neutral-400/80 ${usernameClassName ?? ""}`}>@{user.Username}</div>
        </div>
    )

}
type ResolvedAvatarProps = {
    user: User;
    useDummyAvatar?: boolean;
    avatarSize?: number;
}
const ResolvedAvatar = ({ user, useDummyAvatar = true, avatarSize = 52 }: ResolvedAvatarProps) => {

    return (
        <>
            {useDummyAvatar && <UserAvatarDummy
                disableHoverEffect={true}
                user={user} size={avatarSize} />}
            {
                !useDummyAvatar && <UserAvatar
                    user={user}
                    size={avatarSize}
                />
            }
        </>
    )
}