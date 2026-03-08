import { XMarkIcon } from "@heroicons/react/24/solid";
import { LabeledButtonPresetA } from "../buttons/labeledButton";
import { AsyncRequestOverlayGroups } from "../asyncRequestHandlers/asyncRequestOverlayA";
import { useAsyncRequestGroup } from "@/hooks/useAsyncRequestGroup";
import { type ReactNode, useEffect, useState } from "react";


type ConfirmDeletionPopoverProps = {
    onClose?: () => void;
    onSubmit?: () => void;
    title?: string;
    body?: string;
    theme?: "light" | "dark";
    submitLabel?: string;
    useDelayedClose?: boolean;
    children?: ReactNode;
}

export const ConfirmDeletionPopover = ({ onClose, onSubmit, title, body, theme = "dark", submitLabel, useDelayedClose = false, children }: ConfirmDeletionPopoverProps) => {
    const isLight = theme === "light"
    const [shouldCloseAfterSuccess, setShouldCloseAfterSuccess] = useState(false)

    const { isLoading, isSuccessful } = useAsyncRequestGroup(["subscription:cancel", "subscription:checkout", "subscription:resume"])

    useEffect(() => {
        if (!useDelayedClose || !shouldCloseAfterSuccess || isLoading || !isSuccessful) {
            return
        }

        const timeoutId = window.setTimeout(() => {
            setShouldCloseAfterSuccess(false)
            onClose?.()
        }, 1500)

        return () => window.clearTimeout(timeoutId)
    }, [isLoading, isSuccessful, onClose, shouldCloseAfterSuccess, useDelayedClose])

    useEffect(() => {
        if (!shouldCloseAfterSuccess || isLoading || isSuccessful !== false) {
            return
        }

        setShouldCloseAfterSuccess(false)
    }, [isLoading, isSuccessful, shouldCloseAfterSuccess])

    const delayedCloseOnSubmit = () => {
        setShouldCloseAfterSuccess(true)
        onSubmit?.()
    }

    return (
        <div className=" relative flex flex-col justify-center items-start w-[350px] h-fit p-4 gap-4">
            <AsyncRequestOverlayGroups requestGroups={[
                {
                    requestKey: ["subscription:checkout", "subscription:cancel", "subscription:resume"],
                    minLoadingMs: 500, minSuccessMs: 2000, maxErrorMs: 2000, show: ["loading", "success", "error"]
                },
            ]} />
            <XMarkIcon onClick={onClose}
                className={`h-8 aspect-square p-2 rounded-md absolute top-3 right-3 cursor-pointer
                 ${isLight ? "text-neutral-700 hover:bg-neutral-900/10" : "text-neutral-400 hover:bg-neutral-300/10"}`} />
            <h2 className={`flex items-center h-8 justify-center text-sm font-bold w-full text-center ${isLight ? "text-neutral-800" : "text-neutral-400"}`}>{title || "Confirm Deletion"}</h2>
            <p
                className={`font-inter font-normal text-[15px] tracking-normal leading-6 ${isLight ? "text-neutral-700" : "text-neutral-300"}`}
            >{body || "Are you sure you want to delete this item? This action cannot be undone."}</p>
            {children}
            <LabeledButtonPresetA label={submitLabel ?? "Delete"}
                onClick={useDelayedClose ? delayedCloseOnSubmit : onSubmit ?? (() => { })}
                className={`${isLight
                    ? "!bg-red-500/20 hover:!bg-red-500/30 text-red-700 border border-red-500/30"
                    : "!bg-[#f87168] hover:!bg-[#f78a82] text-neutral-900"
                    } w-full !h-9 !font-semibold`} />

        </div>
    )
}