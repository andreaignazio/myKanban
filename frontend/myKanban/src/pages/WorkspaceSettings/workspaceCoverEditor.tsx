import { useWorkspaceActionRegistry } from "@/actionRegistry/workspaceActionRegistry";
import { ImageColorSelector } from "@/components/menuElements/ImageColorSelector";
import { ImageColorRenderer } from "@/components/menuElements/ImageColorRenderer";
import { CommonMenuWrapper } from "@/components/menuElements/menuWrapper";
import { SubmitFooter } from "@/components/menuElements/submitFooter";
import { gradientColorTokens, type ColorToken } from "@/domain/colorTokens";
import { useImageOrColorSelector } from "@/hooks/UseImageOrColorSelector";
import type { WorkspaceCoverProps, WorkspaceProps } from "@/stores/types";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { forwardRef, useEffect } from "react";

type WorkspaceCoverEditorProps = {
    workspaceID?: string;
    onClose: () => void;
    onLocalSubmit?: (cover: WorkspaceCoverProps) => void;
};

export const WorkspaceCoverEditor = forwardRef<HTMLDivElement, WorkspaceCoverEditorProps>(({ workspaceID, onClose, onLocalSubmit }, ref) => {
    const { selectedColor, handleSetColor, selectedImage, handleSetImage } = useImageOrColorSelector();
    const workspaceActions = useWorkspaceActionRegistry();
    const workspace = useWorkspaceStore((state) => state.workspacesById[workspaceID ?? ""]);

    useEffect(() => {
        const cover = workspace?.Props?.Cover;
        if (!cover) return;

        if (cover.Type === "color" && cover.Color) {
            handleSetColor({ className: cover.Color } as ColorToken);
            return;
        }

        if (cover.Type === "image" && cover.ImageUrl) {
            handleSetImage(cover.ImageUrl);
            return;
        }

        if (cover.Color) {
            handleSetColor({ className: cover.Color } as ColorToken);
            return;
        }

        if (cover.ImageUrl) {
            handleSetImage(cover.ImageUrl);
        }
    }, [workspace]);

    const handleSubmit = async () => {
        const cover: WorkspaceCoverProps = {
            Type: selectedImage ? "image" : selectedColor ? "color" : undefined,
            Color: selectedColor?.className,
            ImageUrl: selectedImage ?? (selectedColor ? null : undefined),
        };

        if (onLocalSubmit) {
            onLocalSubmit(cover);
            onClose();
            return;
        }

        if (!workspaceID) return;
        const props: WorkspaceProps = { Cover: cover };
        await workspaceActions.patchWorkspaceProps(workspaceID, { Props: props });
        onClose();
    };

    const visibleColorTokens = gradientColorTokens.filter((token, index) => index < 6);

    return (
        <CommonMenuWrapper ref={ref}>
            <div className="flex items-center justify-center w-[400px] flex-col gap-4 p-4 px-8">
                <span className="text-lg text-left w-full font-semibold text-neutral-300">Edit Workspace Cover</span>
                <div className="grid grid-cols-[120px_1fr] gap-2 items-center w-full">
                    <ImageColorRenderer
                        className="w-full h-20 rounded-md"
                        bgImage={selectedImage ?? undefined}
                        bgColor={selectedColor?.className ?? undefined}
                        fallbackGradient={gradientColorTokens[0]}
                        backgroundType={selectedImage ? "image" : selectedColor ? "color" : undefined}
                    />
                    <div className="flex flex-col w-full">
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

                <SubmitFooter
                    buttonsClassName="!px-6 !rounded"
                    className="!w-full justify-end"
                    flipButtons={true}
                    show={true}
                    onCancel={onClose}
                    onSubmit={handleSubmit}
                />
            </div>
        </CommonMenuWrapper>
    );
});