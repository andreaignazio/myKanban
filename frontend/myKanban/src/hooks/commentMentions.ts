type MentionUserLike = {
    ID: string;
    Username?: string | null;
};

const TOKEN_RE = /(?:@\[[^\]\r\n]+\]|\[@[^\]\r\n]+\])\(user:([^) \t\r\n]+)\)/g;
const RAW_USERNAME_RE = /(^|[^@\w])@([a-zA-Z0-9._-]{2,32})\b/g;
const CODE_RE = /```[\s\S]*?```|`[^`\n]*`/g;

export function extractMentionedUserIDs(
    markdown: string,
    usersById: Record<string, MentionUserLike>
): string[] {
    if (!markdown) return [];

    const ids = new Set<string>();

    // 1) token stabile @[...](user:<id>)
    for (const m of markdown.matchAll(TOKEN_RE)) {
        ids.add(m[1]);
    }

    // 2) fallback @username (ignora blocchi code)
    const clean = markdown.replace(CODE_RE, " ");
    const usernameToId = new Map<string, string>();
    Object.values(usersById).forEach((u) => {
        if (u.Username) usernameToId.set(u.Username.toLowerCase(), u.ID);
    });

    for (const m of clean.matchAll(RAW_USERNAME_RE)) {
        const id = usernameToId.get(m[2].toLowerCase());
        if (id) ids.add(id);
    }

    return [...ids];
}
