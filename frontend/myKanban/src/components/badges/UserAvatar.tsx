import { CardRowMenuBtn } from "../cardMenus/cardRowMenus";
import { UserHoverCard } from "../modals/UserHoverCard";
import { UserAvatarDummy } from "./UserAvatarDummy";
import type { UserAvatarDummyProps } from "./UserAvatarDummy";

export type UserAvatarProps = UserAvatarDummyProps & {


}


export function UserAvatar({ user, className, size, overrideMode, colorOverride, imageOverride, initialsOverride, darkenOnHover, showEditHover }: UserAvatarProps) {

    return (

        <CardRowMenuBtn
            menuComponent={({ ref, onClose }) => <UserHoverCard ref={ref} userID={user?.ID ?? ""} />}
            exclusiveGroup="user-hover-card"
            desiredBackdropOpacity={0.1}
            offset={[10, 0]}
        >
            <UserAvatarDummy
                user={user}
                className={className}
                size={size}
                overrideMode={overrideMode}
                colorOverride={colorOverride}
                imageOverride={imageOverride}
                initialsOverride={initialsOverride}
                darkenOnHover={darkenOnHover}
                showEditHover={showEditHover}
            />
        </CardRowMenuBtn>

    )
}


