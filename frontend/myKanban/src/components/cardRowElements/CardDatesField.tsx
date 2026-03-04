import { useDateTimeParser } from "@/hooks/useDateTimeParser"

import { UserAvatar } from "@/components/badges/UserAvatar"
import { useUserStore } from "@/stores/userStore"

import type { Card } from "@/stores/types"
import { DateStatusBadge, type DateBadgeTextClasses } from "./DateStatusBadge"

const CARD_ROW_FIELDS_HEIGHT = 28
type CardDatesFieldProps = {
    card?: Card | null;
    rowHeight: number;
    cardHasDates: boolean;
    className?: string;
    dataTextClasses?: DataTextClasses;
    showIfNoDates?: boolean;
}

export type DataTextClasses = {
    isDoneColorClass?: string;
    isOverdueColorClass?: string;
    isDueSoonColorClass?: string;
    defaultColorClass?: string;
    isDoneTextColorClass?: string;
    isOverdueTextColorClass?: string;
    isDueSoonTextColorClass?: string;
    defaultTextColorClass?: string;
}


export const CardDatesField = ({ card, rowHeight, cardHasDates, className, dataTextClasses, showIfNoDates }: CardDatesFieldProps) => {

    let { isDoneColorClass,
        isOverdueColorClass,
        isDueSoonColorClass,
        defaultColorClass,
        isDoneTextColorClass,
        isOverdueTextColorClass,
        isDueSoonTextColorClass,
        defaultTextColorClass } = dataTextClasses || {}


    isDoneColorClass = isDoneColorClass || "bg-[#94c748]"
    isOverdueColorClass = isOverdueColorClass || "bg-[#5d1f1a]"
    isDueSoonColorClass = isDueSoonColorClass || "bg-[#fbc828]"
    defaultColorClass = defaultColorClass || "transparent"
    isDoneTextColorClass = isDoneTextColorClass || "text-neutral-900"
    isOverdueTextColorClass = isOverdueTextColorClass || "text-rose-200"
    isDueSoonTextColorClass = isDueSoonTextColorClass || "text-neutral-900"
    defaultTextColorClass = defaultTextColorClass || "text-inherit"

    const now = new Date()

    const from = card?.StartDate ? new Date(card.StartDate) : undefined;
    const to = card?.EndDate ? new Date(card.EndDate) : undefined;

    const isDone = !!card?.Done
    const isOverdue = to ? to < now : false
    const isStartingSoon = from ? from > now && from.getTime() - now.getTime() < 24 * 60 * 60 * 1000 : false
    const isDueSoon = to ? to > now && to.getTime() - now.getTime() < 24 * 60 * 60 * 1000 : false
    const tone = isDone ? "done" : isOverdue ? "overdue" : isDueSoon ? "dueSoon" : "default"

    const parseDateTime = useDateTimeParser().stringifyDatePretty;
    const fromDateTime = from ? parseDateTime(from, true) : undefined;
    const toDateTime = to ? parseDateTime(to, true) : undefined;


    const label = fromDateTime && toDateTime
        ? `${fromDateTime.date}-${toDateTime.date}`
        : fromDateTime
            ? `${fromDateTime.date}`
            : toDateTime
                ? `${toDateTime.date}`
                : "Set dates";

    if (!cardHasDates && !showIfNoDates) return null
    return (
        <DateStatusBadge
            label={cardHasDates ? label : ""}
            tone={tone}
            rowHeight={rowHeight}
            className={className}
            dataTextClasses={{
                isDoneColorClass,
                isOverdueColorClass,
                isDueSoonColorClass,
                defaultColorClass,
                isDoneTextColorClass,
                isOverdueTextColorClass,
                isDueSoonTextColorClass,
                defaultTextColorClass,
            } as DateBadgeTextClasses}
        />
    )
}