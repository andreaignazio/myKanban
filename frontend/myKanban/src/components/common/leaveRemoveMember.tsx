import { X, XIcon } from "lucide-react";
import { LabeledButtonPresetA } from "../buttons/labeledButton/LabeledButtonPresetA"

type LeaveRemoveMemberProps = {
    canRemove: boolean;
    canLeave: boolean;
    isCurrentUser: boolean;
    onLeave: () => void;
    onRemove: () => void;
    className?: string;
}

export const LeaveRemoveMember = ({ isCurrentUser, canRemove, canLeave, onLeave, onRemove, className }: LeaveRemoveMemberProps) => {


    return (
        <>
            <LabeledButtonPresetA label="Remove" onClick={onRemove} disabled={!canRemove}
                className={`h-9 ${className}
                    ${isCurrentUser ? "hidden" : ""}
                    font-semibold text-sm ${!canRemove ? "opacity-50 cursor-not-allowed" : ""}`} />

            <LabeledButtonPresetA label="Leave" onClick={onLeave} disabled={!canLeave}
                className={`h-9  px-6 ${className} 
                    ${isCurrentUser ? "" : "hidden"}
                    font-semibold text-sm ${!canLeave ? "opacity-50 cursor-not-allowed" : ""}`} >
                <XIcon className="h-4 w-4 " />
            </LabeledButtonPresetA>
        </>

    )
}