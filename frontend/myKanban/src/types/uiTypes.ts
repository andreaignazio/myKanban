import type { CardRowMenuBtnProps } from "@/components/cardMenus/cardRowMenus";
import type { MenuItem } from "@/components/menuElements/CustomDropDown";

export type MenuItemKind = "standard" | "checker" | "custom" | "divider" | "header" | "checkbox" | "anchoredMenu";

export type MenuItemExtended = MenuItem & {
    kind: MenuItemKind;
    height?: number;
    customElement?: () => React.ReactNode;
    endIcon?: React.ReactNode;
    disabled?: boolean;
    style?: React.CSSProperties;
    hide?: () => boolean;
    checked?: boolean | (() => boolean);
    onChange?: (b: boolean) => void;
    className?: string;
    anchoredMenuProps?: Omit<CardRowMenuBtnProps, | "label" | "icon">;
};