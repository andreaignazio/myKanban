import type { AsyncRequestKey } from "@/stores/asyncRequestTypes";
import { useAsyncRequestDisplay } from "@/hooks/useAsyncRequestDisplay";
import { LoaderCircle, Check, X } from "lucide-react";
import type React from "react";

type IconButtonAsyncProps = {
    asyncKey: AsyncRequestKey | AsyncRequestKey[];
    icon: React.ComponentType<{ size?: number; className?: string }>;
    size?: number;
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
    /** Color class applied to the icon in the idle state */
    idleColorClass?: string;
    /** Color class applied when the action succeeded */
    successColorClass?: string;
    /** Color class applied when the action failed */
    errorColorClass?: string;
}

/**
 * An icon-only button with integrated async state display.
 * Background is always transparent — any bg styling should come from the parent.
 * States are communicated via icon swap + text-color only.
 */
export function IconButtonAsync({
    asyncKey,
    icon: Icon,
    size = 16,
    onClick,
    className = "",
    idleColorClass = "text-neutral-400",
    successColorClass = "text-emerald-400",
    errorColorClass = "text-red-400",
}: IconButtonAsyncProps) {
    const { displayLoading, displaySuccess, displayError } = useAsyncRequestDisplay(asyncKey)

    const colorClass = displayError
        ? errorColorClass
        : displaySuccess
            ? successColorClass
            : idleColorClass

    const renderIcon = () => {
        if (displayLoading) return <LoaderCircle size={size} className={`${colorClass} animate-spin`} />
        if (displaySuccess) return <Check size={size} className={colorClass} />
        if (displayError) return <X size={size} className={colorClass} />
        return <Icon size={size} className={colorClass} />
    }

    return (
        <button
            onClick={onClick}
            disabled={displayLoading}
            className={`bg-transparent border-none p-0 cursor-pointer flex items-center justify-center transition-colors duration-200 ${className}`}
        >
            {renderIcon()}
        </button>
    )
}
