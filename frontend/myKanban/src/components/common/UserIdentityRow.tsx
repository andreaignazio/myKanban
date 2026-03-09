import type { AnyUser, User } from "@/stores/usertypes"
import { UserAvatar } from "../badges/UserAvatar"


type UserIdentityRowProps = {
    user: AnyUser
}

export const UserIdentityRow = ({ user }: UserIdentityRowProps) => {
    return (
        <div className="flex flex-row items-center gap-3 h-full ">
            <UserAvatar user={user} size={42} />
            <div className="flex flex-col min-h-14 items-start justify-center  ">
                <p className="font-bold text-sm">{user?.Name}</p>
                <p className="text-xs text-gray-500">@{user?.Username === "" ? "username" : user?.Username}</p>
            </div>
        </div>
    )
}

export function UserIdentityRowSkeleton() {
    return (
        <div className="flex flex-row items-center gap-3 h-full ">
            <div className="rounded-full bg-neutral-300 animate-pulse h-10 w-10" />
            <div className="flex flex-col min-h-14 items-start justify-center  ">
                <div className="h-4 w-24 rounded-md bg-neutral-300 animate-pulse mb-1" />
                <div className="h-3 w-20 rounded-md bg-neutral-300 animate-pulse" />
            </div>
        </div>
    )
}