import { forwardRef } from "react"
import type { CardRowMode } from "../CardRow"
import { ImageColorRenderer } from "../menuElements/ImageColorRenderer"

export type CardRowCoverWrapperProps = {
    mode: CardRowMode
    cardColor?: string
    cardCoverURL?: string
    showMirrorBackdrop?: boolean
    mirrorBackdropBackgroundType?: "color" | "image" | null
    mirrorBackdropBgImage?: string
    mirrorBackdropBgColorClass?: string
    mirrorBackdropFallbackGradientClass?: string
    mirrorBackdropSize?: string
    children: React.ReactNode
    wrapperClassName?: string
    mainDivClassName?: string
    mirroBgStyle?: React.CSSProperties
    canEdit?: boolean
}



export const CardRowCoverWrapper = forwardRef<HTMLDivElement, CardRowCoverWrapperProps>(({
    mode,
    cardColor,
    cardCoverURL,
    showMirrorBackdrop,
    mirrorBackdropBackgroundType,
    mirrorBackdropBgImage,
    mirrorBackdropBgColorClass,
    mirrorBackdropFallbackGradientClass,
    mirrorBackdropSize,
    children,
    wrapperClassName,
    mainDivClassName,
    mirroBgStyle,
    canEdit
}, ref) => {


    return (
        <div className={`relative ${wrapperClassName ?? ""}`}>
            {showMirrorBackdrop && (
                <div
                    style={mirroBgStyle}
                    className={`absolute -bottom-1 left-1/2 -translate-x-1/2 ${mirrorBackdropSize || "w-[93%] h-[15px]"} rounded-lg z-0 overflow-hidden`}>
                    <ImageColorRenderer
                        overrideClassName
                        className="h-full w-full"
                        bgImage={mirrorBackdropBgImage}
                        bgColor={mirrorBackdropBgColorClass}
                        fallbackGradient={mirrorBackdropFallbackGradientClass ? { className: mirrorBackdropFallbackGradientClass } : undefined}
                        backgroundType={mirrorBackdropBackgroundType ?? null}
                    />
                </div>
            )}
            <div
                ref={ref}
                style={{
                    backgroundColor: mode !== "detailed" ? cardColor : "#242528",
                    backgroundImage: mode !== "detailed" ? (cardCoverURL ? `url(${cardCoverURL})` : undefined) : undefined,
                    backgroundSize: "cover", backgroundPosition: "center",

                }}
                className={`relative z-10 flex flex-col text-gray-100 transition-all ease-in-out duration-200
                 bg-[#242528]
                rounded-lg  min-h-[40px] justify-center overflow-hidden shadow-md 
                ${canEdit
                        ? "shadow-black/40 hover:ring-white/100"
                        : "shadow-black/20 ring-inset  hover:ring-white/50"}
                group ring-2 ring-white/0 mx-1 
                ${mainDivClassName ?? ""}`}>


                {mode === "detailed" && <div
                    style={{
                        backgroundColor: cardColor || "#242528",
                        backgroundImage: mode === "detailed" ? (cardCoverURL ? `url(${cardCoverURL})` : undefined) : undefined,
                        backgroundSize: "cover", backgroundPosition: "center"
                    }}
                    className="flex flex-row bg-blue-400 h-9">

                </div>}
                {children}
            </div>
        </div>

    )
})