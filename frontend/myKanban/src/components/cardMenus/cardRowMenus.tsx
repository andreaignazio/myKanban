import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { PhotoIcon } from "@heroicons/react/24/solid";
import { forwardRef, useRef, useState, type ComponentType, type RefObject, type SVGProps } from "react";
import type { MenuItemExtended } from "@/types/uiTypes";
import { CardColorSelector, CardCoverMenu, CoverSizeMenu } from "../modals/CardCoverMenu";
import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry";
import { useParams } from "react-router";
import { DropDown } from "../menuElements/DropDown";
import { ActionMenuWrapper } from "../modals/ListActionsMenu";
import { CheckIcon, ClockIcon, PencilIcon, TagIcon, UserPlusIcon, PaperClipIcon, MapPinIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { CustomInput } from "../menuElements/CustomInput";
import { LabeledButtonCustom } from "../buttons/labeledButton";

export type CardRowMenuBtnProps = {
    cardID?: string;
    menuComponent?: (props: {
        onClose: () => void, ref: RefObject<HTMLDivElement | null>,
        anchorRef?: RefObject<HTMLDivElement | null>
    }) => React.ReactNode;
    label?: string;
    icon?: React.ReactNode;
    showLabelWhenCompact?: boolean;
    customId?: string;
    btnVariant?: "compact" | "default";
    className?: string;
    style?: React.CSSProperties;
    shouldHideBtn?: () => boolean;
    children?: React.ReactNode;
    onButtonClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    placement?: "top" | "bottom" | "left" | "right" | "top-start" | "top-end" | "bottom-start" | "bottom-end" | "left-start" | "left-end" | "right-start" | "right-end"
    renderType?: "anchored" | "virtual";
    customAnchorRef?: RefObject<HTMLDivElement | null>;
    offset?: [number, number];
    disableClick?: boolean;
    desiredBackdropOpacity?: number;
    exclusiveGroup?: string;
    wrapperClassName?: string;
}

export const CardRowMenuBtn = forwardRef<HTMLDivElement, CardRowMenuBtnProps>(({ cardID, menuComponent, renderType = "anchored",
    label, icon, showLabelWhenCompact, customId, btnVariant = "default", className, style,
    shouldHideBtn, children, onButtonClick, placement,
    customAnchorRef, offset, disableClick, desiredBackdropOpacity, exclusiveGroup, wrapperClassName }, ref) => {
    const openOverlay = useOverlayStore((state) => state.open);
    const onMenuClose = useOverlayStore((state) => state.close);

    const cardActionsMenuRef = useRef<HTMLDivElement>(null)
    const acnhorRef = ref as React.RefObject<HTMLDivElement>;
    const btnRef = useRef<HTMLDivElement>(null);
    const resolvedId = customId ? customId : "card-action-menu";

    const menuComponentRef = useRef(menuComponent);
    menuComponentRef.current = menuComponent;

    function handleOpenCardActionModal() {
        if (customAnchorRef) {
            if (!customAnchorRef.current) {
                return;
            }
        }

        // console.log("Opening respond modal for share offer");
        const descriptor: OverlayDescriptor = {
            id: resolvedId,
            render: () => menuComponentRef.current ? menuComponentRef.current({ onClose: () => onMenuClose(resolvedId), ref: cardActionsMenuRef, anchorRef: customAnchorRef || btnRef }) : null,
            anchorRef: customAnchorRef || btnRef,
            panelRef: cardActionsMenuRef,
            type: "modal",
            renderType: renderType,
            exclusiveGroup: exclusiveGroup ? exclusiveGroup : "share-action-modal",
            opts: {
                closeOnMouseLeave: false,
                closeOnClickOutside: true,
                closeOnEscape: true,
                lockBackdrop: true,
            },
            position: {
                virtual: "viewport-center",
                placement: placement || "bottom",
                offset: offset || undefined
            },
            desiredBackdropOpacity,
        }
        openOverlay(descriptor);

    }

    if (shouldHideBtn && shouldHideBtn()) return null;

    return (
        <>
            {children && (
                <div className={wrapperClassName}
                    data-entry-menu-btn="true"
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        if (disableClick) return;
                        e.stopPropagation();
                        handleOpenCardActionModal()
                    }}
                    ref={btnRef}>
                    {children}
                </div>

            )}
            {!children && <div

                data-entry-menu-btn="true"
                data-btn-id={label}
                onPointerDownCapture={(e) => e.stopPropagation()}
                onClick={(e) => {
                    if (disableClick) return;
                    handleOpenCardActionModal()
                    onButtonClick && onButtonClick(e)
                }}
                ref={btnRef}
                style={style}
                className={`${btnVariant === "default" ? "rounded-sm" :
                    showLabelWhenCompact ? "rounded-full gap-1 text-nowrap" : "rounded-full aspect-square"} 
                    border border-gray-500/30 px-2
                    p-1 flex items-center justify-center
                    hover:bg-neutral-700/25 cursor-pointer
                    text-neutral-300 ${wrapperClassName}
                     ${className}`}>
                {icon ? icon : <PhotoIcon className="w-4 aspect-square text-white" />}

                {label && btnVariant === "default" && <span className="text-sm ml-2">{label}</span>}
                {label && btnVariant === "compact" &&
                    showLabelWhenCompact && <span className="text-xs mr-1 ">{label}</span>}

            </div>}
        </>
    )
});



