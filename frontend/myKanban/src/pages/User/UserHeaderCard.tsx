import { UserAvatar } from "@/components/badges/UserAvatar";
import { EntityHeaderCard } from "@/components/headerCards/EntityHeaderCard";
import { CardRowMenuBtn } from "@/components/cardMenus/cardRowMenus";
import { ButtonHoverInset } from "@/components/menuElements/buttonHoverInset";
import { useCoverDerivedColors } from "@/hooks/useCoverDerivedColors";
import type { User } from "@/stores/usertypes";
import { UserAvatarEditor } from "./userAvatarEditor";
import { UserCoverEditor } from "./userCoverEditor";

type UserHeaderCardProps = {
    user: User | undefined;
    children?: React.ReactNode;
}

export const UserHeaderCard = ({ user, children }: UserHeaderCardProps) => {
    const coverType = user?.Props?.Cover?.Type;
    const coverImage = coverType === "image"
        ? (user?.Props?.Cover?.Url ?? undefined)
        : (coverType ? undefined : (user?.Props?.Cover?.Url ?? undefined));
    const coverColor = coverType === "color"
        ? (user?.Props?.Cover?.Color ?? undefined)
        : (coverType ? undefined : (user?.Props?.Cover?.Color ?? undefined));

    const { avatarRingColor } = useCoverDerivedColors({
        coverClassName: coverColor,
        coverImageUrl: coverImage,
        contrast: 0.9,
    });

    return (
        <EntityHeaderCard
            type="user"
            coverType={coverType}
            coverImage={coverImage}
            coverColor={coverColor}
            footer={children}
            footerClassName=""
            coverAction={
                <CardRowMenuBtn
                    className=""
                    customId="user-cover-editor"
                    menuComponent={({ ref, onClose }) => <UserCoverEditor ref={ref} userID={user?.ID ?? ""} onClose={onClose} />}
                >
                    <ButtonHoverInset onClick={() => { }} />
                </CardRowMenuBtn>
            }
        >
            <CardRowMenuBtn
                cardID="user-avatar"
                menuComponent={({ ref, onClose }) => <UserAvatarEditor ref={ref} userID={user?.ID ?? ""} onClose={onClose} />}
            >
                <div className="rounded-full p-1" style={{ backgroundColor: avatarRingColor }}>
                    <UserAvatar showEditHover={true} darkenOnHover={true} user={user} size={110} />
                </div>
            </CardRowMenuBtn>
        </EntityHeaderCard>
    )
}
