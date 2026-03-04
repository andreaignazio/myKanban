import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry";
import { useBoardDetailStore } from "@/stores/boardDetailStore";
import type { MenuItemExtended } from "@/types/uiTypes";
import { ArrowRight, Sparkles, Trash2 } from "lucide-react";
import { forwardRef } from "react";
import { useParams } from "react-router";
import { DropDown } from "../../menuElements/DropDown";
import { ActionMenuWrapper } from "../../modals/ListActionsMenu";

type EntryActionsDropDownProps = {
    onClose: () => void;
    checklistId: string;
    entryId: string;
}

export const EntryActionsDropDown = forwardRef<HTMLDivElement, EntryActionsDropDownProps>(({ onClose, checklistId, entryId }, ref) => {
    const boardID = useParams().boardId as string;
    const cardID = useParams().cardId as string;
    const cardActions = useCardActionRegistry();
    const getRootListIdForCardId = useBoardDetailStore((state) => state.getRootListIdForCardId);
    const listID = getRootListIdForCardId(cardID);

    const handleConvertToCard = async () => {
        if (!listID) return;
        await cardActions.convertChecklistEntry(boardID, cardID, checklistId, entryId, listID);
        onClose();
    }

    const handleDeleteEntry = async () => {
        await cardActions.deleteChecklistEntry(boardID, cardID, checklistId, entryId);
        onClose();
    }

    const iconClassName = "w-4 h-4 text-neutral-400";
    const h = 32;

    const items: MenuItemExtended[] = [
        {
            id: "entry.convert.to.card",
            label: "Convert to card",
            kind: "standard",
            height: h,
            icon: <Sparkles className={iconClassName} />,
            endIcon: <ArrowRight className="w-4 h-4 text-neutral-500" />,
            disabled: !listID,
            onClick: () => { void handleConvertToCard(); },
            description: !listID ? "List not found" : undefined,
        },
        { id: "entry.actions.divider", label: "", kind: "divider" },
        {
            id: "entry.delete",
            label: "Delete entry",
            kind: "standard",
            height: h,
            icon: <Trash2 className={iconClassName} />,
            onClick: () => { void handleDeleteEntry(); },
        },
    ];

    return (
        <ActionMenuWrapper
            ref={ref}
            Title="Entry Actions"
            width={250}
            onClose={onClose}
        >
            <div className="relative" style={{ height: "110px" }}>
                <DropDown items={items} />
            </div>
        </ActionMenuWrapper>
    )
})
