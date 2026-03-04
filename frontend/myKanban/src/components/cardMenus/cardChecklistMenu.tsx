import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { forwardRef, useRef, useState, type ComponentType, type RefObject, type SVGProps } from "react";
import type { MenuItemExtended } from "@/types/uiTypes";
import { CardColorSelector, CardCoverMenu, CoverSizeMenu } from "../modals/CardCoverMenu";
import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry";
import { useParams } from "react-router";
import { DropDown } from "../menuElements/DropDown";
import { ActionMenuWrapper } from "../modals/ListActionsMenu";
import { CheckIcon, ClockIcon, PencilIcon, TagIcon, UserPlusIcon, PaperClipIcon, MapPinIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { headerStyle, PADDING_X } from "./cardMenuStyle";
import { UserAvatar } from "../badges/UserAvatar";
import { useUserStore } from "@/stores/userStore";
import { useBoardMembersStore } from "@/stores/boardMembersStore";
import { useCardMembersStore } from "@/stores/CardMembersStore";
import { CustomInput } from "../menuElements/CustomInput";
import { useShallow } from "zustand/shallow";
import { CustomDropDown } from "../menuElements/CustomDropDown";
import { LabeledButtonCustom } from "../buttons/labeledButton";
import { useChecklistStore } from "@/stores/checklistStore";


type CardChecklistMenuProps = {
    onClose: () => void;
    headless?: boolean;
}
export const CardChecklistMenu = forwardRef<HTMLDivElement, CardChecklistMenuProps>(({ onClose, headless = false }, ref) => {
    const boardID = useParams().boardId as string;
    const cardID = useParams().cardId as string;
    const cardActions = useCardActionRegistry();

    const [titleInput, setTitleInput] = useState("");
    const [selectedChecklistSourceId, setSelectedChecklistSourceId] = useState<string | null>(null)
    const resolvedTitle = titleInput.trim()
    const isSubmitDisabled = resolvedTitle.length === 0
    const input = () => {

        return (
            <div className=" py-2 text-gray-500">
                <CustomInput
                    value={titleInput}
                    className={"h-[35px] mb-0 mt-2"}
                    placeholder="Enter label title..."
                    onInputChange={(labelTitleRef) => {
                        labelTitleRef?.current &&
                            setTitleInput(labelTitleRef?.current.value)
                    }} />
            </div>
        )
    }

    const dropdownMenu = (items: MenuItemExtended[], placeholder: string) => {
        return (
            <CustomDropDown items={items}
                btnId={"checklistMenu"}
                activeId={selectedChecklistSourceId}
                onClick={(id) => setSelectedChecklistSourceId(id)}
                placeholderCustom={placeholder}
            />
        )
    }

    const footerBtnRow = (label: string, onClick: () => void | Promise<void>) => {
        return (
            <div className=" py-1 flex flex-col gap-0 mt-4">
                <div className="flex flex-row justify-between items-center gap-2">

                    <LabeledButtonCustom label={label}
                        disabled={isSubmitDisabled}
                        onClick={() => { void onClick() }}
                        className={` relative grid-cols-1 rounded-md h-8 px-4
                             justify-center
                             ${isSubmitDisabled ? "bg-gray-500 opacity-80 text-neutral-200" : "bg-blue-400 text-neutral-900"}
                                   font-medium text-[14px] tracking-wide`} />

                </div>
            </div>
        )
    }

    const handleAddChecklist = async () => {
        if (isSubmitDisabled) return
        await cardActions.addChecklistToCardAtEnd(boardID, cardID, resolvedTitle)
        onClose()
    }

    const handleAddOrCopyChecklist = async () => {
        if (isSubmitDisabled) return
        if (selectedChecklistSourceId) {
            await cardActions.cloneChecklistToCardAtEnd(boardID, cardID, resolvedTitle, selectedChecklistSourceId)
            onClose()
            return
        }
        await handleAddChecklist()
    }

    const checklistsForBoard = useChecklistStore(useShallow((state) => state.getChecklistsForBoard(boardID)));
    const menuItemsCk: MenuItemExtended[] = checklistsForBoard.map((checklistInCard) => ({
        id: checklistInCard.Checklist.ID,
        label: checklistInCard.Checklist.Title,
        kind: "standard"
    }))

    const checklistItems: MenuItemExtended[] = [
        { id: "checklist1", label: "Checklist 1", kind: "standard" },
        { id: "checklist2", label: "Checklist 2", kind: "standard" },
        { id: "checklist3", label: "Checklist 3", kind: "standard" },
    ]

    const h = 48; // Standard height for menu items, can be adjusted as needed
    const menuItems: MenuItemExtended[] = [
        { id: "checklistTitle", label: "Title", kind: "header", style: { ...headerStyle } },
        { id: "searchUser", label: "Search Members", kind: "custom", customElement: input },
        { id: "copyItemsFrom", label: "Copy entries from...", kind: "header", style: { ...headerStyle } },
        { id: "checklistDropdown", label: "Select checklist", kind: "custom", customElement: () => dropdownMenu(menuItemsCk, "Select checklist...") },
        {
            id: "addChecklistBtn",
            label: "Add Checklist",
            kind: "custom",
            customElement: () => footerBtnRow(selectedChecklistSourceId ? "Add & Copy" : "Add", () => handleAddOrCopyChecklist())
        }
    ]

    const content = (
        <>
            <div className="relative w-full h-full mb-3" />
            <DropDown items={menuItems} onClick={onClose} />
        </>
    );

    if (headless) {
        return <div style={{ paddingTop: "10px", paddingInline: PADDING_X }}>{content}</div>;
    }

    const Title = "Add Checklist";
    return (
        <>
            <ActionMenuWrapper Title={Title}
                onClose={onClose}
                width={300}
                style={{ paddingTop: "10px", paddingInline: PADDING_X }}
                titleStyle={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "14px", fontWeight: 600 }}>
                {content}
            </ActionMenuWrapper>

        </>

    )
});
