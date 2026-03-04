import { UserAvatar } from "@/components/badges/UserAvatar"
import { ImageColorSelector } from "@/components/menuElements/ImageColorSelector"
import { CommonMenuWrapper } from "@/components/menuElements/menuWrapper"
import { forwardRef, use, useEffect, useState, type RefObject } from "react";
import { gradientColorTokens, type ColorToken } from "@/domain/colorTokens";
import { useAuthStore } from "@/stores/auth";
import { CustomInput } from "@/components/menuElements/CustomInput";
import { SubmitFooter } from "@/components/menuElements/submitFooter";
import { useUserActionRegistry } from "@/actionRegistry/userActionRegistry";
import type { UserProps } from "@/stores/usertypes";
import { useImageOrColorSelector } from "@/hooks/UseImageOrColorSelector";

type UserAvatarEditorProps = {
    userID: string;
    onClose: () => void;
}

export const UserAvatarEditor = forwardRef<HTMLDivElement, UserAvatarEditorProps>(({ userID, onClose }, ref) => {

    const { selectedColor, handleSetColor, selectedImage, handleSetImage } = useImageOrColorSelector();
    const [selectedInitials, setSelectedInitials] = useState<string | null>(null);

    const userActions = useUserActionRegistry();
    const user = useAuthStore((state) => state.user || undefined);

    useEffect(() => {
        if (user) {
            setSelectedInitials(user.Props.Initials ?? null);
            if (user.Props.Avatar?.Type === "color" && user.Props.Avatar?.Color) {
                handleSetColor({ className: user.Props.Avatar.Color } as ColorToken);
            } else if (user.Props.Avatar?.Type === "image" && user.Props.Avatar?.Url) {
                handleSetImage(user.Props.Avatar.Url);
            } else if (user.Props.Avatar?.Color) {
                handleSetColor({ className: user.Props.Avatar.Color } as ColorToken);
            } else if (user.Props.Avatar?.Url) {
                handleSetImage(user.Props.Avatar.Url);
            }

        }
    }, [user]);



    const handleSubmit = () => {

        const props: UserProps = {
            Avatar: {
                Type: selectedImage ? "image" : selectedColor ? "color" : undefined,
                Color: selectedColor?.className,
                Url: selectedImage ?? (selectedColor ? null : undefined),
            },
            Initials: selectedInitials ?? undefined

        }
        console.log("Submitting avatar update with props:", props);
        userActions.updateMyAvatarProps(props);
        onClose();
    }

    const visibleColorTokens = gradientColorTokens.filter((token, index) => index < 6)
    return (
        <CommonMenuWrapper
            ref={ref}

        >
            <div className="flex items-center justify-center w-[400px] flex-col gap-4 p-4 px-8">
                <span className="text-lg text-left w-full font-semibold text-neutral-300">Edit Avatar</span>
                <div className="grid grid-cols-[120px_1fr] gap-2 items-center w-full ">
                    <UserAvatar
                        overrideMode={true}
                        imageOverride={selectedImage ?? undefined}
                        colorOverride={selectedColor?.className ?? undefined}
                        initialsOverride={selectedInitials ?? undefined}
                        user={user} size={110} />
                    <div className="flex flex-col w-full ">
                        <span className="text-sm font-medium font-grotesk text-neutral-400 mb-1">Background color</span>
                        <ImageColorSelector
                            selectedColor={selectedColor}
                            handleSetColor={handleSetColor}
                            selectedImage={selectedImage}
                            handleSetImage={handleSetImage}
                            colorArray={visibleColorTokens}
                            tokenClassName="!h-full !aspect-square !gap-0"
                            gridClassName="grid !grid-cols-7"
                        />
                        <span className="text-sm font-medium !font-grotesk text-neutral-400 mt-2 mb-1">
                            Initials</span>
                        <CustomInput
                            className=" !h-10 !text-neutral-200"
                            placeholder="Enter up to 3 initials..."
                            value={selectedInitials ?? ""}
                            onInputChange={(ref) => {
                                if (ref?.current) {
                                    const value = ref.current.value.toUpperCase().slice(0, 3);
                                    setSelectedInitials(value);
                                }
                            }} />
                    </div>
                </div>
                <span className="text-xs text-neutral-500 mt-2">* Changes to your avatar will be visible across all your boards.</span>

                <SubmitFooter
                    buttonsClassName="!px-6 !rounded"
                    className="!w-full justify-end" flipButtons={true}
                    show={true} onCancel={onClose} onSubmit={handleSubmit} />
            </div>

        </CommonMenuWrapper>
    )
})