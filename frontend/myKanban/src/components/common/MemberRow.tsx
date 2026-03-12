import type { User, UserBoard, UserWorkspace } from "@/stores/types"
import { UserAvatarDummy } from "../badges/UserAvatarDummy"
import { UserRoleBadge, type Role } from "../badges/UserRoleBadge"
import { UserAvatar } from "../badges/UserAvatar"
import { AnimatePresence, motion } from "motion/react"

const COMPACT_TRANSITION_MS = 0.5
const COMPACT_FADE_MS = 0.18

type MemberRowProps = {
    onClick?: () => void
    onClickCapture?: () => void
    user?: User
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
    compact?: boolean
}
export const MemberRow = ({ onClick, onClickCapture, user, member, showRole = true, useDummyAvatar = true, avatarSize = 52, rowClassName, nameClassName, usernameClassName, children, showChildrenBeforeRole = false, endRowClassName, flip = false, showEndRow = true, compact = false }: MemberRowProps) => {


    const resolvedEndRowClassName = endRowClassName ?? "flex flex-row items-center"



    return (
        <motion.div
            onClick={onClick}
            onClickCapture={onClickCapture}
            style={{ height: avatarSize + 4, minWidth: avatarSize + 4 }}
            className={`group flex flex-row items-center w-full h-[56px] rounded-full bg-neutral-500/20 ${rowClassName ?? ""}`}
            animate={{
                paddingTop: "2px",
                paddingBottom: "2px",
                paddingLeft: compact ? "2px" : (flip ? "16px" : "2px"),
                paddingRight: compact ? "2px" : (flip ? "2px" : "16px"),
                gap: compact ? "0px" : "12px",
                justifyContent: compact ? "center" : "space-between",
            }}
            transition={{ duration: COMPACT_TRANSITION_MS, ease: "easeInOut" }}
        >
            {flip
                ? (
                    <>
                        {showEndRow && <div className={`${resolvedEndRowClassName}`}>
                            {showChildrenBeforeRole && children}
                            {showRole && member && <UserRoleBadge role={member.Role as Role} />}
                            {!showChildrenBeforeRole && children}
                        </div>}
                        <div className={`grid grid-cols-[1fr_auto]
                             ${compact ? "gap-0" : "gap-2"} items-center`}>
                            <UserDescription user={user} nameClassName={nameClassName} usernameClassName={usernameClassName} flip={flip} compact={compact} />
                            <ResolvedAvatar user={user} useDummyAvatar={useDummyAvatar} avatarSize={avatarSize} />
                        </div>

                    </>
                ) : (
                    <>
                        <div className={`grid grid-cols-[auto_1fr] ${compact ? "gap-0" : "gap-2"} items-center`}>
                            <ResolvedAvatar user={user} useDummyAvatar={useDummyAvatar} avatarSize={avatarSize} />
                            <UserDescription user={user} nameClassName={nameClassName} usernameClassName={usernameClassName} compact={compact} />
                        </div>
                        {showEndRow && <div className={`${resolvedEndRowClassName}`}>
                            {showChildrenBeforeRole && children}
                            {showRole && member && <UserRoleBadge role={member.Role as Role} />}
                            {!showChildrenBeforeRole && children}
                        </div>}
                    </>

                )}

        </motion.div>
    )
}

type UserDescriptionProps = {
    user?: User;
    nameClassName?: string;
    usernameClassName?: string;
    flip?: boolean;
    compact?: boolean;
}
const UserDescription = ({ user, nameClassName, usernameClassName, flip = false, compact = false }: UserDescriptionProps) => {

    return (
        <AnimatePresence initial={false}>
            {!compact && (
                <motion.div
                    key="desc"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{
                        opacity: 1, width: "auto",
                        transition: {
                            width: { duration: COMPACT_TRANSITION_MS, ease: "easeInOut" },
                            opacity: { duration: COMPACT_FADE_MS, ease: "easeInOut", delay: COMPACT_TRANSITION_MS * 0.6 },
                        }
                    }}
                    exit={{
                        opacity: 0, width: 0,
                        transition: {
                            opacity: { duration: COMPACT_FADE_MS, ease: "easeInOut" },
                            width: { duration: COMPACT_TRANSITION_MS, ease: "easeInOut", delay: COMPACT_FADE_MS * 0.1 },
                        }
                    }}
                    style={{ overflow: "hidden", whiteSpace: "nowrap" }}
                    className={`col-span-1 flex flex-col gap-0 ${flip ? "text-right col-start-1" : "text-left col-start-2"}`}
                >
                    <div className={`text-sm font-medium text-neutral-300 ${nameClassName ?? ""}`}>{user?.Name}</div>
                    <div className={`text-xs text-neutral-400/80 ${usernameClassName ?? ""}`}>@{user?.Username}</div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
type ResolvedAvatarProps = {
    user?: User;
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