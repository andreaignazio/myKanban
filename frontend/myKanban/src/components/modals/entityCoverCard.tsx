import { ImageColorRenderer } from "../menuElements/ImageColorRenderer"
import { gradientColorTokens } from "@/domain/colorTokens"



type EntityCoverCardProps = {
    className?: string;
    coverType?: "color" | "image";
    coverImage?: string;
    coverColor?: string;
    badgeChildren?: React.ReactNode;
    footerChilds?: React.ReactNode;
    coverChilds?: React.ReactNode;
    heights?: {
        coverHeight?: number | string;
        footerHeight?: number | string;
    };
    footerBackgroundColorOverride?: string;
    radius?: number | string;
    badgePosition?: {
        bottom?: number | string;
        left?: number | string;
    };

}

export const EntityCoverCard = ({ coverType, coverImage, coverColor,
    badgeChildren, footerChilds,
    coverChilds, heights, footerBackgroundColorOverride, radius, badgePosition, className }: EntityCoverCardProps) => {

    const coverHeight = heights?.coverHeight ?? "80px"
    const footerHeight = heights?.footerHeight ?? "76px"
    const borderRadius = radius ?? "12px"
    return (
        <div
            style={{ borderRadius: borderRadius }}
            className={`flex relative flex-col w-full items-center 
                   rounded-xl overflow-hidden gap-0 mt-0 ${className ?? ""}`}>


            <ImageColorRenderer
                style={{ height: coverHeight }}
                className={`w-full relative flex flex-col`}
                overrideClassName={true}
                bgImage={coverImage}
                bgColor={coverColor}
                fallbackGradient={gradientColorTokens[0]}
                backgroundType={coverType ?? (coverImage ? "image" : coverColor ? "color" : undefined)}
            >
                <div className="absolute inset-0 bg-black/30" />

                <div
                    style={{
                        bottom: badgePosition?.bottom ?? (badgeChildren ? "-24px" : "8px"),
                        left: badgePosition?.left ?? (badgeChildren ? "12px" : "16px")
                    }}
                    className="absolute -bottom-6 left-3
                               items-center justify-center flex flex-row
                                text-white text-2xl font-bold 
                               
                                 border-neutral-800" >


                    {badgeChildren}


                </div>
                <div className="absolute right-4 bottom-2 flex flex-col gap-0 items-start text-neutral-200">
                    {coverChilds}
                </div>



            </ImageColorRenderer>
            <div className={`w-full flex flex-col justify-end`} style={{ height: footerHeight, backgroundColor: footerBackgroundColorOverride ?? "bg-neutral-800" }}>
                {footerChilds}
            </div>



        </div >

    )
}
