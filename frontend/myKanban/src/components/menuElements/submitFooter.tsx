import { LabeledButtonPresetBSubmit, LabeledButtonPresetB } from "../buttons/labeledButton"

type SubmitFooterProps = {
    onSubmit: () => void;
    onCancel: () => void;
    disabled?: boolean;
    show: boolean;
    className?: string;
    buttonsClassName?: string;
    isSaving?: boolean;
    flipButtons?: boolean;
}

export const SubmitFooter = ({ onSubmit, onCancel, disabled, show, className, buttonsClassName, isSaving, flipButtons }: SubmitFooterProps) => {
    return (
        <>
            {show && (<div className={`flex flex-row justify-start items-center gap-1.5 mt-2 ${className}`}>
                {!flipButtons && <LabeledButtonPresetBSubmit
                    className={`!font-semibold font-inter ${buttonsClassName}`}
                    onClick={onSubmit} label={isSaving ? "Saving..." : "Save"}
                    disabled={disabled} />}
                <LabeledButtonPresetB onClick={onCancel} label={"Cancel"}
                    className={`font-inter font-extralight !bg-neutral-700 !text-neutral-300 ${buttonsClassName}`} />
                {flipButtons && <LabeledButtonPresetBSubmit
                    className={`!font-semibold font-inter ${buttonsClassName}`}
                    onClick={onSubmit} label={isSaving ? "Saving..." : "Save"}
                    disabled={disabled} />}
            </div>)}
        </>
    )
}