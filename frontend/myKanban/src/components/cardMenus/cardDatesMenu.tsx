import { forwardRef, useEffect, useState } from "react";
import type { MenuItemExtended } from "@/types/uiTypes";
import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry";
import { useParams } from "react-router";
import { DropDown } from "../menuElements/DropDown";
import { ActionMenuWrapper } from "../modals/ListActionsMenu";
import { LabeledButtonPresetB, LabeledButtonPresetBSubmit } from "../buttons/labeledButton";
import { headerStyle, PADDING_X } from "./cardMenuStyle";

import { type DateRange, DayPicker } from "react-day-picker";
import { useCardsStore } from "@/stores/cardsStore";
import { useChecklistStore } from "@/stores/checklistStore";
import { DateTimeSelectorField } from "../common/DateTimeSelectorField";
import type { AsyncRequestKey } from "@/stores/asyncRequestTypes";
import { useAsyncKey } from "@/stores/asyncRequestStore";
import { useDelayedExecute } from "@/hooks/useDelayedExecute";

const DATE_FIELD_LEFT_PADDING = 35;


type CardDatesMenuProps = {
    onClose: () => void;
    entryID?: string;
    cardId?: string;
    boardId?: string;
    listCardId?: string;
    source?: "board" | "inbox" | "inbox-mirror";
    headless?: boolean;
    contextKey?: "editmodal" | "cardmenu";
}

