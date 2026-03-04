import LoadingIcons from "react-loading-icons"
import type { AsyncActionStatus } from "@/hooks/useAsyncActionOverlay"

type AsyncActionOverlayProps = {
    isActive: boolean
    status: AsyncActionStatus
    loadingText?: string
    successText?: string
    errorText?: string
    className?: string
}

export function AsyncActionOverlay({
    isActive,
    status,
    loadingText = "Processing...",
    successText = "Operation completed successfully!",
    errorText = "Operation failed!",
    className,
}: AsyncActionOverlayProps) {
    if (!isActive) return null

    const bgClass = status === "error" ? "bg-red-500" : "bg-black"

    return (
        <div className={`absolute inset-0 ${bgClass} bg-opacity-50 flex items-center justify-center z-50 rounded-2xl ${className ?? ""}`}>
            {status === "loading" && (
                <>
                    <LoadingIcons.SpinningCircles className="text-white" />
                    <span className="text-lg font-mono">{loadingText}</span>
                </>
            )}
            {status === "success" && (
                <span className="text-lg font-mono">{successText}</span>
            )}
            {status === "error" && (
                <span className="text-lg font-mono">{errorText}</span>
            )}
        </div>
    )
}
