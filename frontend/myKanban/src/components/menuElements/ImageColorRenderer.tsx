
type ImageColorRendererProps = {

    className?: string
    overrideClassName?: boolean
    bgImage?: string | null
    bgColor?: string | null
    fallbackGradient?: { className: string }
    backgroundType?: "color" | "image" | null
    children?: React.ReactNode
    style?: React.CSSProperties
    onClick?: () => void
}


export const ImageColorRenderer = ({ className, overrideClassName, bgImage, bgColor, fallbackGradient, backgroundType, children, style, onClick }: ImageColorRendererProps) => {
    const finalClassName = overrideClassName ? className || "" : `flex h-full w-16 rounded-md overflow-hidden ${className || ""}`;
    return (
        <div
            className={finalClassName}
            style={style}
            onClickCapture={onClick}
        >
            {backgroundType === "image" && <img
                src={bgImage || "/board-placeholder.png"}
                alt="Board placeholder"
                className="h-full w-full object-cover"
            />
            }
            {
                backgroundType === "color" && <div
                    className={`h-full w-full ${bgColor}`}

                />
            }
            {
                !backgroundType && <div
                    className={fallbackGradient?.className + " h-full w-full"}
                />
            }
            {children}
        </div >
    )
}