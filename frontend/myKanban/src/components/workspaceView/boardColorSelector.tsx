
import { forwardRef, useState } from "react"
import { ActionMenuWrapper } from "../modals/ListActionsMenu";
import { baseImages, gradientColorTokens, type ColorToken } from "@/domain/colorTokens";
import { ButtonHoverInset } from "../menuElements/buttonHoverInset";
import { LabeledButtonPresetA, LabeledButtonPresetB } from "../buttons/labeledButton";
import { ImageSearchMenu } from "../cardMenus/imageSearchMenu";
import { BoardColorsSection } from "./BoardColorsSection";

type BoardColorSelectorProps = {
    activeColorToken: ColorToken | null;
    onSelectColor: (color: ColorToken) => void;
    activeImageUrl: string | null;
    onSelectImage: (Url: string) => void;
    onClose: () => void;
}
const gridClass = "grid grid-cols-3 gap-2"
const objClass = "relative h-14 w-full rounded-md cursor-pointer overflow-hidden"
export const BoardColorSelector
    = forwardRef<HTMLDivElement, BoardColorSelectorProps>(({ activeColorToken, onSelectColor, onClose, activeImageUrl, onSelectImage }, ref) => {
        const Title = "Select Board Color"
        const tabs = ["overview", "colors", "images"] as const
        const [activeTab, setActiveTab] = useState<typeof tabs[number]>("overview")

        const visibleGradientColors = gradientColorTokens.filter((color, idx) => idx < 6)
        const visibleBaseImages = baseImages.filter((image, idx) => idx < 6)
        return (
            <ActionMenuWrapper Title={Title}
                onClose={onClose}

                onBack={activeTab !== "overview" ? () => setActiveTab("overview") : undefined}
                width={300}
                style={{ paddingTop: "10px", paddingInline: "10px" }}
                titleStyle={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "14px", fontWeight: 600 }}>
                {activeTab === "overview" && (
                    <div className="flex flex-col gap-2">
                        <HeaderWSelector onClick={() => setActiveTab("images")} label="Images" />
                        <div className={gridClass}>
                            {visibleBaseImages.map((image) => {
                                return (
                                    <div key={image.id} className={` relative ${objClass} overflow-hidden `}>
                                        <img key={image.id} src={image.url} className={objClass + " object-cover"}>

                                        </img>
                                        <ButtonHoverInset onClick={() => onSelectImage(image.url)} />
                                    </div>
                                )
                            })}
                        </div>
                        <HeaderWSelector onClick={() => setActiveTab("colors")} label="Colors" />
                        <div className={gridClass}>
                            {visibleGradientColors.map((color) => {
                                return (
                                    <div key={color.token} className={` ${objClass} ${color.className}`}

                                        onClick={() => onSelectColor(color)}
                                    >
                                        <ButtonHoverInset onClick={() => onSelectColor(color)} />
                                    </div>
                                )
                            })}
                        </div>

                    </div>
                )}
                {activeTab === "colors" && (

                    <BoardColorsSection className="mt-4" onSelectColor={onSelectColor} showHeaders={true} />
                )}
                {activeTab === "images" && (
                    <ImageSearchMenu
                        showSearchHelpers={false}
                        defaultImageLimit={30}
                        onImageClick={(url) => { onSelectImage(url); onClose(); }}
                        onClose={() => setActiveTab("overview")} />
                )}
            </ActionMenuWrapper>

        )
    })

type HeaderWSelectorProps = {
    onClick?: () => void;
    showViewMore?: boolean;
    label?: string;
}

const HeaderWSelector = ({ onClick, showViewMore = true, label }: HeaderWSelectorProps) => {
    return (
        <div className="flex flex-row gap-2 items-center justify-between">
            <div onClick={onClick}
                className="text-left text-sm font-medium text-neutral-200 ">{label}</div>
            {showViewMore && <LabeledButtonPresetA
                className="!text-neutral-300"
                label="View more" onClick={onClick ?? (() => { })} />}
        </div>
    )
}