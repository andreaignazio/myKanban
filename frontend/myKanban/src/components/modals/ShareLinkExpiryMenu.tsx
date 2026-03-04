import { DateTimeSelectorField } from "../common/DateTimeSelectorField";
import { LabeledButtonCustom, LabeledButtonPresetB, LabeledButtonPresetBSubmit } from "../buttons/labeledButton";
import { CommonMenuWrapper } from "../menuElements/menuWrapper";

type ShareLinkExpiryMenuProps = {
    value?: Date;
    onChange: (value: Date | undefined) => void;
    onApply: () => void;
    onClear: () => void;
};

export function ShareLinkExpiryMenu({ value, onChange, onApply, onClear }: ShareLinkExpiryMenuProps) {
    return (
        <CommonMenuWrapper style={{ width: "300px" }}
            className="!bg-menusec !border !border-neutral-500/60 
        !rounded-md p-3 flex flex-col gap-2">
            <span className="text-sm text-neutral-300">
                Set expiration date and time</span>
            <DateTimeSelectorField
                value={value}
                enabled={Boolean(value)}
                onEnabledChange={(enabled) => onChange(enabled ? (value ?? new Date()) : undefined)}
                onChange={onChange}
                leftPadding={10}
            />
            <div className="flex flex-row justify-end gap-2">
                <LabeledButtonPresetB
                    className="!h-8 !px-2"
                    label="Clear"
                    onClick={onClear}
                />
                <LabeledButtonPresetBSubmit
                    className="!h-8 !px-2"
                    label="Apply"
                    onClick={onApply}
                />
            </div>
        </CommonMenuWrapper>
    );
}
