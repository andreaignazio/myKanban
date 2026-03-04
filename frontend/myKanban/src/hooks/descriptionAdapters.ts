export function coerceDescription(value: unknown): string {
    if (typeof value === "string") return value;
    if (value === null) return "";
    if (typeof value === "object") {
        const maybe = (value as { markdown?: unknown }).markdown;
        if (typeof maybe === "string") return maybe;
    }
    return "";
}

export function isSafeHttpUrl(input?: string): boolean {
    if (!input) return false;
    try {
        const url = new URL(input);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}