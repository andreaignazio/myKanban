type DateTimeParts = {
    date: string; // "dd/mm/yyyy"
    time?: string; // "HH:mm" (opzionale)
};

export type DateObject = {
    date: string; // "dd/mm/yyyy"
    time: string; // "HH:mm"
}

export function useDateTimeParser() {


    function stringifyDate(date: Date | undefined): DateObject | undefined {
        if (!date) return undefined;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const datePart = `${day}/${month}/${year}`;
        const timePart = `${hours}:${minutes}`;
        const dateObj = { date: datePart, time: timePart };
        return dateObj;
    }

    function stringifyDatePretty(date: Date | undefined, hideYear?: boolean): DateObject | undefined {
        if (!date) return undefined;
        const formattedDateRaw = new Intl.DateTimeFormat('it-IT', {
            day: '2-digit',
            month: 'short',
            year: hideYear ? undefined : 'numeric',
        })
            .format(date)
            .replace('.', '');

        const dateParts = formattedDateRaw.split(/\s+/);
        if (dateParts[1]) {
            dateParts[1] = dateParts[1].charAt(0).toUpperCase() + dateParts[1].slice(1).toLowerCase();
        }
        const formattedDate = dateParts.join(' ');

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const timePart = `${hours}:${minutes}`;

        return { date: formattedDate, time: timePart };
    }

    function stringifyDateTimePretty(dateInput: Date | string | undefined): string {
        if (!dateInput) return "";

        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (Number.isNaN(date.getTime())) return "";

        const formattedDateRaw = new Intl.DateTimeFormat('it-IT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
            .format(date)
            .replace('.', '');

        const dateParts = formattedDateRaw.split(/\s+/);
        if (dateParts[1]) {
            dateParts[1] = dateParts[1].charAt(0).toUpperCase() + dateParts[1].slice(1).toLowerCase();
        }
        const formattedDate = dateParts.join(' ');

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${formattedDate}, ${hours}:${minutes}`;
    }

    function toGoRFC3339({ date, time }: DateTimeParts): string | null {
        const dateMatch = date.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!dateMatch) return null;

        const day = Number(dateMatch[1]);
        const month = Number(dateMatch[2]);
        const year = Number(dateMatch[3]);

        let hours = 0;
        let minutes = 0;

        if (time && time.trim() !== "") {
            const timeMatch = time.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
            if (!timeMatch) return null;
            hours = Number(timeMatch[1]);
            minutes = Number(timeMatch[2]);
        }

        const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

        const isValidExact =
            localDate.getFullYear() === year &&
            localDate.getMonth() === month - 1 &&
            localDate.getDate() === day &&
            localDate.getHours() === hours &&
            localDate.getMinutes() === minutes;

        if (!isValidExact) return null;

        return localDate.toISOString(); // RFC3339 UTC, parseabile da Go
    }
    return {
        toGoRFC3339,
        stringifyDate,
        stringifyDatePretty,
        stringifyDateTimePretty,
    };
}