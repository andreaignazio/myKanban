import { UserHeaderCard } from "@/pages/User/UserHeaderCard";
import { useUiStore } from "@/stores/uiStore";
import { useUserStore } from "@/stores/userStore";
import { forwardRef, useEffect, useState } from "react";
import { ImageColorRenderer } from "../menuElements/ImageColorRenderer";
import { UserAvatar } from "../badges/UserAvatar";
import { useCoverDerivedColors } from "@/hooks/useCoverDerivedColors";
import { gradientColorTokens } from "@/domain/colorTokens";
import { UserAvatarDummy } from "../badges/UserAvatarDummy";
import { useParams } from "react-router-dom";

type UserHoverCardProps = {
    userID: string
    workspaceID?: string
}

export const UserHoverCard = forwardRef<HTMLDivElement, UserHoverCardProps>((props, ref) => {
    const { userID, workspaceID } = props;
    const user = useUserStore((state) => state.getUserByID(userID)) ?? null;
    const [visible, setVisible] = useState(false);

    const coverType = user?.Props?.Cover?.Type;
    const coverImage = coverType === "image"
        ? (user?.Props?.Cover?.Url ?? undefined)
        : (coverType ? undefined : (user?.Props?.Cover?.Url ?? undefined));
    const coverColor = coverType === "color"
        ? (user?.Props?.Cover?.Color ?? undefined)
        : (coverType ? undefined : (user?.Props?.Cover?.Color ?? undefined));


    const { footerBackgroundColor, avatarRingColor } = useCoverDerivedColors({
        coverClassName: coverColor,
        coverImageUrl: coverImage,
        contrast: 0.1,
    });

    useEffect(() => {
        const id = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(id);
    }, []);

    const setUserActivityOverlayOpen = useUiStore((state) => state.setUserActivityOverlayOpen)
    const currentRouteParams = useUiStore((state) => state.currentRouteParams)
    const workspaceIdFromParams = useParams().workspaceId as string | undefined
    const handleViewActivities = () => {
        const resolvedWorkspaceID = workspaceID ?? workspaceIdFromParams ?? currentRouteParams.workspaceId
        setUserActivityOverlayOpen(true, {
            userID,
            workspaceID: resolvedWorkspaceID,
        })
    }


    return (

        <div ref={ref}
            className={`w-[290px]  bg-transparent rounded-2xl shadow-md transition-opacity duration-150 
                ${visible ? "opacity-100 animate-fade-in" : "opacity-0"
                }`}>

            <div className="flex relative flex-col w-full items-center 
            rounded-xl overflow-hidden gap-0 mt-0">


                <ImageColorRenderer
                    className="w-full h-20 relative flex flex-col"
                    overrideClassName={true}
                    bgImage={coverImage}
                    bgColor={coverColor}
                    fallbackGradient={gradientColorTokens[0]}
                    backgroundType={coverType ?? (coverImage ? "image" : coverColor ? "color" : undefined)}
                >
                    <div className="absolute inset-0 bg-black/30" />

                    <div className="absolute -bottom-6 left-3
                        items-center justify-center flex flex-row
                         text-white text-2xl font-bold 
                        
                          border-neutral-800" >


                        <UserAvatarDummy
                            disableHoverEffect={true}
                            darkenOnHover={false}
                            user={user ?? undefined} size={80} />


                    </div>
                    <div className="absolute right-4 bottom-2 flex flex-col gap-0 items-start text-neutral-200">
                        <span className="font-semibold tracking-wide text-md">{user?.Name}</span>
                        <p className="font-light -mt-1 text-xs text-text/70">
                            @{user?.Username === "" ? "username" : user?.Username}</p>
                    </div>



                </ImageColorRenderer>
                <div className="w-full h-[76px] flex flex-col justify-end bg-neutral-800"  >
                    <div className="text-neutral-300 font-inter
                     font-medium text-sm mb-4 py-1 px-3 cursor-pointer
                        hover:bg-black/10" onClick={handleViewActivities}> View activities</div>

                </div>



            </div >

        </div >
    );
});
