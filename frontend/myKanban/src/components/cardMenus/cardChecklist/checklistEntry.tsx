import { useChecklistStore } from "@/stores/checklistStore";
import { useEffect, useImperativeHandle, useRef, useState, type ComponentType, type SVGProps } from "react";
import { useParams } from "react-router-dom";
import { PADDING_L, type Buttons } from "../../modals/CardDetailMenu";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/solid";
import { Archive, Check, ClockIcon, Square, UserPlusIcon } from "lucide-react";
import { LabeledButtonPresetB } from "../../buttons/labeledButton";
import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry";
import { CardMembersMenu } from "../cardMembersMenu";
import { CardRowMenuBtn } from "../cardRowMenus";
import { useOverlayStore } from "@/overlays/overlayStore";
import { InputWrapper } from "../../menuElements/InputWrapper";
import { CardDatesMenu } from "../cardDatesMenu";
import { useDateTimeParser } from "@/hooks/useDateTimeParser";
import { Draggable, type DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { createPortal } from "react-dom";
import { GripVertical } from "lucide-react";
import { EntryActionsDropDown } from "./entryActionsDropDown";

type ChecklistEntryProps = {
    entryId: string;
    checklistId: string;
    index: number;
    ref?: React.Ref<ChecklistEntryHandle>;
    addEntity?: () => void;
    hideWhenDone?: boolean;
}

export type ChecklistEntryHandle = {
    setIsEditing: (value: boolean) => void;
}

export const ChecklistEntry = ({ entryId, checklistId, index, ref, addEntity, hideWhenDone = false }: ChecklistEntryProps) => {
    const boardID = useParams().boardId as string;
    const cardID = useParams().cardId as string;
    const entry = useChecklistStore((state) => state.EntryInChecklistById[entryId]);
    const [isEditing, setIsEditing] = useState(false);
    const [entryTitle, setEntryTitle] = useState(entry.Entry.Title);
    const entryContainerRef = useRef<HTMLDivElement>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    const [isUnsaved, setIsUnsaved] = useState(entry.Entry.Title !== entryTitle);

    const done = entry.Entry.Done;
    const isHiddenDone = hideWhenDone && done;
    const markChecklistEntry = useCardActionRegistry().markChecklistEntry;
    const editChecklistEntryTitle = useCardActionRegistry().editChecklistEntryTitle;

    function onEntryContainerClick(e: React.MouseEvent<HTMLDivElement>) {
        const target = e.target as HTMLElement | null;
        if (target?.closest('[data-entry-menu-btn="true"], [data-entry-menu-btns="true"]')) return;
        if (isEditing) return;
        setIsEditing(true);
        requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
    }

    useImperativeHandle(ref, () => {
        return {
            setIsEditing,
        }
    }, []);


    useEffect(() => {
        if (!isEditing) {
            inputRef.current?.blur();
        }
    }, [isEditing]);

    const handleMarkToggle = (done: boolean) => {
        markChecklistEntry(boardID, cardID, checklistId, entryId, done)
    }

    const handleTitleBlur = () => {
        setIsEditing(false);
        const currentTitle = entryTitle.trim() === "" ? "Checklist entry" : entryTitle;
        if (currentTitle !== entry.Entry.Title) {
            //editChecklistEntryTitle(boardID, cardID, checklistId, entryId, currentTitle)
        }
    }
    const handleSaveTitle = () => {
        setIsEditing(false);
        const currentTitle = entryTitle.trim() === "" ? "Checklist entry" : entryTitle;
        if (currentTitle !== entry.Entry.Title) {
            editChecklistEntryTitle(boardID, cardID, checklistId, entryId, currentTitle)
        }
    }

    const handleCancelEdit = () => {
        setEntryTitle(entry.Entry.Title);
        setIsEditing(false);
    }


    useEffect(() => {

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isEditing) return;
            if (e.key === "Escape") {
                handleCancelEdit();
            }
            if (e.key === "Enter") {
                e.preventDefault();
                handleSaveTitle();
                addEntity?.();
            }
        }
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        }
    }, [isEditing, entryTitle, entry.Entry.Title]);




    useEffect(() => {
        setIsUnsaved(entry.Entry.Title !== entryTitle);
    }, [entryTitle, entry.Entry.Title])

    const overlayStack = useOverlayStore((state) => state.stack);
    useEffect(() => {
        const handlePointerDownOutside = (event: PointerEvent) => {
            let foundActiveForEntry = false;
            overlayStack.forEach((overlay) => {
                if (overlay.id.includes(entryId)) {
                    foundActiveForEntry = true;
                }
            });
            if (foundActiveForEntry) return;
            if (!isEditing) return;
            const target = event.target as Node | null;
            if (target && entryContainerRef.current?.contains(target)) return;
            handleTitleBlur();
        };

        document.addEventListener("pointerdown", handlePointerDownOutside);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDownOutside);
        };
    }, [isEditing, entryTitle, entry.Entry.Title, overlayStack]);

    return (
        <Draggable draggableId={entryId} index={index}>
            {(provided, snapshot) => {
                const entryNode = (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={provided.draggableProps.style}
                        className={`${isHiddenDone ? "opacity-0 h-0 overflow-hidden pointer-events-none" : "opacity-100 h-auto"} transition-all duration-200`}
                    >
                        <div className="relative min-h-8 flex flex-row items-center gap-2 transition-opacity">
                            {<Square className={` absolute top-1 h-5 ${done ? "text-transparent" : "text-gray-500"} translate-y-0.5 cursor-pointer`}
                                fill={done ? "rgba(102, 157, 241, 1)" : "transparent"}
                                onClick={() => handleMarkToggle(done ? false : true)} />}
                            {done && <Check className=" absolute top-2 h-3 text-black/50 translate-y-0.5 pointer-events-none" strokeWidth={4} />}

                            <ChecklistEntryContent
                                checklistId={checklistId}
                                entryId={entryId}
                                isEditing={isEditing}
                                done={done}
                                isUnsaved={isUnsaved}
                                entryTitle={entryTitle}
                                entryContainerRef={entryContainerRef}
                                inputRef={inputRef}
                                onEntryContainerClick={onEntryContainerClick}
                                onEntryTitleChange={setEntryTitle}
                                onSaveTitle={handleSaveTitle}
                                onCancelEdit={handleCancelEdit}
                                setIsEditing={setIsEditing}
                                dragHandleProps={provided.dragHandleProps}
                            />

                        </div >
                    </div>
                );

                if (snapshot.isDragging && typeof document !== "undefined") {
                    return createPortal(entryNode, document.body);
                }

                return entryNode;
            }}
        </Draggable>
    )
}

