import { forwardRef } from "react";
import type { LabeledButtonProps } from "./types";

export const LabeledButtonCustom = forwardRef<HTMLDivElement, LabeledButtonProps>(({ label, onClick, children, className, disabled, iconAtLeft = false, hidden = false, style }: LabeledButtonProps, ref) => {
    if (hidden) return null;
    return (
        <div
            ref={ref}
            onClick={disabled ? undefined : onClick}
            style={style}
            className={`relative flex flex-row items-center justify-start
             ${disabled ? "cursor-default " : "cursor-pointer hover:filter hover:brightness-110"}
         rounded-md py-1 px-2 gap-1 ${className}`}>
            {iconAtLeft && children}
            <div className=" text-nowrap">{label}</div>
            {!iconAtLeft && children}

        </div>
    )
})
