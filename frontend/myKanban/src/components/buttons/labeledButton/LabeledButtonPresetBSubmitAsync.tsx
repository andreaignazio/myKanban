import type { AsyncRequestKey } from "@/stores/asyncRequestTypes";
import { useAsyncRequestDisplay } from "@/hooks/useAsyncRequestDisplay";
import { LoaderCircle } from "lucide-react";
import { LabeledButtonPresetB } from "./LabeledButtonPresetB";
import type { LabeledButtonPresetProps } from "./types";

type LabeledButtonPresetBSubmitAsyncProps = LabeledButtonPresetProps & {
    asyncKey: AsyncRequestKey;
    showSuccess?: boolean;
}

export function LabeledButtonPresetBSubmitAsync({ asyncKey, showSuccess = true, label, disabled, onClick, ...props }: LabeledButtonPresetBSubmitAsyncProps) {
    const { displayLoading, displaySuccess, displayError, errorMessage } = useAsyncRequestDisplay(
        asyncKey,
        { minSuccessMs: 800 }
    )

    const resolvedLabel = displayLoading
        ? ""
        : displayError
            ? (errorMessage ?? "Error")
            : (showSuccess && displaySuccess)
                ? "Done"
                : label

    const bgClass = displayError
        ? "!bg-red-700/40 hover:!bg-red-700/50 !text-red-400"
        : (showSuccess && displaySuccess)
            ? "!bg-emerald-800/40 hover:!bg-emerald-800/50 !text-emerald-400"
            : "!bg-[#669df1] hover:!bg-[#74a4ed] !text-neutral-900"

    return (
        <LabeledButtonPresetB
            {...props}
            label={resolvedLabel}
            disabled={disabled || displayLoading}
            onClick={onClick}
            className={`font-inter font-extrabold tracking-normal px-3.5 ${bgClass} ${props.className ?? ""}`}
        >
            {displayLoading && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-neutral-900" />}
        </LabeledButtonPresetB>
    )
}
