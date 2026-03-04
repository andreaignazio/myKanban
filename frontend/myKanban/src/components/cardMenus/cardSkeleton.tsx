type CardSkeletonProps = {
    variant?: "default" | "detailed";
    backgroundColor?: string;
    backgroundImage?: string;
    className?: string;
    onClick?: () => void;
    isLocked?: boolean;
    isActive?: boolean;
}

export const CardSkeleton = ({ variant = "default", backgroundColor, backgroundImage, className, onClick, isLocked, isActive }: CardSkeletonProps) => {

    const resolvedAccent = variant === "detailed" ? "bg-neutral-600" : backgroundColor ? "bg-white/40" : backgroundImage ? "bg-neutral-800/70" : "bg-neutral-800";
    // console.log("Rendering CardSkeleton with variant:", variant, "backgroundColor:", backgroundColor, "backgroundImage:", backgroundImage, "isLocked:", isLocked);
    const skeletonStyle: React.CSSProperties = {
        backgroundColor: backgroundColor || "#4b4d51",
        backgroundImage: backgroundImage ? `url("${backgroundImage}")` : undefined,
        backgroundSize: backgroundImage ? "cover" : undefined,
        backgroundPosition: backgroundImage ? "center" : undefined,
        backgroundRepeat: backgroundImage ? "no-repeat" : undefined,
    }
    return (
        <div onClick={isLocked ? undefined : onClick} className={` relative flex rounded-md w-full 
            flex-col items-end justify-end
             overflow-hidden
            ${isActive ? "ring ring-white/70" : ""}
            ${!isLocked ? "hover:ring hover:ring-white/70 cursor-pointer" : "cursor-default"}
            ${isLocked ? "cursor-default" : "cursor-pointer"} ${className}`}

            style={skeletonStyle} >
            <div className={` flex flex-col gap-[4px] px-1.5 rounded-t-sm
            ${variant === "detailed" ? "bg-neutral-800 h-[60%] " : "bg-transparent h-[50%]"}
            items-start ${variant === "detailed" ? "justify-end" : "justify-center"} w-full  `}>
                {(variant !== "detailed" && backgroundImage) && <div className="absolute top-0 left-0 w-full h-full rounded-md bg-gradient-to-t from-white/30 to-transparent" />
                }
                <div className={`w-full h-1 rounded-full ${resolvedAccent}`} />
                <div className={`w-[75%] h-1 rounded-full ${resolvedAccent}`} />

                {variant === "detailed" && (
                    <div className="relative flex w-full h-2 mt-[2px] mb-1.5 gap-1">
                        <div className={`w-[20%] h-full rounded-[3px] ${resolvedAccent}`} />
                        <div className={`w-[20%] h-full rounded-[3px] ${resolvedAccent}`} />
                        <div className={`absolute right-[0]  bottom-[0] z-10 h-3 aspect-square rounded-full ${resolvedAccent}`} />
                    </div>
                )}
            </div>


        </div>
    )
}