export const CardDatesMenu = forwardRef<HTMLDivElement, CardDatesMenuProps>(({ onClose, entryID, cardId, boardId, listCardId, source = "board", headless = false, contextKey = "editmodal" }, ref) => {

    const { delayedExecute } = useDelayedExecute(onClose)
    const boardID = boardId ?? useParams().boardId as string;
    const cardID = cardId ?? useParams().cardId as string;
    const cardActions = useCardActionRegistry();
    const setCardDates = cardActions.setDatesForCard;
    const setInboxCardDates = cardActions.setDatesForInboxCard;
    const setEntryDueDate = cardActions.setDueDateForChecklistEntry;
    const isEntryMode = !!entryID;
    const isInboxMode = source === "inbox" || source === "inbox-mirror";

    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

    const isStartDateSelected = !!startDate;
    const isDueDateSelected = !!dueDate;
    const isRangeSelected = isStartDateSelected && isDueDateSelected;
    const key = useAsyncKey("card:edit:dates:add", `${contextKey}:${cardID}`)
    const removeKey = useAsyncKey("card:edit:dates:remove", `${contextKey}:${cardID}`)

    const handleSave = async () => {
        if (isEntryMode && entryID) {
            const result = await setEntryDueDate(boardID, cardID, entryID, dueDate ?? null);
            if (result !== null) onClose();
            return;
        }

        const exec = async () => {
            const result = isInboxMode
                ? await setInboxCardDates(cardID, startDate ?? null, dueDate ?? null, key)
                : await setCardDates(boardID, cardID, startDate ?? null, dueDate ?? null, key, listCardId);
            if (result !== null) onClose();
        }

        delayedExecute(exec, 200)

    }

    const handleRemove = async () => {
        if (isEntryMode && entryID) {
            setDueDate(undefined);
            const result = await setEntryDueDate(boardID, cardID, entryID, null);
            if (result !== null) {
                onClose();
            }
            return;
        }
        setStartDate(undefined);
        setDueDate(undefined);
        const exec = async () => {
            const result = isInboxMode
                ? await setInboxCardDates(cardID, null, null, removeKey)
                : await setCardDates(boardID, cardID, null, null, removeKey, listCardId);
            if (result !== null) {
                onClose();
            }
        }
        exec();
        //delayedExecute(exec, 200)
    }

    const card = useCardsStore((state) => state.cardsById[cardID]);
    const entry = useChecklistStore((state) => entryID ? state.EntryInChecklistById[entryID] : undefined);
    const from = card?.StartDate ? new Date(card.StartDate) : undefined;
    const to = card?.EndDate ? new Date(card.EndDate) : undefined;
    const entryDueDate = entry?.Entry.DueDate ? new Date(entry.Entry.DueDate) : undefined;

    useEffect(() => {
        if (isEntryMode) {
            setStartDate(undefined);
            setDueDate(entryDueDate);
            return;
        }
        setStartDate(from);
        setDueDate(to);
    }, [isEntryMode, card?.StartDate, card?.EndDate, entry?.Entry.DueDate]);

    const handleSingleSelect = (date: Date | undefined) => {
        if (!date) return;

        if (isEntryMode) {
            setDueDate(date);
            return;
        }

        if (isStartDateSelected && !isDueDateSelected) {
            setStartDate(date);
            return;
        }

        if (!isStartDateSelected && isDueDateSelected) {
            setDueDate(date);
            return;
        }

        setStartDate(date);
    }

    const handleRangeSelect = (range: DateRange | undefined) => {
        setStartDate(range?.from);
        setDueDate(range?.to);
    }

    const calendarMode = isEntryMode ? "single" : (isRangeSelected ? "range" : "single");
    const calendarSelectedDate = isEntryMode
        ? dueDate
        : (isStartDateSelected ? startDate : dueDate);
    const calendarSelectedRange = isRangeSelected
        ? { from: startDate, to: dueDate }
        : undefined;
    const menuItems: MenuItemExtended[] = [


        {
            id: "dateRangeSelector", label: "Date Range Selector", kind: "custom",
            customElement: () => <DateRangeSelector
                mode={calendarMode}
                selectedDate={calendarSelectedDate}
                selectedRange={calendarSelectedRange}
                onSelectSingle={handleSingleSelect}
                onSelectRange={handleRangeSelect} />,
        },
        ...(!isEntryMode ? [
            { id: "startDateHeader", label: "Start Date", kind: "header", style: { ...headerStyle } },
            {
                id: "startDateSelector", label: "Start Date Selector", kind: "custom",
                customElement: () => <DateTimeSelectorField
                    value={startDate}
                    enabled={isStartDateSelected}
                    onEnabledChange={(enabled) => setStartDate(enabled ? (startDate ?? new Date()) : undefined)}
                    onChange={setStartDate}
                    leftPadding={DATE_FIELD_LEFT_PADDING}
                />,
            },
        ] as MenuItemExtended[] : []),
        { id: "dueDateHeader", label: isEntryMode ? "Date" : "Due Date", kind: "header", style: { ...headerStyle } },
        {
            id: "dueDateSelector", label: "Due Date Selector", kind: "custom",
            customElement: () => <DateTimeSelectorField
                value={dueDate}
                enabled={isDueDateSelected}
                onEnabledChange={(enabled) => setDueDate(enabled ? (dueDate ?? new Date()) : undefined)}
                onChange={setDueDate}
                leftPadding={DATE_FIELD_LEFT_PADDING}
            />,
        },
        {
            id: "footer", label: "", kind: "custom",
            customElement: () => <FormFooter onSave={handleSave} onRemove={handleRemove} />,
        }
    ]

    const content = (
        <>
            <div className="relative w-full h-full mb-3" />
            <DropDown items={menuItems} onClick={onClose} />
        </>
    );

    if (headless) {
        return (
            <div style={{ width: "300px", paddingTop: "10px", paddingBottom: "14px", paddingLeft: PADDING_X, paddingRight: PADDING_X }}>
                {content}
            </div>
        );
    }

    const Title = isEntryMode ? "Date" : "Dates";

    const requestKeys: AsyncRequestKey[] = isEntryMode
        ? ["checklist:entry:edit"]
        : ["card:edit:dates"];



    return (
        <>
            <ActionMenuWrapper
                requestGroups={[
                    {
                        requestKey: requestKeys,
                        minLoadingMs: 0,
                        maxErrorMs: 3000,
                        minSuccessMs: 1000,
                        show: ["loading", "error", "success"]
                    },
                ]}
                Title={Title}
                onClose={onClose}
                width={550}
                style={{ width: "300px", paddingTop: "10px", paddingBottom: "14px", paddingLeft: PADDING_X, paddingRight: PADDING_X }}
                titleStyle={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "14px", fontWeight: 600 }}>
                {content}
            </ActionMenuWrapper>

        </>
    )
});

