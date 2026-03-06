export type LabeledButtonProps = {
    label: string;
    onClick: React.MouseEventHandler<HTMLDivElement>;
    onClickCapture?: React.MouseEventHandler<HTMLDivElement>;
    onPointerDownCapture?: React.PointerEventHandler<HTMLDivElement>;
    children?: React.ReactNode;
    className?: string;
    disabled?: boolean;
    iconAtLeft?: boolean;
    hidden?: boolean;
    style?: React.CSSProperties;
}

export type LabeledButtonPresetProps = Omit<LabeledButtonProps, "iconAtLeft" | "hidden">;
