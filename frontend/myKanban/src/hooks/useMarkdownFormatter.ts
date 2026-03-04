import { useRef } from "react";

type FormatAction =
    | { kind: "wrap"; left: string; right?: string }
    | { kind: "prefixLine"; prefix: string }
    | { kind: "prefixLines"; prefix: string }
    | { kind: "replace"; text: string };

const MAX_LEN = 10000;

export function useMarkdownFormatter(draft: string, setDraft: (value: string) => void) {
    const taRef = useRef<HTMLTextAreaElement | null>(null);

    function applyFormat(action: FormatAction) {
        const ta = taRef.current;
        if (!ta) return;
        const start = ta.selectionStart ?? 0;
        const end = ta.selectionEnd ?? 0;
        const selected = draft.slice(start, end);

        const before = draft.slice(0, start);
        const after = draft.slice(end);

        let next = draft;
        let selStart = start;
        let selEnd = end;

        if (action.kind === "wrap") {
            const right = action.right ?? action.left;
            next = before + action.left + selected + right + after;
            if (start === end) {
                selStart = start + action.left.length;
                selEnd = selStart;
            } else {
                selStart = start + action.left.length;
                selEnd = end + action.left.length;
            }
        }
        if (action.kind === "prefixLines") {
            const blockStart = draft.lastIndexOf("\n", start - 1) + 1;
            const blockEndIdx = draft.indexOf("\n", end);
            const blockEnd = blockEndIdx === -1 ? draft.length : blockEndIdx;

            const block = draft.slice(blockStart, blockEnd);
            const lines = block.split("\n");
            const nonEmpty = lines.filter((l) => l.trim().length > 0);
            const allPrefixed = nonEmpty.length > 0 && nonEmpty.every((l) => l.startsWith(action.prefix));

            const newLines = lines.map((l) => {
                if (!l.trim()) return l;
                return allPrefixed ? l.slice(action.prefix.length) : action.prefix + l;
            });

            const newBlock = newLines.join("\n");
            next = draft.slice(0, blockStart) + newBlock + draft.slice(blockEnd);

            // selezione semplice e stabile: tutto il blocco trasformato
            selStart = blockStart;
            selEnd = blockStart + newBlock.length;
        }

        if (action.kind === "replace") {
            next = before + action.text + after;
            selStart = start + action.text.length;
            selEnd = selStart;
        }

        if (next.length > MAX_LEN) return;
        setDraft(next);

        requestAnimationFrame(() => {
            const t = taRef.current;
            if (!t) return;
            t.focus();
            t.setSelectionRange(selStart, selEnd);
        });
    }

    return { taRef, applyFormat };
}