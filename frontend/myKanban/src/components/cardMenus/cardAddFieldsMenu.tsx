import { forwardRef, useState, type ComponentType, type SVGProps } from "react";
import type { MenuItemExtended } from "@/types/uiTypes";
import { DropDown } from "../menuElements/DropDown";
import { ActionMenuWrapper } from "../modals/ListActionsMenu";
import { CheckIcon, ClockIcon, PencilIcon, TagIcon, UserPlusIcon, PaperClipIcon, MapPinIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { CardLabelMenu } from "./cardLabelMenu";
import { CardDatesMenu } from "./cardDatesMenu";
import { CardMembersMenu } from "./cardMembersMenu";
import { CardChecklistMenu } from "./cardChecklistMenu";
import { useObservedHeight } from "@/hooks/useObservedHeight";


type CardAddFieldsProps = {
    onClose: () => void;
    cardId?: string;
}

type CardAddTab = "menu" | "labels" | "dates" | "members" | "checklist";

export const CardAddFields = forwardRef<HTMLDivElement, CardAddFieldsProps>(({ onClose, cardId }, ref) => {
    const [activeTab, setActiveTab] = useState<CardAddTab>("menu");
    const { elementRef: menuContentRef, height: menuContentHeight } = useObservedHeight(350);
    const { elementRef: labelsContentRef, height: labelsContentHeight } = useObservedHeight(300);
    const { elementRef: datesContentRef, height: datesContentHeight } = useObservedHeight(520);
    const { elementRef: membersContentRef, height: membersContentHeight } = useObservedHeight(390);
    const { elementRef: checklistContentRef, height: checklistContentHeight } = useObservedHeight(300);

    const ICON_SIZE_CLASS = "w-5 h-";
    const iconClassName = `${ICON_SIZE_CLASS} text-neutral-300`;
    const icon = (Icon: ComponentType<SVGProps<SVGSVGElement>>) => (
        <div className="flex  items-center justify-center h-[38px] aspect-square border border-gray-500/30 rounded-md">
            <Icon className={iconClassName} />
        </div>
    );

    const h = 48;
    const menuItems: MenuItemExtended[] = [

        {
            id: "labels",
            label: "Labels",
            description: "Organize, categorize, and prioritize",
            kind: "standard",
            height: h,
            icon: icon(TagIcon),
            onClick: () => setActiveTab("labels")
        },
        {
            id: "date",
            label: "Dates",
            description: "Start dates, due dates, and reminders",
            kind: "standard",
            height: h,
            icon: icon(ClockIcon),
            onClick: () => setActiveTab("dates")
        },
        {
            id: "members",
            label: "Members",
            description: "Add members to this card",
            kind: "standard",
            height: h,
            icon: icon(UserPlusIcon),
            onClick: () => setActiveTab("members")
        },
        {
            id: "checklist",
            label: "Checklist",
            description: "Create a checklist to break down tasks",
            kind: "standard",
            height: h,
            icon: icon(CheckIcon),
            onClick: () => setActiveTab("checklist")
        },
        {
            id: "attachment",
            label: "Attachment",
            description: "Attach files, documents, and more",
            kind: "standard",
            height: h,
            icon: icon(PaperClipIcon),
            disabled: true,
        },
        {
            id: "location",
            label: "Location",
            description: "Add a location to this card",
            kind: "standard",
            height: h,
            icon: icon(MapPinIcon),
            disabled: true,
        },
        {
            id: "custom",
            label: "Custom Field",
            description: "Add a custom field to this card",
            kind: "standard",
            height: h,
            icon: icon(SparklesIcon),
            disabled: true,
        },
    ]

    const widthByTab: Record<CardAddTab, number> = {
        menu: 310,
        labels: 300,
        dates: 300,
        members: 300,
        checklist: 300,
    };

    const resolvedHeightByTab: Record<CardAddTab, number> = {
        menu: Math.max(300, menuContentHeight),
        labels: Math.max(220, labelsContentHeight),
        dates: Math.max(420, datesContentHeight),
        members: Math.max(280, membersContentHeight),
        checklist: Math.max(220, checklistContentHeight),
    };

    const panelClass = (tab: CardAddTab) => `absolute inset-0 text-neutral-300 overflow-hidden transition-all duration-200 ease-out ${activeTab === tab
        ? "opacity-100 translate-x-0 pointer-events-auto"
        : "opacity-0 translate-x-2 pointer-events-none"
        }`;

    return (
        <>
            <ActionMenuWrapper
                ref={ref}
                Title="Add to card"
                onClose={onClose}
                onBack={activeTab !== "menu" ? () => setActiveTab("menu") : undefined}
                width={widthByTab[activeTab]}
                style={{ paddingTop: "10px" }}
                titleStyle={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "14px", fontWeight: 600 }}>
                <div className="relative" style={{ height: `${resolvedHeightByTab[activeTab]}px` }}>
                    <div className={panelClass("menu")}>
                        <div ref={menuContentRef}>
                            <DropDown items={menuItems} />
                        </div>
                    </div>

                    <div className={panelClass("labels")}>
                        <div ref={labelsContentRef}>
                            <CardLabelMenu onClose={onClose} cardID={cardId} headless />
                        </div>
                    </div>

                    <div className={panelClass("dates")}>
                        <div ref={datesContentRef}>
                            <CardDatesMenu onClose={onClose} cardId={cardId} headless />
                        </div>
                    </div>

                    <div className={panelClass("members")}>
                        <div ref={membersContentRef}>
                            <CardMembersMenu onClose={onClose} cardId={cardId} headless />
                        </div>
                    </div>

                    <div className={panelClass("checklist")}>
                        <div ref={checklistContentRef}>
                            <CardChecklistMenu onClose={onClose} headless />
                        </div>
                    </div>
                </div>
            </ActionMenuWrapper>

        </>

    )
});