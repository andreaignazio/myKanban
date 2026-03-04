import { LabeledButtonPresetB } from "./LabeledButtonPresetB";
import type { LabeledButtonPresetProps } from "./types";

export function LabeledButtonPresetBSubmit({ label, onClick, children, className, disabled }: LabeledButtonPresetProps) {
    const resolvedClassname = `font-inter font-extrabold
     !bg-[#669df1] hover:!bg-[#74a4ed] text-neutral-900 
     tracking-normal px-3.5 ${className ?? ""}`;
    return (
        <LabeledButtonPresetB label={label} onClick={onClick} className={resolvedClassname} disabled={disabled} >
            {children}
        </LabeledButtonPresetB>
    )
}
