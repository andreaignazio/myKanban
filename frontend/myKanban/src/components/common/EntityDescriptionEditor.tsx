import { useEffect, useState } from "react";
import { LabeledButtonPresetB, LabeledButtonPresetBSubmit } from "../buttons/labeledButton";
import CardDescriptionMdEditor from "../cardMenus/cardDescriptionMdEditor";
import { coerceDescription } from "@/hooks/descriptionAdapters";
import { headerStyle } from "../cardMenus/cardMenuStyle";

type EntityDescriptionEditorProps = {
    entityKey: string;
    value?: unknown;
    onSave: (nextValue: string) => Promise<void> | void;
    title?: string;
    maxLength?: number;
    paddingLeft?: string;
    icon?: React.ReactNode;
    showHeading?: boolean;
    compactTopbar?: boolean;
    closedContainerClassName?: string;
    emptyPlaceholderText?: string;
    editingPlaceholderClassName?: string;
    closedPlaceholderClassName?: string;
};

export function EntityDescriptionEditor({
    entityKey,
    value,
    onSave,
    title = "Description",
    maxLength = 100_000,
    paddingLeft = "0px",
    icon,
    showHeading = true,
    compactTopbar = false,
    closedContainerClassName,
    emptyPlaceholderText = "Add a more detailed description...",
    editingPlaceholderClassName,
    closedPlaceholderClassName,
}: EntityDescriptionEditorProps) {
    const initialValue = coerceDescription(value);

    const [draft, setDraft] = useState(initialValue);
    const [base, setBase] = useState(initialValue);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const isDirty = draft !== base;
    const overLimit = draft.length > maxLength;
    const isEmpty = draft.trim().length === 0;
    const closedContainerBaseClassName = isEmpty
        ? "border rounded-md h-16 border-neutral-500"
        : "-ml-1.5 bg-transparent border-none";
    const editingPlaceholderBaseClassName = "absolute top-[60px] pl-5 font-inter font-normal";
    const closedPlaceholderBaseClassName = "font-inter font-semibold absolute top-[20px] left-0 pl-3";

    useEffect(() => {
        const remote = coerceDescription(value);
        if (saving) return;
        if (isDirty) return;
        setDraft(remote);
        setBase(remote);
    }, [value, saving, isDirty]);

    useEffect(() => {
        const remote = coerceDescription(value);
        setDraft(remote);
        setBase(remote);
        setError(null);
    }, [entityKey]);

    const save = async () => {
        if (saving || !isDirty || overLimit) return;

        setSaving(true);
        setError(null);
        try {
            await onSave(draft);
            setBase(draft);
        } catch {
            setError("Salvataggio descrizione fallito");
        } finally {
            setSaving(false);
        }
    };

    const handleSave = () => {
        setIsEditing(false);
        void save();
    };

    const handleCancel = () => {
        setIsEditing(false);
        setDraft(base);
        setError(null);
    };

    return (
        <div className="relative flex w-full flex-col items-start justify-start">
            {icon}
            <div style={{ paddingLeft }} className="w-full">
                {showHeading && (
                    <div className="flex items-center justify-between mt-[8px] mb-2">
                        <span style={headerStyle}>{title}</span>
                    </div>
                )}

                <CardDescriptionMdEditor
                    key={entityKey}
                    value={draft}
                    onChangeMarkdown={setDraft}
                    onBlurSave={handleSave}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    toolbarLayout={compactTopbar ? "compact" : "default"}
                    className={`md-editor-shell rounded-md relative overflow-hidden transition-transform ${isEditing
                        ? "border !bg-menusec"
                        : `${closedContainerBaseClassName} ${closedContainerClassName ?? ""}`.trim()}`}
                    placeholder={`${isEditing ? " Make your description even better with markdown..." : emptyPlaceholderText}`}
                    placeholdeClassName={`${isEditing
                        ? `${editingPlaceholderBaseClassName} ${editingPlaceholderClassName ?? ""}`.trim()
                        : `${closedPlaceholderBaseClassName} ${closedPlaceholderClassName ?? ""}`.trim()}`}
                />

                {isEditing && (
                    <>
                        <div className="mt-1 text-xs text-neutral-400">{draft.length}/{maxLength}</div>
                        {overLimit && <div className="mt-1 text-xs text-red-400">Limite superato ({maxLength})</div>}
                        {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
                    </>
                )}

                {(isEditing || saving) && (
                    <div className="flex flex-row justify-start items-center gap-1.5 mt-2">
                        <LabeledButtonPresetBSubmit
                            onClick={handleSave}
                            label={saving ? "Saving..." : "Save"}
                            disabled={!isDirty || saving || overLimit}
                        />
                        <LabeledButtonPresetB
                            onClick={handleCancel}
                            label="Cancel"
                            className="font-inter font-extralight !bg-neutral-700 !text-neutral-300"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
