import type { AsyncRequestKey } from "@/stores/asyncRequestTypes";
import { useAsyncRequestDisplay } from "@/hooks/useAsyncRequestDisplay";
import { LoaderCircle } from "lucide-react";

type DangerButtonProps = {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    asyncKey?: AsyncRequestKey;
    className?: string;
}

export function DangerButton({ label, onClick, disabled, asyncKey, className }: DangerButtonProps) {
    const { displayLoading, displaySuccess, displayError, errorMessage } = useAsyncRequestDisplay(
        asyncKey ?? [] as unknown as AsyncRequestKey[],
        { minSuccessMs: 1200 }
    )

    const isActive = displayLoading || displaySuccess || displayError

    const bgClass = displayError
        ? "bg-red-700/40 hover:bg-red-700/50"
        : displaySuccess
            ? "bg-emerald-800/40 hover:bg-emerald-800/50"
            : displayLoading
                ? "bg-rose-800/20"
                : "bg-rose-800/20 hover:bg-red-800/40"

    const textClass = displayError
        ? "text-red-400"
        : displaySuccess
            ? "text-emerald-400"
            : "text-red-500"

    const resolvedLabel = displayError
        ? (errorMessage ?? "Error")
        : displaySuccess
            ? "Done"
            : label

    return (
        <button
            disabled={disabled || displayLoading}
            onClick={onClick}
            className={`w-64 transition-colors duration-200 rounded-xl h-12 flex items-center justify-center
                py-3 px-4 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
                ${isActive ? "" : ""} ${bgClass} ${className ?? ""}`}
        >
            {displayLoading
                ? <LoaderCircle className="h-4 w-4 animate-spin text-red-400" />
                : <span className={`text-sm text-center w-full font-bold ${textClass}`}>{resolvedLabel}</span>
            }
        </button>
    )
}
