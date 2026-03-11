import { useRef } from "react";
import { LabeledButtonCustom } from "./LabeledButtonCustom";
import type { LabeledButtonPresetProps } from "./types";




type LabeledButtonPresetBProps = {
    anchorKey?: string;
    registerAnchor?: (id: string, ref: React.RefObject<HTMLDivElement>) => void;
    iconAtLeft?: boolean;
} & LabeledButtonPresetProps

export const LabeledButtonPresetB = ({ label, onClick, onClickCapture, onPointerDownCapture, children, className, disabled, iconAtLeft = true, style, registerAnchor, anchorKey }: LabeledButtonPresetBProps) => {
    const anchorRef = useRef<HTMLDivElement | null>(null);

    if (registerAnchor && anchorRef && anchorKey) {
        registerAnchor(anchorKey, anchorRef as React.RefObject<HTMLDivElement>);
    }

    return (
        <LabeledButtonCustom
            ref={anchorRef}
            label={label} onClick={onClick}
            onClickCapture={onClickCapture}
            onPointerDownCapture={onPointerDownCapture}
            disabled={disabled}
            iconAtLeft={iconAtLeft}
            style={style}
            className={`bg-menubtn rounded-[4px] h-[32px] justify-center
                    ${disabled ? " opacity-50 " : "hover:bg-gray-500/30"}
                               font-medium text-[14px] tracking-wide ${className}`} >
            {children}
        </LabeledButtonCustom>
    )
}
