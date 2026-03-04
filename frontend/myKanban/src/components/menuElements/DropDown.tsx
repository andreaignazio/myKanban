import React, { forwardRef } from "react";
import type { MenuItemExtended } from "@/types/uiTypes";
import { Check, Square } from "lucide-react";
import { CardRowMenuBtn } from "../cardMenus/cardRowMenus";


type DropDownProps = {
    items: MenuItemExtended[];
    onClick?: (id: string) => void;
    activeMenuItem?: string | null;
    //anchorRef: React.RefObject<HTMLDivElement>;
}
export const DropDown = forwardRef<HTMLDivElement, DropDownProps>(({ items, onClick, activeMenuItem }, ref) => {


    const visibleItems = items.filter(item => {
        if (item.hide) {
            return !item.hide();
        }
        return true;
    });

    return (
        <div ref={ref} className="flex flex-col">
            {visibleItems.length > 0 && visibleItems.map((item) => {
                if (item.kind === "custom" && item.customElement) {
                    return (
                        <React.Fragment key={item.id}>
                            {item.customElement()}
                        </React.Fragment>
                    )
                }
                if (item.kind === "checker") {
                    // Implement checker type menu item rendering here
                    return (
                        <div key={item.id} className="flex flex-row items-center gap-2 px-3 py-2">
                            {item.icon}
                            <input type="checkbox" onChange={() => { item.onClick?.(); onClick?.(item.id); }} />
                            <span>{item.label}</span>
                        </div>
                    )
                }
                if (item.kind === "standard") {
                    return (
                        <MenuItemStandard key={item.id} item={item} activeMenuItem={activeMenuItem} onClick={onClick} height={item.height ? item.height : undefined} />
                    )
                }

                if (item.kind === "anchoredMenu") {
                    return (
                        <CardRowMenuBtn
                            customId={item.id}
                            menuComponent={item.anchoredMenuProps?.menuComponent}
                            {...item.anchoredMenuProps}
                        >
                            <MenuItemStandard key={item.id} item={item} activeMenuItem={activeMenuItem} onClick={onClick} height={item.height ? item.height : undefined} />
                        </CardRowMenuBtn>
                    )
                }

                if (item.kind === "divider") {
                    return (
                        <div key={item.id} style={{ marginTop: item.height ? `${item.height}px` : "1px" }} className="bg-neutral-700 w-full my-1 h-[1px]" />
                    )
                }
                if (item.kind === "header") {
                    return (
                        <div style={item.style}
                            key={item.id} className="px-0 py-1">
                            <span
                                style={item.style}
                                className="text-xs font-medium text-neutral-500">{item.label}</span>
                        </div>
                    )
                }
                if (item.kind === "checkbox") {
                    const isChecked = typeof item.checked === "function" ? item.checked() : Boolean(item.checked);

                    return (
                        <div key={item.id} className="relative flex flex-row items-center gap-2 px-3 py-1">
                            {item.icon}
                            {<Square className={` absolute top-1 h-5 ${isChecked ? "text-transparent" : "text-gray-500"} translate-y-0.5 cursor-pointer`}
                                fill={isChecked ? "rgba(102, 157, 241, 1)" : "transparent"}
                                onClick={() => item.onChange?.(!isChecked)} />}
                            {isChecked && <Check className=" absolute top-2 h-3 text-black/50 translate-y-0.5 pointer-events-none" strokeWidth={4} />}
                            <span style={item.style}
                                className={`pl-12 ${item.className}`}>{item.label}</span>
                        </div>

                    )
                }
                return null;


            })}
        </div>

    )
});


type MenuItemRowProps = {
    item: MenuItemExtended;
    activeMenuItem?: string | null;
    onClick?: (id: string) => void;
    height?: number;
}
export const MenuItemStandard = forwardRef<HTMLDivElement, MenuItemRowProps>(({ item, activeMenuItem, onClick, height }, ref) => {

    const isDisabled = Boolean(item.disabled);

    return (
        <div
            ref={ref}
            style={{ height: height ? `${height}px` : "fit-content" }}
            onClick={() => {
                if (isDisabled) return;
                item.onClick?.();
                onClick?.(item.id);
            }}
            className={`flex flex-row  border-s-2 border-[rgba(0,0,0,0)] items-center gap-2 px-3 py-2
                     ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-neutral-700 hover:border-opacity-100 hover:border-[rgba(102,157,241,1)] cursor-pointer"}
                     ${item.id === activeMenuItem ? "bg-[#123263] border-s-2 border-opacity-100 border-[rgba(102,157,241,1)] text-[#669df1]" : ""}
                     `}>
            <div className="flex flex-row items-center gap-4 w-full">
                {item.icon}
                <div className="flex flex-col">
                    <span className="text-sm">{item.label}</span>
                    {item.description && <span className="text-xs text-neutral-500">{item.description}</span>}
                </div>
                {item.endIcon && <div className="ml-auto text-neutral-300">{item.endIcon}</div>}

            </div>
        </div>
    )
});