type DateRangeSelectorProps = {
    mode: "single" | "range";
    selectedDate?: Date;
    selectedRange?: DateRange;
    onSelectSingle: (date: Date | undefined) => void;
    onSelectRange: (range: DateRange | undefined) => void;
    placeholder?: string;
}
const DateRangeSelector = ({ selectedDate, selectedRange, onSelectSingle, onSelectRange, mode }: DateRangeSelectorProps) => {
    return (
        <div

            className="relative flex flex-row w-full gap-2 justify-center items-center mt-4 mb-3">

            {mode === "range" ? (
                <DayPicker
                    mode="range"
                    showOutsideDays
                    selected={selectedRange}
                    onSelect={onSelectRange}
                    classNames={{
                        root: "w-full rounded-md p-0 text-neutral-300",

                        dropdown: "absolute top-full left-0 mt-2",
                        month_caption: "text-center mb-2 ",
                        caption_label: "text-[15px] font-semibold",
                        nav: " absolute -top-1 w-full flex-row flex items-center justify-between",
                        button_previous: "h-8 w-12 p-4 items-center justify-center flex  rounded-md text-neutral-300/70 transition-colors hover:bg-menubtn hover:text-neutral-300",
                        button_next: "h-8 w-12 p-4 items-center justify-center flex  rounded-md text-neutral-300/70 transition-colors hover:bg-menubtn hover:text-neutral-300",
                        chevron: "fill-current",
                        month_grid: "w-full border-spacing-y-0 p-0",
                        weekdays: "grid grid-cols-7 gap-0.5 mb-2",
                        weekday: "text-center text-[14px] font-semibold text-neutral-300/65",
                        week: "grid grid-cols-7",
                        day: "relative flex items-center justify-center p-0",
                        day_button: "h-[32px] w-12 rounded-md text-[14px] font-medium text-text/90 transition-colors hover:bg-menubtn",
                        outside: "text-neutral-300/40",
                        today: "[&>button]:rounded-none [&>button]:border-b-2 [&>button]:border-accent [&>button]:text-accent",
                        selected: "[&>button]:rounded-md [&>button]:bg-active [&>button]:text-accent",
                        range_start: "[&>button]:rounded-md [&>button]:bg-active [&>button]:text-accent",
                        range_middle: "[&>button]:rounded-md [&>button]:bg-active/50 [&>button]:text-neutral-400",
                        range_end: "[&>button]:rounded-md [&>button]:bg-active [&>button]:text-accent",

                    }}
                />
            ) : (
                <DayPicker
                    mode="single"
                    showOutsideDays
                    selected={selectedDate}
                    onSelect={onSelectSingle}
                    classNames={{
                        root: "w-full rounded-md p-0 text-neutral-300",

                        dropdown: "absolute top-full left-0 mt-2",
                        month_caption: "text-center mb-2 ",
                        caption_label: "text-[15px] font-semibold",
                        nav: " absolute -top-1 w-full flex-row flex items-center justify-between",
                        button_previous: "h-8 w-12 p-4 items-center justify-center flex  rounded-md text-neutral-300/70 transition-colors hover:bg-menubtn hover:text-neutral-300",
                        button_next: "h-8 w-12 p-4 items-center justify-center flex  rounded-md text-neutral-300/70 transition-colors hover:bg-menubtn hover:text-neutral-300",
                        chevron: "fill-current",
                        month_grid: "w-full border-spacing-y-0 p-0",
                        weekdays: "grid grid-cols-7 gap-0.5 mb-2",
                        weekday: "text-center text-[14px] font-semibold text-neutral-300/65",
                        week: "grid grid-cols-7",
                        day: "relative flex items-center justify-center p-0",
                        day_button: "h-[32px] w-12 rounded-md text-[14px] font-medium text-text/90 transition-colors hover:bg-menubtn",
                        outside: "text-neutral-300/40",
                        today: "[&>button]:rounded-none [&>button]:border-b-2 [&>button]:border-accent [&>button]:text-accent",
                        selected: "[&>button]:rounded-md [&>button]:bg-active [&>button]:text-accent",
                    }}
                />
            )}

        </div>
    )
}

type FormFooterProps = {
    onSave?: () => void;
    onRemove?: () => void;
}
const FormFooter = ({ onSave, onRemove }: FormFooterProps) => {
    return (
        <div className=" py-1 flex flex-col gap-1.5 mt-4">
            <LabeledButtonPresetBSubmit
                label={"Save"} onClick={onSave ?? (() => { })}
                className="h-[35px]"
            />
            <LabeledButtonPresetB label={"Remove"} onClick={onRemove ?? (() => { })}
                className="h-[35px] font-inter text-neutral-300"
            />
        </div>
    )
}