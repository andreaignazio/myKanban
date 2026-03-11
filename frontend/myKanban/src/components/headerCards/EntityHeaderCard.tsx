import { ImageColorRenderer } from "@/components/menuElements/ImageColorRenderer";
import { gradientColorTokens } from "@/domain/colorTokens";
import { useCoverDerivedColors } from "@/hooks/useCoverDerivedColors";

export type HeaderCardType = "user" | "workspace";

type EntityHeaderCardProps = {
    type: HeaderCardType;
    coverType?: "color" | "image" | null;
    coverImage?: string;
    coverColor?: string;
    footerBackgroundColorOverride?: string;
    children?: React.ReactNode;
    footer?: React.ReactNode;
    coverAction?: React.ReactNode;
    className?: string;
    footerClassName?: string;
};

export const EntityHeaderCard = ({
    type,
    coverType,
    coverImage,
    coverColor,
    footerBackgroundColorOverride,
    children,
    footer,
    coverAction,
    className,
    footerClassName,
}: EntityHeaderCardProps) => {
    const { footerBackgroundColor } = useCoverDerivedColors({
        coverClassName: coverColor,
        coverImageUrl: coverImage,
        contrast: 0.9,
    });

    return (
        <div className={`flex relative flex-col w-full items-center rounded-xl overflow-hidden gap-1 mt-10 ${className ?? ""}`} data-header-card-type={type}>
            <ImageColorRenderer
                className="w-full h-32 relative"
                overrideClassName={true}
                bgImage={coverImage}
                bgColor={coverColor}
                fallbackGradient={gradientColorTokens[0]}
                backgroundType={coverType ?? (coverImage ? "image" : coverColor ? "color" : undefined)}
            >
                {coverAction}
                {children && (
                    <div className="absolute -bottom-8 left-9 items-center justify-center flex text-white text-2xl font-bold w-28 h-28 rounded-full border-neutral-800">
                        {children}
                    </div>
                )}
            </ImageColorRenderer>
            <div className={`w-full h-20 ${footerClassName ?? ""}`} style={{ backgroundColor: footerBackgroundColorOverride ?? footerBackgroundColor }}>
                {footer}
            </div>
        </div>
    );
};