type ChecklistEntryContentProps = {
    checklistId: string;
    entryId: string;
    isEditing: boolean;
    done: boolean;
    isUnsaved: boolean;
    entryTitle: string;
    entryContainerRef: React.RefObject<HTMLDivElement | null>;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onEntryContainerClick: (e: React.MouseEvent<HTMLDivElement>) => void;
    onEntryTitleChange: (value: string) => void;
    onSaveTitle: () => void;
    onCancelEdit: () => void;
    setIsEditing: (value: boolean) => void;
    dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

const ChecklistEntryContent = ({
    checklistId,
    entryId,
    isEditing,
    done,
    isUnsaved,
    entryTitle,
    entryContainerRef,
    inputRef,
    onEntryContainerClick,
    onEntryTitleChange,
    onSaveTitle,
    onCancelEdit,
    setIsEditing,
    dragHandleProps,
}: ChecklistEntryContentProps) => {



    return (
        <div
            onClick={onEntryContainerClick}
            onPointerDownCapture={() => {
                if (!isEditing) {
                    setIsEditing(false);
                    inputRef.current?.blur();
                }
            }}
            style={{
                paddingLeft: "6px", marginLeft: `calc(${PADDING_L} - 8px)`,
                width: `calc(100% - (${PADDING_L} - 8px))`
            }}
            ref={entryContainerRef}
            className={`text-sm z-10 text-gray-300 
                checklist-entry-content
                rounded-lg 
                ${isEditing
                    ? 'bg-neutral-700/50 p-1.5 pb-2 cursor-default '
                    : 'hover:bg-neutral-700/50 cursor-pointer'}
                 transition-colors
                w-full h-full flex flex-col gap-1.5 items-center `}>

            <div className="flex flex-row w-full items-center justify-between gap-0 pl-1">
                <div
                    {...dragHandleProps}
                    data-entry-menu-btn="true"
                    className={`${isEditing ? "w-0 opacity-0 mr-0" : "w-5 opacity-100 mr-2"} transition-all ease-in-out duration-200 
                    h-5 shrink-0 flex items-center 
                    justify-center text-neutral-400 
                    cursor-grab active:cursor-grabbing`}
                >
                    <GripVertical className="h-3.5 w-3.5" />
                </div>
                <InputWrapper isFocused={isEditing}
                    className={`${isEditing ? "h-9 !mr-1 !mt-1 ps-2" : "!h-4"}
                    transition-all ease-in-out duration-200
                    `

                    } >
                    <input
                        style={{ pointerEvents: !isEditing ? "none" : "auto" }}
                        ref={inputRef}
                        value={entryTitle}
                        onPointerDownCapture={(e) => {
                            if (isEditing) return;
                            e.currentTarget.blur()
                            setIsEditing(false);
                        }}
                        className={`bg-transparent w-full h-full cursor-pointer focus:cursor-text focus:outline-none transition-all duration-200 ${done && !isEditing ? "line-through text-neutral-500" : ""}`}
                        onFocus={() => { }}
                        onBlur={() => { }}
                        onChange={(e) => onEntryTitleChange(e.target.value)}
                    />
                </InputWrapper>
                {!isEditing && <EntryMenuBtns checklistId={checklistId} entryId={entryId} variant="compact" />}
            </div>
            <UnsavedChangesIndicator isVisible={isUnsaved && !isEditing} className=" !absolute top-0" />
            <div className={`flex flex-row w-full 
                relative
                 text-xs items-start justify-between gap-1.5 ${isEditing ? "visible" : "hidden"}`}>

                <div className="flex flex-row gap-1">
                    <LabeledButtonPresetB label={"Save"} onClick={onSaveTitle}
                        className=" font-inter font-extrabold !bg-[#669df1] hover:!bg-[#74a4ed] text-neutral-900 tracking-normal px-3.5" />
                    <LabeledButtonPresetB label={"Cancel"} onClick={onCancelEdit}
                        className=" font-inter font-light !bg-neutral-600/30 tracking-wide px-3.5" />
                </div>
                <UnsavedChangesIndicator isVisible={isUnsaved && isEditing}
                    className="" />
                <EntryMenuBtns checklistId={checklistId} entryId={entryId} variant="default" />
            </div>
        </div>
    )
}

const UnsavedChangesIndicator = ({ isVisible, className }: { isVisible: boolean, className?: string }) => {
    if (!isVisible) return null;
    return (
        <div className={`
        mt-1 w-fit flex items-center pointer-events-none
        justify-center text-neutral-400 font-inter font-light  ${className}`}>
            <span className="border-2 h-6 flex items-center justify-center text-xs border-neutral-400 p-1 px-2 rounded-md">Unsaved changes</span>
        </div>
    )
}

type EntryMenuBtnsProps = {
    checklistId: string;
    entryId: string;
    variant: "default" | "compact";
}

const EntryMenuBtns = ({ checklistId, entryId, variant }: EntryMenuBtnsProps) => {
    const entryMembersIds = useChecklistStore((state) => state.EntryMembersIdsByEntryId);
    const addMemberToEntry = useCardActionRegistry().addMemberToChecklistEntry;
    const removeMemberFromEntry = useCardActionRegistry().removeMemberFromChecklistEntry;
    const deleteChecklistEntry = useCardActionRegistry().deleteChecklistEntry;
    const cardId = useParams().cardId as string;
    const boardID = useParams().boardId as string;
    const ICON_SIZE_CLASS = "w-3.5 h-3.5 aspect-square";
    const iconClassName = `${ICON_SIZE_CLASS} text-neutral-300`;
    const icon = (Icon: ComponentType<SVGProps<SVGSVGElement>>) => <Icon className={iconClassName} />;

    const handleAddMember = (userId: string) => {
        addMemberToEntry(boardID, cardId, checklistId, entryId, userId)
    }
    const handleRemoveMember = (userId: string) => {
        removeMemberFromEntry(boardID, cardId, checklistId, entryId, userId)
    }

    const handleArchiveEntry = async () => {
        await deleteChecklistEntry(boardID, cardId, checklistId, entryId)
    }

    function handleOnButtonClick(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation();
    }

    const rowButtons: Buttons[] = [

        {
            id: "entry.Dates", label: "Dates", icon: icon(ClockIcon),
            onClick: () => console.log("Labels button clicked"),
            menuToOpen: ({ onClose, ref }) => <CardDatesMenu onClose={onClose} ref={ref} entryID={entryId} />
        },

        {
            id: "entry.Members", label: "Members", icon: icon(UserPlusIcon),
            onClick: () => console.log("Members button clicked"),
            menuToOpen: ({ onClose, ref }) => <CardMembersMenu
                onClose={onClose} ref={ref} onMemberClick={(userId) => handleAddMember(userId)}
                onMemberRemove={(userId) => handleRemoveMember(userId)}
                boardId={boardID}
                entryId={entryId} />
        },

        variant === "compact"
            ? {
                id: "entry.Options", label: "", icon: icon(EllipsisHorizontalIcon),
                onClick: () => console.log("Checklist button clicked"),
                menuToOpen: ({ onClose, ref }) => <EntryActionsDropDown onClose={onClose} ref={ref} checklistId={checklistId} entryId={entryId} />
            }
            : {
                id: "entry.Archive", label: "", icon: icon(Archive),
                onClick: () => handleArchiveEntry(),
            },

    ]

    const dueDate = useChecklistStore((state) => state.EntryInChecklistById[entryId]?.Entry.DueDate);
    const isDone = useChecklistStore((state) => state.EntryInChecklistById[entryId]?.Entry.Done);
    const isOverdue = (dueDate ? new Date(dueDate).getTime() < Date.now() : false) && !isDone;
    const hasDates = !!dueDate;
    if (hasDates) {
        const dateObj = dueDate ? new Date(dueDate) : null;
        const parsedDate = dateObj ? useDateTimeParser().stringifyDatePretty(dateObj, true) : "";
        const label = parsedDate ? parsedDate.date : "Set date";
        rowButtons[0].label = label;
    }

    const paddding = variant === "compact" ? "5px" : "12px";
    const style = variant === "compact" ? { padding: paddding } : { paddingLeft: paddding, paddingRight: paddding };
    const h = variant === "compact" ? "" : "h-[32px]";
    const bg = entryMembersIds[entryId] && entryMembersIds[entryId].length > 0 ? "bg-blue-500/20 hover:bg-blue-500/30" : "bg-neutral-700/50 hover:bg-neutral-500/90";
    return (
        <div data-entry-menu-btns="true" className={`flex flex-row gap-1 mr-1 ${variant === "compact" ? "py-1" : ""}`}>
            {rowButtons.map((btn) => (
                <div key={btn.id} className="relative">
                    <div data-entry-menu-btn="true" className="absolute -top-1 -right-1">
                        {btn.id === "entry.Members" && entryMembersIds[entryId] && entryMembersIds[entryId].length > 0 && (
                            <div data-entry-menu-btn="true" className="flex items-center justify-center w-4 h-4 text-xs text-white bg-blue-500 rounded-full">
                                {entryMembersIds[entryId].length}
                            </div>
                        )}
                    </div>
                    {variant === "default" && btn.id === "entry.Archive" && (
                        <div
                            data-entry-menu-btn="true"
                            onPointerDownCapture={(e) => e.stopPropagation()}
                            onClick={async (e) => {
                                e.stopPropagation();
                                await handleArchiveEntry();
                            }}
                            style={{ ...style, border: "none" }}
                            className={`transition-all duration-200 ease-in-out
                                rounded-md aspect-square border border-gray-500/30 px-2 p-1 flex items-center justify-center
                            cursor-pointer text-neutral-300 !bg-neutral-700/50 hover:!bg-neutral-500/30 h-[32px]`}
                        >
                            {btn.icon}
                        </div>
                    )}
                    {!(variant === "default" && btn.id === "entry.Archive") && (
                        <CardRowMenuBtn
                            key={btn.id} cardID={cardId}
                            menuComponent={({ onClose, ref }) => btn.menuToOpen ? btn.menuToOpen({ onClose, ref }) : null}
                            label={btn.label} icon={btn.icon}
                            customId={btn.id + entryId}
                            btnVariant={variant}
                            showLabelWhenCompact={btn.id === "entry.Dates" && hasDates}
                            className={`transition-all duration-200 ease-in-out
                                ${btn.id === "entry.Members" ? bg : "bg-neutral-700 /50 hover:bg-neutral-500/90"} ${h}
                        ${isOverdue && btn.id === "entry.Dates" ? "bg-red-500/20  hover:bg-red-500/30" : ""} `}
                            style={{ ...style, border: "none" }}
                            onButtonClick={handleOnButtonClick}
                        />
                    )}
                </div>
            ))}
        </div>
    )
}
