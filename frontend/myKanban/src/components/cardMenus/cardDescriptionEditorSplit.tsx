import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useMarkdownFormatter } from "@/hooks/useMarkdownFormatter";
import remarkGfm from "remark-gfm";
import { isSafeHttpUrl } from "@/hooks/descriptionAdapters";

type CardDescriptionEditorProps = {
    boardID: string;
    cardID: string;
    value?: string;

    onChangeMarkdown: (next: string) => void;
    onBlurSave: () => void;
}

const MAX_LEN = 10000;

export default function CardDescriptionEditorSplit({ boardID, cardID, value, onChangeMarkdown, onBlurSave }: CardDescriptionEditorProps) {
    const [mode, setMode] = useState<"preview" | "edit">("preview");
    const [draft, setDraft] = useState<string | undefined>(value);
    const [baseValue, setBaseValue] = useState<string | undefined>(value);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [remoteChanged, setRemoteChanged] = useState<boolean>(false);
    const dirty = draft !== baseValue;
    const cardActionRegistry = useCardActionRegistry();
    const { taRef, applyFormat } = useMarkdownFormatter(draft, setDraft);
    const save = async () => {
        if (!dirty || saving || draft.length > 10000) return;
        setSaving(true);
        setError(null);
        try {
            await cardActionRegistry.setCardDescription(boardID, cardID, draft);
            setBaseValue(draft);
            //setMode("preview");
            setRemoteChanged(false);
        } catch (e) {
            setError("Failed to save description. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    function handleBlurContainer(e: React.FocusEvent<HTMLDivElement>) {
        const next = e.relatedTarget as Node | null;
        if (next && e.currentTarget.contains(next)) return; // focus is still within the container
        void save();
        setMode("preview");
    }

    function onEditorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        const mod = e.ctrlKey || e.metaKey;
        if (!mod) return;

        const k = e.key.toLowerCase();
        if (k === "b") { e.preventDefault(); applyFormat({ kind: "wrap", left: "**" }); }
        if (k === "i") { e.preventDefault(); applyFormat({ kind: "wrap", left: "_" }); }
        if (k === "k") { e.preventDefault(); applyFormat({ kind: "wrap", left: "[", right: "](https://)" }); }
    }


    return (
        <>
            <button
                onClick={() => {
                    if (mode === "preview") {
                        setMode("edit");
                        setDraft(baseValue);
                    } else {
                        void save();
                        setMode("preview");
                    }
                }}
                className="text-lg"
            >
                {mode === "preview" ? "Edit" : "Close"}
            </button>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({ ...props }) => (
                        <a {...props} target="_blank" rel="noopener noreferrer" className="underline" />
                    ),
                    img: ({ src, alt }) =>
                        isSafeHttpUrl(src) ? <img src={src} alt={alt ?? ""} className="max-w-full rounded-md" /> : null,
                }}
            >
                {draft || "_Nessuna descrizione_"}

            </ReactMarkdown>
            {
                mode === "edit" && (
                    <textarea
                        ref={taRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
                        onKeyDown={onEditorKeyDown}
                        rows={10}
                        placeholder="Scrivi la descrizione in Markdown..."
                        className="w-full min-h-[180px] resize-y rounded-md border border-gray-500/40 bg-transparent p-3 text-sm font-mono text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        aria-label="Card description markdown editor"
                    />
                )
            }
            <div
                className="rounded-md border border-gray-500/40 p-2"
                onBlurCapture={(e) => {
                    const next = e.relatedTarget as Node | null;
                    if (next && e.currentTarget.contains(next)) return;
                    onBlurSave();
                }}
            >
                {/* Lexical editor */}
            </div>

        </>

    )
}