import { Ellipsis } from "lucide-react"
import { CardRowMenuBtn } from "../cardMenus/cardRowMenus"
import { BoardColorSelector } from "../workspaceView/boardColorSelector"
import { ButtonHoverInset } from "./buttonHoverInset"
import type { ColorToken } from "@/domain/colorTokens"
import type { OverlayPlacement } from "@/overlays/overlayStore"


type ImageColorSelectorProps = {
    selectedColor: ColorToken | null;
    selectedImage: string | null;
    handleSetColor: (color: ColorToken) => void;
    handleSetImage: (url: string) => void;
    colorArray: ColorToken[];
    tokenClassName?: string;
    gridClassName?: string;
    subMenuPlacement?: OverlayPlacement;
}


export const ImageColorSelector = ({ selectedColor, selectedImage, handleSetColor, handleSetImage, colorArray, tokenClassName, gridClassName, subMenuPlacement }: ImageColorSelectorProps) => {
    const imgGap = "gap-1"

    return (

        <div className={`grid grid-cols-6 ${imgGap} ${gridClassName || ""}`}>

            {colorArray.map((token) => (
                <div key={token.token}
                    className={`relative h-8 w-full rounded-[4px] cursor-pointer 
                                 ${token.className} ${tokenClassName || ""}`}
                    onClick={() => { handleSetColor(token) }} >
                    <ButtonHoverInset onClick={() => { }} />
                </div>

            ))}
            <CardRowMenuBtn
                customId="color-image-selector-additional-options"
                cardID="create-board"
                placement={subMenuPlacement || "right"}
                exclusiveGroup="avatar-editor-submenu"
                menuComponent={({ ref, onClose }) => <BoardColorSelector
                    ref={ref}
                    activeColorToken={selectedColor}
                    activeImageUrl={selectedImage}
                    onSelectImage={(url) => { handleSetImage(url); onClose(); }}
                    onSelectColor={(color) => { handleSetColor(color); onClose(); }}
                    onClose={onClose}

                />}>
                <div className={`relative h-8 w-full rounded-[4px] cursor-pointer bg-menubtn flex items-center justify-center text-sm text-neutral-300 ${tokenClassName || ""}`}
                    onClick={() => { }} >
                    <ButtonHoverInset onClick={() => { }} />
                    <Ellipsis className="h-5 w-5" />
                </div>
            </CardRowMenuBtn>
        </div>
    )
}