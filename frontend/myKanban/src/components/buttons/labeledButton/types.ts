export type LabeledButtonProps = {
    label: string;
    onClick: () => void;
    children?: React.ReactNode;
    className?: string;
    disabled?: boolean;
    iconAtLeft?: boolean;
    hidden?: boolean;
    style?: React.CSSProperties;
}

export type LabeledButtonPresetProps = Omit<LabeledButtonProps, "iconAtLeft" | "hidden">;
