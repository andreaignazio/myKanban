import { useEffect, useRef, useState } from "react";
import { SquareCheckBig } from "lucide-react";
import { PADDING_L } from "../../modals/CardDetailMenu";
import { LabeledButtonPresetA } from "../../buttons/labeledButton";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";

type ChecklistHeaderProps = {
    initialTitle: string;
    onSaveTitle: (title: string) => void;
    onDeleteChecklist: () => void;
    onToggleHideCheckedItems: () => void;
    hideCheckedItems: boolean;
    dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

export const ChecklistHeader = ({ initialTitle, onSaveTitle, onDeleteChecklist, onToggleHideCheckedItems, hideCheckedItems, dragHandleProps }: ChecklistHeaderProps) => {
    const [title, setTitle] = useState(initialTitle);
    const [isFocused, setIsFocused] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTitle(initialTitle);
    }, [initialTitle]);

    const handleOnTitleBlur = () => {
        const currentTitle = titleInputRef.current?.value || "Checklist";
        if (currentTitle !== initialTitle) {
            onSaveTitle(currentTitle);
        }
    }

    return (
        <div className="flex flex-row items-center justify-between gap-2">
            <div
                {...dragHandleProps}
                className="absolute h-4 cursor-grab active:cursor-grabbing text-neutral-300"
            >
                <SquareCheckBig className="h-4" />
            </div>

            <div style={{ paddingLeft: PADDING_L }}
                className="font-bold text-sm w-full">
                <div className={`flex flex-row overflow-hidden cursor-pointer
                    bg-transparent w-full text-neutral-100 px-1 -mx-1 rounded-[4px] h-8 transition-colors
                    ${isFocused
                        ? 'border border-blue-500 ring-inset ring-2 ring-opacity-75 ring-blue-500'
                        : ''}`}>
                    <input
                        ref={titleInputRef}
                        className="bg-transparent cursor-pointer focus:cursor-text focus:outline-none" value={title}
                        onFocus={() => setIsFocused(true)}
                        onChange={(e) => setTitle(e.currentTarget.value)}
                        onBlur={() => {
                            setIsFocused(false);
                            handleOnTitleBlur();
                        }} />
                </div>
            </div>

            <div className={`flex flex-row text-xs gap-2 ${isFocused ? "hidden" : "visible"}`}>
                <LabeledButtonPresetA label={hideCheckedItems ? "Show checked items" : "Hide checked items"} onClick={onToggleHideCheckedItems}
                    className="rounded-[2.5px] font-inter  font-light tracking-wide px-3.5" />
                <LabeledButtonPresetA label={"Delete"} onClick={onDeleteChecklist}
                    className="rounded-[2.5px] font-inter font-light tracking-wide px-3.5" />
            </div>
        </div>
    )
}
