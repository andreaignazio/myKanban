import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

type Action =
    | { kind: "wrap"; left: string; right?: string }
    | { kind: "prefixLine"; prefix: string }
    | { kind: "prefixLines"; prefix: string }
    | { kind: "replaceSelection"; text: string };

export default function MarkdownMiniEditor() {
    const [value, setValue] = useState<string>("");
    const taRef = useRef<HTMLTextAreaElement | null>(null);

    function apply(action: Action) {
        const ta = taRef.current;
        if (!ta) return;

        const start = ta.selectionStart ?? 0;
        const end = ta.selectionEnd ?? 0;
        const selected = value.slice(start, end);

        const before = value.slice(0, start);
        const after = value.slice(end);

        let next = value;
        let nextCursorStart = start;
        let nextCursorEnd = end;

        const right = action.kind === "wrap" ? (action.right ?? action.left) : "";

        switch (action.kind) {
            case "wrap": {
                // **bold**, _italic_, `code`
                next = before + action.left + selected + right + after;
                if (start === end) {
                    // no selection: place cursor in the middle
                    nextCursorStart = start + action.left.length;
                    nextCursorEnd = nextCursorStart;
                } else {
                    // keep selection wrapped
                    nextCursorStart = start + action.left.length;
                    nextCursorEnd = end + action.left.length;
                }
                break;
            }

            case "prefixLine": {
                // # Heading / ## Heading : apply to current line only
                const lineStart = value.lastIndexOf("\n", start - 1) + 1;
                const lineEnd = value.indexOf("\n", start);
                const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
                const line = value.slice(lineStart, actualLineEnd);

                const newLine = action.prefix + line;
                next = value.slice(0, lineStart) + newLine + value.slice(actualLineEnd);

                const delta = action.prefix.length;
                nextCursorStart = start + delta;
                nextCursorEnd = end + delta;
                break;
            }

            case "prefixLines": {
                // - item / 1. item : apply to each selected line (or current line if none)
                const selStart = start;
                const selEnd = end;

                const blockStart = value.lastIndexOf("\n", selStart - 1) + 1;
                const blockEndIdx = value.indexOf("\n", selEnd);
                const blockEnd = blockEndIdx === -1 ? value.length : blockEndIdx;

                const block = value.slice(blockStart, blockEnd);
                const lines = block.split("\n");
                const prefixed = lines.map((l) => (l.length ? action.prefix + l : l)).join("\n");

                next = value.slice(0, blockStart) + prefixed + value.slice(blockEnd);

                const addedPerNonEmptyLine = action.prefix.length;
                const nonEmptyCount = lines.filter((l) => l.length).length;
                const addedTotal = addedPerNonEmptyLine * nonEmptyCount;

                // crude but good enough for a minimal editor
                nextCursorStart = selStart + addedPerNonEmptyLine;
                nextCursorEnd = selEnd + addedTotal;
                break;
            }

            case "replaceSelection": {
                next = before + action.text + after;
                nextCursorStart = start + action.text.length;
                nextCursorEnd = nextCursorStart;
                break;
            }
        }

        setValue(next);

        // restore cursor/selection after state update
        requestAnimationFrame(() => {
            const t = taRef.current;
            if (!t) return;
            t.focus();
            t.setSelectionRange(nextCursorStart, nextCursorEnd);
        });
    }

    return (
        <div style={{ display: "grid", gap: 12 }}>
            {/* Toolbar */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => apply({ kind: "wrap", left: "**" })}>
                    Bold
                </button>
                <button type="button" onClick={() => apply({ kind: "wrap", left: "_" })}>
                    Italic
                </button>
                <button type="button" onClick={() => apply({ kind: "wrap", left: "`" })}>
                    Code
                </button>

                <span style={{ width: 1, background: "#ddd", margin: "0 4px" }} />

                <button type="button" onClick={() => apply({ kind: "prefixLine", prefix: "# " })}>
                    H1
                </button>
                <button type="button" onClick={() => apply({ kind: "prefixLine", prefix: "## " })}>
                    H2
                </button>
                <button type="button" onClick={() => apply({ kind: "prefixLine", prefix: "### " })}>
                    H3
                </button>

                <span style={{ width: 1, background: "#ddd", margin: "0 4px" }} />

                <button type="button" onClick={() => apply({ kind: "prefixLines", prefix: "- " })}>
                    • List
                </button>
                <button
                    type="button"
                    onClick={() => apply({ kind: "prefixLines", prefix: "1. " })}
                    title="Minimal: always prefixes 1. (Markdown will auto-number)"
                >
                    1. List
                </button>
            </div>

            {/* Editor */}
            <textarea
                ref={taRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Scrivi Markdown…"
                style={{
                    width: "100%",
                    minHeight: 160,
                    padding: 12,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 14,
                }}
            />

            {/* Preview */}
            <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
                <ReactMarkdown>{value || "_Preview…_"}</ReactMarkdown>
            </div>
        </div>
    );
}
