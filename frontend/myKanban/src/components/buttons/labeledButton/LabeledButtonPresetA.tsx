import { LabeledButtonCustom } from "./LabeledButtonCustom";
import type { LabeledButtonPresetProps } from "./types";

export function LabeledButtonPresetA({ label, onClick, onClickCapture, onPointerDownCapture, children, className, disabled }: LabeledButtonPresetProps) {
    return (
        <LabeledButtonCustom label={label} onClick={onClick}
            onClickCapture={onClickCapture}
            onPointerDownCapture={onPointerDownCapture}
            disabled={disabled}
            iconAtLeft={true}
            className={`bg-menubtn rounded-md h-8 justify-center
                    ${disabled ? " opacity-50 " : "hover:bg-gray-500/30"}
                               font-medium text-[14px] tracking-wide ${className}`} >
            {children}
        </LabeledButtonCustom>
    )
}
