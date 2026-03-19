import { Clock } from "lucide-react";

export type DateBadgeTone = "default" | "done" | "overdue" | "dueSoon";

export type DateBadgeTextClasses = {
    isDoneColorClass?: string;
    isOverdueColorClass?: string;
    isDueSoonColorClass?: string;
    defaultColorClass?: string;
    isDoneTextColorClass?: string;
    isOverdueTextColorClass?: string;
    isDueSoonTextColorClass?: string;
    defaultTextColorClass?: string;
};

type DateStatusBadgeProps = {
    label: string;
    tone?: DateBadgeTone;
    rowHeight?: number;
    className?: string;
    showIcon?: boolean;
    dataTextClasses?: DateBadgeTextClasses;
};

export function DateStatusBadge({
    label,
    tone = "default",
    rowHeight = 28,
    className,
    showIcon = true,
    dataTextClasses,
}: DateStatusBadgeProps) {
    let {
        isDoneColorClass,
        isOverdueColorClass,
        isDueSoonColorClass,
        defaultColorClass,
        isDoneTextColorClass,
        isOverdueTextColorClass,
        isDueSoonTextColorClass,
        defaultTextColorClass,
    } = dataTextClasses || {};

    isDoneColorClass = isDoneColorClass || "bg-[#94c748]";
    isOverdueColorClass = isOverdueColorClass || "bg-[#5d1f1a]";
    isDueSoonColorClass = isDueSoonColorClass || "bg-[#fbc828]";
    defaultColorClass = defaultColorClass || "transparent";
    isDoneTextColorClass = isDoneTextColorClass || "text-zinc-900";
    isOverdueTextColorClass = isOverdueTextColorClass || "text-rose-200";
    isDueSoonTextColorClass = isDueSoonTextColorClass || "text-neutral-900";
    defaultTextColorClass = defaultTextColorClass || "text-inherit";

    const colorClass =
        tone === "done"
            ? isDoneColorClass
            : tone === "overdue"
                ? isOverdueColorClass
                : tone === "dueSoon"
                    ? isDueSoonColorClass
                    : defaultColorClass;

    const textClass =
        tone === "done"
            ? isDoneTextColorClass
            : tone === "overdue"
                ? isOverdueTextColorClass
                : tone === "dueSoon"
                    ? isDueSoonTextColorClass
                    : defaultTextColorClass;

    return (
        <div
            className={`flex shrink-0 items-center w-fit whitespace-nowrap text-xs px-1 rounded ${textClass} ${colorClass} ${className || ""}`}
            style={{ height: rowHeight }}
        >
            {showIcon && <Clock className="w-3 h-3 inline-block me-1" />}
            {label}
        </div>
    );
}
