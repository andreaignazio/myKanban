import { ImageColorSelector } from "@/components/menuElements/ImageColorSelector"
import { CommonMenuWrapper } from "@/components/menuElements/menuWrapper"
import { forwardRef, useEffect } from "react";
import { gradientColorTokens, type ColorToken } from "@/domain/colorTokens";
import { useAuthStore } from "@/stores/auth";
import { SubmitFooter } from "@/components/menuElements/submitFooter";
import { useUserActionRegistry } from "@/actionRegistry/userActionRegistry";
import type { UserProps } from "@/stores/usertypes";
import { useImageOrColorSelector } from "@/hooks/UseImageOrColorSelector";
import { ImageColorRenderer } from "@/components/menuElements/ImageColorRenderer";

type UserCoverEditorProps = {
    userID: string;
    onClose: () => void;
}

export const UserCoverEditor = forwardRef<HTMLDivElement, UserCoverEditorProps>(({ userID, onClose }, ref) => {

    const { selectedColor, handleSetColor, selectedImage, handleSetImage } = useImageOrColorSelector();


    const userActions = useUserActionRegistry();
    const user = useAuthStore((state) => state.user || undefined);


    useEffect(() => {
        if (user) {
            if (user.Props.Cover?.Type === "color" && user.Props.Cover?.Color) {
                handleSetColor({ className: user.Props.Cover.Color } as ColorToken);
            } else if (user.Props.Cover?.Type === "image" && user.Props.Cover?.Url) {
                handleSetImage(user.Props.Cover.Url);
            } else if (user.Props.Cover?.Color) {
                handleSetColor({ className: user.Props.Cover.Color } as ColorToken);
            } else if (user.Props.Cover?.Url) {
                handleSetImage(user.Props.Cover.Url);
            }

        }
    }, [user]);


    const handleSubmit = () => {

        const props: UserProps = {
            Cover: {
                Type: selectedImage ? "image" : selectedColor ? "color" : undefined,
                Color: selectedColor?.className,
                Url: selectedImage ?? (selectedColor ? null : undefined),
            },

        }
        userActions.updateMyAvatarProps(props);
        onClose();
    }

    const visibleColorTokens = gradientColorTokens.filter((token, index) => index < 6)
    return (
        <CommonMenuWrapper
            ref={ref}

        >
            <div className="flex items-center justify-center w-[400px] flex-col gap-4 p-4 px-8">
                <span className="text-lg text-left w-full font-semibold text-neutral-300">Edit Cover</span>
                <div className="grid grid-cols-[120px_1fr] gap-2 items-center w-full ">
                    <ImageColorRenderer
                        className="w-full h-20 rounded-md"
                        bgImage={selectedImage ?? undefined}
                        bgColor={selectedColor?.className ?? undefined}
                        fallbackGradient={gradientColorTokens[0]}
                        backgroundType={selectedImage ? "image" : selectedColor ? "color" : undefined}
                    />
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