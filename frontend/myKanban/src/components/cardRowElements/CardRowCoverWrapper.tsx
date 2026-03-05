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
    children: React.ReactNode
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
    children
}, ref) => {


    return (
        <div className="relative">
            {showMirrorBackdrop && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[245px] h-[15px] rounded-lg z-0 overflow-hidden">
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
                className={`relative z-10 flex flex-col text-gray-100
                 bg-[#242528]
                rounded-lg  min-h-[40px] justify-center overflow-hidden shadow-md shadow-black/40
                group ring-2 ring-white/0 mx-1 hover:ring-white/100
                `}>

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