import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertFromMarkdownString, $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { CodeNode } from "@lexical/code";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import {
    $createParagraphNode,
    $createTextNode,
    $getNearestNodeFromDOMNode,
    $getSelection,
    $isElementNode,
    $isRangeSelection,
    $isTextNode,
    FORMAT_TEXT_COMMAND,
    CLICK_COMMAND,
    COMMAND_PRIORITY_HIGH,
    COMMAND_PRIORITY_LOW,
    KEY_BACKSPACE_COMMAND,
    KEY_DELETE_COMMAND, type LexicalNode,
} from "lexical";
import { $setBlocksType } from "@lexical/selection";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { createPortal } from "react-dom";
import {
    LexicalTypeaheadMenuPlugin,
    MenuOption,
    useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { type TextNode } from "lexical";
import { $createLinkNode, $isLinkNode, } from "@lexical/link";
import { DropDown } from "../menuElements/DropDown";
import { CommonMenuWrapper } from "../menuElements/menuWrapper";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import type { MenuItemExtended } from "@/types/uiTypes";
import { ChevronDownIcon, Heading1Icon, Heading2Icon, Heading3Icon, ListIcon, ListOrderedIcon, PilcrowIcon, QuoteIcon } from "lucide-react";

export type MentionSearchUser = {
    ID: string;
    Name: string;
    Username: string;
    AvatarUrl: string;
};

export type MentionBadgeClickPayload = {
    userID: string;
    anchorEl: HTMLElement;
};

type MentionClickMode = "view-only" | "always" | "modifier";

type MentionSearchFn = (query: string) => Promise<MentionSearchUser[]>

type Props = {
    value: string; // markdown in ingresso
    onChangeMarkdown: (next: string) => void; // markdown live in uscita
    onBlurSave: () => void;
    isEditing?: boolean;
    setIsEditing?: (editing: boolean) => void;
    className?: string;
    style?: React.CSSProperties;
    placeholder?: string;
    placeholdeClassName?: string;

    enableMentions?: boolean;
    onMentionSearch?: MentionSearchFn
    mentionMinLength?: number;
    mentionMaxResults?: number;

    onMentionBadgeClick?: (payload: MentionBadgeClickPayload) => void;
    mentionClickMode?: MentionClickMode;
    mode?: mdEditorMode;
    toolbarLayout?: mdToolbarLayout;
};

type ToolbarBtnProps = {
    label: string;
    title: string;
    onClick: () => void;
};

function ToolbarBtn({ label, title, onClick }: ToolbarBtnProps) {
    return (
        <button
            type="button"
            title={title}
            className="md-toolbar-btn
            bg-transparent border-none text-neutral-400
            text-[16px] font-normal tracking-wide
            "
            onMouseDown={(e) => e.preventDefault()} // evita blur dell'editor
            onClick={onClick}
        >
            {label}
        </button>
    );
}

type ToolbarDropdownProps = {
    menuId: string;
    title: string;
    options: { value: string; label: string; icon?: React.ReactNode }[];
    onSelect: (value: string) => void;
    triggerLabel?: string;
    triggerIcon?: React.ReactNode;
};

function ToolbarDropdown({
    menuId,
    title,
    options,
    onSelect,
    triggerLabel,
    triggerIcon,
}: ToolbarDropdownProps) {
    const anchorRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const openOverlay = useOverlayStore((state) => state.open);
    const closeOverlay = useOverlayStore((state) => state.close);
    const isActive = useOverlayStore((state) => state.isActive);

    const items: MenuItemExtended[] = options.map((option) => ({
        id: option.value,
        label: option.label,
        icon: option.icon,
        kind: "standard",
        height: 30,
    }));

    const openMenu = () => {
        const descriptor: OverlayDescriptor = {
            id: menuId,
            render: () => (
                <CommonMenuWrapper ref={panelRef} className="min-w-[160px] !px-0 py-1">
                    <div className="w-full !text-sm !text-neutral-300">
                        <DropDown
                            items={items}
                            onClick={(id) => {
                                onSelect(id);
                                closeOverlay(menuId);
                            }}
                        />
                    </div>
                </CommonMenuWrapper>
            ),
            panelRef,
            anchorRef: anchorRef as React.RefObject<HTMLElement | null>,
            type: "dropdown",
            opts: {
                closeOnClickOutside: true,
                closeOnEscape: true,
                closeOnMouseLeave: false,
                lockBackdrop: false,
            },
            position: {
                placement: "bottom-start",
                offset: [0, 4],
            },
            renderType: "anchored",
            exclusiveGroup: "dropdowns",
        };
        openOverlay(descriptor);
    };

    return (
        <button
            ref={anchorRef}
            type="button"
            title={title}
            className={`md-toolbar-btn bg-transparent border-none text-neutral-400 text-[13px] font-normal tracking-wide px-1.5 flex items-center gap-0.5 ${isActive(menuId) ? "text-neutral-200" : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={openMenu}
        >
            {triggerIcon ?? null}
            {triggerLabel ? <span>{triggerLabel}</span> : null}
            <ChevronDownIcon className="w-3.5 h-3.5" />
        </button>
    );
}

function MarkdownToolbar({ layout = "default" }: { layout?: mdToolbarLayout }) {
    const [editor] = useLexicalComposerContext();
    const headingMenuId = useId();
    const listMenuId = useId();

    const setBlock = (kind: "p" | "h1" | "h2" | "h3" | "quote") => {
        editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;

            if (kind === "p") {
                $setBlocksType(selection, () => $createParagraphNode());
                return;
            }
            if (kind === "quote") {
                $setBlocksType(selection, () => $createQuoteNode());
                return;
            }
            $setBlocksType(selection, () => $createHeadingNode(kind));
        });
    };
    const setLink = () => {
        const url = window.prompt("Inserisci URL (vuoto per rimuovere link)");
        if (url === null) return;
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.trim() ? url.trim() : null);
    };

    const setList = (kind: "ul" | "ol") => {
        if (kind === "ul") {
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
            return;
        }
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    };

    if (layout === "compact") {
        return (
            <div className="md-toolbar py-1.5 px-1 gap-1 flex flex-row items-center flex-nowrap bg-neutral-900/70 overflow-x-auto scrollbar-hidden">
                <ToolbarBtn label="B" title="Bold" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")} />
                <ToolbarBtn label="I" title="Italic" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")} />
                <ToolbarBtn label="U" title="Underline" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")} />
                <ToolbarBtn label="S" title="Strike" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")} />
                <ToolbarBtn label="{" title="Inline code" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")} />

                <ToolbarDropdown
                    menuId={`md-toolbar-heading-${headingMenuId}`}
                    title="Heading"
                    triggerLabel="H"
                    options={[
                        { value: "p", label: "Paragraph", icon: <PilcrowIcon className="w-4 h-4" /> },
                        { value: "h1", label: "Heading 1", icon: <Heading1Icon className="w-4 h-4" /> },
                        { value: "h2", label: "Heading 2", icon: <Heading2Icon className="w-4 h-4" /> },
                        { value: "h3", label: "Heading 3", icon: <Heading3Icon className="w-4 h-4" /> },
                        { value: "quote", label: "Quote", icon: <QuoteIcon className="w-4 h-4" /> },
                    ]}
                    onSelect={(value) => setBlock(value as "p" | "h1" | "h2" | "h3" | "quote")}
                />

                <ToolbarDropdown
                    menuId={`md-toolbar-list-${listMenuId}`}
                    title="List"
                    triggerIcon={<ListIcon className="w-4 h-4" />}
                    options={[
                        { value: "ul", label: "Bullet list", icon: <ListIcon className="w-4 h-4" /> },
                        { value: "ol", label: "Numbered list", icon: <ListOrderedIcon className="w-4 h-4" /> },
                    ]}
                    onSelect={(value) => setList(value as "ul" | "ol")}
                />

                <ToolbarBtn label="🔗" title="Link" onClick={setLink} />
            </div>
        );
    }

    return (
        <div className="md-toolbar py-1.5  gap-0 flex flex-row justify-between bg-neutral-900/70">
            <ToolbarBtn label="B" title="Bold" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")} />
            <ToolbarBtn label="I" title="Italic" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")} />
            <ToolbarBtn label="U" title="Underline" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")} />
            <ToolbarBtn label="S" title="Strike" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")} />
            <ToolbarBtn label="{" title="Inline code" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")} />

            <ToolbarBtn label="P" title="Paragraph" onClick={() => setBlock("p")} />
            <ToolbarBtn label="H1" title="Heading 1" onClick={() => setBlock("h1")} />
            <ToolbarBtn label="H2" title="Heading 2" onClick={() => setBlock("h2")} />
            <ToolbarBtn label="H3" title="Heading 3" onClick={() => setBlock("h3")} />
            <ToolbarBtn label="❝" title="Quote" onClick={() => setBlock("quote")} />

            <ToolbarBtn label="•" title="Bullet list" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} />
            <ToolbarBtn label="1." title="Numbered list" onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)} />
            <ToolbarBtn label="🔗" title="Link" onClick={setLink} />
        </div>
    );
}

class MentionOption extends MenuOption {
    user: MentionSearchUser;
    constructor(user: MentionSearchUser) {
        super(user.Name)
        this.user = user;
    }
}

function mentionLabel(user: MentionSearchUser): string {
    const raw = (user.Name?.trim() || user.Username?.trim() || user.ID).replace(
        /[\[\]\(\)\r\n]/g,
        ""
    );
    return raw.replace(/\s+/g, " ").trim() || user.ID;

}

/*function mentionToken(user: MentionSearchUser): string {
    return `@[${mentionLabel(user)}](user:${user.ID}) `;
}*/

function normalizeMentionTokens(markdown: string): string {
    if (!markdown) return "";
    // Legacy: @[Nome](user:id) -> Canonico: [@Nome](user:id)
    return markdown.replace(
        /@\[([^\]\r\n]+)\]\(user:([^) \t\r\n]+)\)/g,
        (_m, rawLabel: string, userID: string) => {
            const label = rawLabel.trim().replace(/^@+/, "");
            return `[@${label}](user:${userID})`;
        }
    );
}

function getMentionFromNode(node: LexicalNode | null | undefined): LinkNode | null {
    if (!node) return null;
    if ($isLinkNode(node) && node.getURL().startsWith("user:")) return node;
    const parent = node.getParent();
    if ($isLinkNode(parent) && parent.getURL().startsWith("user:")) return parent;
    return null;
}

function $getMentionAtCursor(isBackward: boolean): LinkNode | null {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || !selection.isCollapsed()) return null;

    const anchor = selection.anchor;
    const node = anchor.getNode();

    const direct = getMentionFromNode(node);
    if (direct) return direct;

    if ($isTextNode(node)) {
        if (isBackward && anchor.offset === 0) return getMentionFromNode(node.getPreviousSibling());
        if (!isBackward && anchor.offset === node.getTextContentSize()) return getMentionFromNode(node.getNextSibling());
        return null;
    }

    if ($isElementNode(node)) {
        const idx = isBackward ? anchor.offset - 1 : anchor.offset;
        return getMentionFromNode(node.getChildAtIndex(idx));
    }

    return null;
}

function MentionDeletePlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        const removeMention = (isBackward: boolean) => {
            let handled = false;

            editor.update(() => {
                const mention = $getMentionAtCursor(isBackward);
                if (!mention) return;

                // pulizia spazio adiacente
                const next = mention.getNextSibling();
                if ($isTextNode(next) && next.getTextContent().startsWith(" ")) {
                    next.spliceText(0, 1, "", true);
                    if (next.getTextContentSize() === 0) next.remove();
                }

                mention.remove();
                handled = true;
            });

            return handled;
        };

        const offBackspace = editor.registerCommand(
            KEY_BACKSPACE_COMMAND,
            () => removeMention(true),
            COMMAND_PRIORITY_HIGH
        );

        const offDelete = editor.registerCommand(
            KEY_DELETE_COMMAND,
            () => removeMention(false),
            COMMAND_PRIORITY_HIGH
        );

        return () => {
            offBackspace();
            offDelete();
        };
    }, [editor]);

    return null;
}


function MentionBadgeClickPlugin({
    isEditing,
    clickMode = "view-only",
    onMentionBadgeClick,
}: {
    isEditing?: boolean;
    clickMode?: MentionClickMode;
    onMentionBadgeClick?: (payload: MentionBadgeClickPayload) => void;
}) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!onMentionBadgeClick) return;

        return editor.registerCommand<MouseEvent>(
            CLICK_COMMAND,
            (event) => {
                const target = event.target as HTMLElement | null;
                const anchor = target?.closest("a") as HTMLAnchorElement | null;
                if (!anchor) return false;

                if (clickMode === "view-only" && isEditing) return false;
                if (clickMode === "modifier" && !(event.metaKey || event.ctrlKey)) return false;



                let userID = "";

                editor.read(() => {
                    const nearest = $getNearestNodeFromDOMNode(anchor);
                    const parent = nearest?.getParent();
                    const link = $isLinkNode(nearest) ? nearest : ($isLinkNode(parent) ? parent : null);
                    const url = link?.getURL() ?? "";
                    if (url.startsWith("user:")) userID = url.slice("user:".length).trim();
                });

                if (!userID) return false;
                event.preventDefault();
                event.stopPropagation();
                onMentionBadgeClick({ userID, anchorEl: anchor });
                return true;
            },
            COMMAND_PRIORITY_LOW
        );
    }, [editor, onMentionBadgeClick, clickMode, isEditing]);

    return null;
}


function MentionsPlugin({
    searchUsers,
    minLength = 1,
    maxResults = 8,
}: {
    searchUsers: MentionSearchFn;
    minLength?: number;
    maxResults?: number;
}) {
    const [query, setQuery] = useState<string | null>(null);
    const [options, setOptions] = useState<MentionOption[]>([]);

    const triggerFn = useBasicTypeaheadTriggerMatch("@", {
        minLength,
        maxLength: 75,
        allowWhitespace: true,
    });
    useEffect(() => {
        let active = true;
        const q = (query ?? "").trim();

        if (!q || q.length < minLength) {
            setOptions([]);
            return;
        }

        const timer = window.setTimeout(async () => {
            try {
                const users = await searchUsers(q);

                if (!active) return;

                const seen = new Set<string>();
                const next: MentionOption[] = [];
                for (const u of users) {
                    if (!u.ID || seen.has(u.ID)) continue;
                    seen.add(u.ID);
                    next.push(new MentionOption(u));
                    if (next.length >= maxResults) break;
                }
                setOptions(next);
            } catch {
                if (active) setOptions([]);
            }
        }, 120);
        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [query, searchUsers, minLength, maxResults]);

    const onSelectOption = useCallback(
        (option: MentionOption, textNodeContainingQuery: TextNode | null, closeMenu: () => void, matchingString: string) => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) {
                closeMenu();
                return;
            }

            // rimuove "@query" digitato
            if (textNodeContainingQuery) {
                const replaceLen = matchingString.length + 1;
                if (selection.anchor.key === textNodeContainingQuery.getKey()) {
                    const start = Math.max(0, selection.anchor.offset - replaceLen);
                    textNodeContainingQuery.spliceText(start, replaceLen, "", true);
                } else {
                    const idx = textNodeContainingQuery.getTextContent().lastIndexOf(`@${matchingString}`);
                    if (idx >= 0) textNodeContainingQuery.spliceText(idx, replaceLen, "", true);
                }
            }

            // inserisce badge mention come vero link node
            const linkNode = $createLinkNode(`user:${option.user.ID}`);
            linkNode.append($createTextNode(`@${mentionLabel(option.user)}`));

            const nextSel = $getSelection();
            if ($isRangeSelection(nextSel)) {
                nextSel.insertNodes([linkNode, $createTextNode(" ")]);
            }

            closeMenu();
        },
        []
    );


    return (
        <LexicalTypeaheadMenuPlugin<MentionOption>
            triggerFn={triggerFn}
            options={options}
            onQueryChange={setQuery}
            onSelectOption={onSelectOption}
            anchorClassName="md-mention-anchor"
            menuRenderFn={(anchorElementRef, { options, selectedIndex, setHighlightedIndex, selectOptionAndCleanUp }) => {
                if (!anchorElementRef.current || options.length === 0) return null;
                return createPortal(
                    <div
                        style={{ zIndex: "2000" }}
                        className="w-72 rounded-md border border-neutral-700 bg-neutral-900 shadow-lg p-1">
                        {options.map((opt, i) => {
                            const active = selectedIndex === i;
                            return (
                                <button
                                    key={opt.user.ID}
                                    type="button"
                                    className={`w-full text-left px-3 py-2 rounded ${active ? "bg-neutral-700 text-white" : "text-neutral-200"}`}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onMouseEnter={() => setHighlightedIndex(i)}
                                    onClick={() => selectOptionAndCleanUp(opt)}
                                >
                                    <div className="text-sm font-medium">{mentionLabel(opt.user)}</div>
                                    {opt.user.Username ? (
                                        <div className="text-xs text-neutral-400">@{opt.user.Username}</div>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>,
                    anchorElementRef.current
                );
            }}
        />
    );
}





const MARKDOWN_TRANSFORMERS = TRANSFORMERS;
function MarkdownBridgePlugin({
    value,
    onChangeMarkdown,
}: Pick<Props, "value" | "onChangeMarkdown">) {
    const [editor] = useLexicalComposerContext();
    const lastSyncedRef = useRef<string>("__INIT__");
    const isApplyingExternalRef = useRef(false);

    useEffect(() => {
        const external = normalizeMentionTokens(value ?? "");
        if (external === lastSyncedRef.current) return;

        isApplyingExternalRef.current = true;
        editor.update(
            () => {
                $convertFromMarkdownString(external, MARKDOWN_TRANSFORMERS);
            },
            { tag: "external-sync" }
        );
        lastSyncedRef.current = external;

        queueMicrotask(() => {
            isApplyingExternalRef.current = false;
        });
    }, [editor, value]);



    return (
        <OnChangePlugin
            ignoreSelectionChange
            onChange={(editorState, _editor, tags) => {
                if (isApplyingExternalRef.current) return;
                if (tags.has("external-sync")) return;

                editorState.read(() => {
                    const md = normalizeMentionTokens($convertToMarkdownString(MARKDOWN_TRANSFORMERS));
                    if (md === lastSyncedRef.current) return;
                    lastSyncedRef.current = md;
                    onChangeMarkdown(md);
                });
            }}
        />
    );
}
type mdEditorMode = "display" | "ready-to-edit"
type mdToolbarLayout = "default" | "compact";

export default function CardDescriptionMdEditor({ style, value, onChangeMarkdown,
    onBlurSave, isEditing, setIsEditing, className, enableMentions,
    onMentionSearch, mentionMinLength, mentionMaxResults, onMentionBadgeClick,
    mentionClickMode = "view-only", mode = "ready-to-edit", placeholder, placeholdeClassName,
    toolbarLayout = "default",

}: Props) {
    const initialConfig = {
        namespace: "CardDescriptionEditor",
        onError: (err: Error) => console.error(err),
        nodes: [
            HeadingNode,
            QuoteNode,
            ListNode,
            ListItemNode,
            LinkNode,
            AutoLinkNode,
            CodeNode],
        theme: {
            paragraph: "md-editor-paragraph",
            quote: "md-editor-quote",
            code: "md-editor-code",
            link: "md-editor-link",
            heading: {
                h1: "md-editor-h1",
                h2: "md-editor-h2",
                h3: "md-editor-h3",
            },
            list: {
                ul: "md-editor-ul",
                ol: "md-editor-ol",
                listitem: "md-editor-li",
            },
            text: {
                bold: "md-editor-text-bold",
                italic: "md-editor-text-italic",
                underline: "md-editor-text-underline",
                strikethrough: "md-editor-text-strike",
                code: "md-editor-text-code",
            },
        },
    };

    const resolvedClassName = className ? `${className} ` : `md-editor-shell rounded-md relative overflow-hidden transition-transform ${isEditing
        ? 'border !bg-menusec' : "-ml-1.5 bg-transparent border-none"}`;

    const isInteractive = mode === "ready-to-edit";

    const doNothing = () => { };

    const placeholderResolved = placeholder ?? "Scrivi la descrizione...";
    return (

        <div
            className={resolvedClassName}

            onClick={(e) => {
                const target = e.target as HTMLElement | null;
                if (target?.closest('a[href="about:blank"], a[href^="user:"]')) {
                    e.currentTarget.blur();
                    return;
                }
                isInteractive ? setIsEditing?.(true) : null;
                if (target?.closest("a")) return;

            }}
            spellCheck={isEditing ? false : false}
            onBlurCapture={(e) => {
                const next = e.relatedTarget as Node | null;
                if (next && e.currentTarget.contains(next)) return;
                //onBlurSave();
            }}
        >
            {isEditing && (
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] ring-inset ring-2 ring-blue-500/75"
                />
            )}

            <LexicalComposer initialConfig={initialConfig}>
                <div className={`${isEditing ? "cursor-auto" : "cursor-pointer"} relative z-10`}>
                    {isEditing && <MarkdownToolbar layout={toolbarLayout} />}
                    <div className={`${isEditing ? "" : "h-full"}`}>
                        <RichTextPlugin

                            contentEditable={<ContentEditable
                                style={style}
                                onClickCapture={isEditing ? doNothing :
                                    (e) => e.currentTarget.blur()

                                }
                                spellCheck={isEditing ? false : false}
                                className={`md-editor-root max-h-30 pt-2 
                                    ${isEditing ? "min-h-[180px] pl-5" : "min-h-0"} 
                                    px-2 outline-none overflow-auto scrollbar-hidden`} />}
                            placeholder={<div className={`md-editor-placeholder ${placeholdeClassName ?? ""} px-3 -translate-y-2.5`}>{placeholderResolved}</div>}
                            ErrorBoundary={LexicalErrorBoundary}
                        />
                    </div>
                </div>
                <HistoryPlugin />

                <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
                <MarkdownBridgePlugin value={value}
                    onChangeMarkdown={
                        onChangeMarkdown
                    } />
                <MentionDeletePlugin />
                <MentionBadgeClickPlugin
                    isEditing={isEditing}
                    clickMode={mentionClickMode}
                    onMentionBadgeClick={onMentionBadgeClick}
                />
                {isEditing && enableMentions && onMentionSearch ? (
                    <MentionsPlugin
                        searchUsers={onMentionSearch}
                        minLength={mentionMinLength}
                        maxResults={mentionMaxResults}
                    />
                ) : null}
            </LexicalComposer>


        </div>

    );
}
