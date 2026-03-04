import { useEffect, useState } from "react";
import { Check, Square } from "lucide-react";
import { CustomInput } from "../menuElements/CustomInput";

type DateTimeSelectorFieldProps = {
    value?: Date;
    onChange: (date: Date | undefined) => void;
    enabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
    leftPadding?: number;
};

export function DateTimeSelectorField({
    value,
    onChange,
    enabled,
    onEnabledChange,
    leftPadding = 14,
}: DateTimeSelectorFieldProps) {
    const [time, setTime] = useState<string>("");
    const [internalDate, setInternalDate] = useState<string>("");

    const formatDate = (date: Date | undefined) => {
        if (!date) return "";
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const parseDateFromInput = (inputValue: string): Date | undefined => {
        const match = inputValue.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!match) return undefined;

        const day = Number(match[1]);
        const month = Number(match[2]);
        const year = Number(match[3]);

        const parsedDate = new Date(year, month - 1, day);
        const isExact =
            parsedDate.getFullYear() === year &&
            parsedDate.getMonth() === month - 1 &&
            parsedDate.getDate() === day;

        return isExact ? parsedDate : undefined;
    };

    const parseTimeFromInput = (inputValue: string): { hours: number; minutes: number } | undefined => {
        const match = inputValue.trim().match(/^(\d{2}):(\d{2})$/);
        if (!match) return undefined;

        const hours = Number(match[1]);
        const minutes = Number(match[2]);
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return undefined;

        return { hours, minutes };
    };

    const getTimeFromDate = (date: Date | undefined) => {
        if (!date) return "";
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    };

    useEffect(() => {
        setInternalDate(formatDate(value));
        setTime(getTimeFromDate(value));
    }, [value]);

    const handleDateBlur = () => {
        const parsedDate = parseDateFromInput(internalDate);
        if (!parsedDate) {
            setInternalDate(formatDate(value));
            return;
        }

        const current = value ? new Date(value) : new Date();
        parsedDate.setHours(current.getHours());
        parsedDate.setMinutes(current.getMinutes());
        parsedDate.setSeconds(0, 0);

        setInternalDate(formatDate(parsedDate));
        onChange(parsedDate);
    };

    const handleTimeBlur = () => {
        const parsedTime = parseTimeFromInput(time);
        if (!parsedTime) {
            setTime(getTimeFromDate(value));
            return;
        }

        const current = value ? new Date(value) : new Date();
        current.setHours(parsedTime.hours);
        current.setMinutes(parsedTime.minutes);
        current.setSeconds(0, 0);
        onChange(current);
    };

    const inputSizeClass = enabled ? "text-[15px]" : "text-[14px]";
    const handleToggleEnabled = () => {
        const nextEnabled = !enabled;
        onEnabledChange(nextEnabled);
    };

    return (
        <div className="flex flex-row w-full items-center justify-start mt-1 mb-3">
            <button
                type="button"
                className="relative w-5 h-5 flex-shrink-0 cursor-pointer"
                onPointerDown={(e) => {
                    e.stopPropagation();
                    handleToggleEnabled();
                }}
            >
                <Square
                    className={`h-5 w-5 ${enabled ? "text-transparent" : "text-gray-500"}`}
                    fill={enabled ? "rgba(102, 157, 241, 1)" : "transparent"}
                />
                {enabled && <Check className="absolute top-[5px] left-[4px] h-3 w-3 text-black/50 pointer-events-none" strokeWidth={4} />}
            </button>

            <div style={{ paddingLeft: leftPadding }} className="flex flex-row h-[30px] gap-2 items-center justify-start">
                <CustomInput
                    placeholder="DD/MM/YYYY"
                    value={internalDate}
                    onBlur={handleDateBlur}
                    onInputChange={(inputRef) => setInternalDate(inputRef?.current?.value ?? "")}
                    className={`w-[110px] ${inputSizeClass}`}
                    isDisabled={!enabled}
                    paddingLeft={6}
                />
                <CustomInput
                    placeholder="HH:MM"
                    value={time}
                    onBlur={handleTimeBlur}
                    onInputChange={(inputRef) => setTime(inputRef?.current?.value ?? "")}
                    className={`w-[90px] ${inputSizeClass}`}
                    isDisabled={!enabled}
                    paddingLeft={6}
                />
            </div>
        </div>
    );
}
