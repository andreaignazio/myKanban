import { Plus } from "lucide-react";

type NoAccessibleWorkspaceStateProps = {
    onCreateWorkspace: () => void;
}

export const NoAccessibleWorkspaceState = ({ onCreateWorkspace }: NoAccessibleWorkspaceStateProps) => {
    return (
        <div className="mx-2 mt-3 rounded-xl border border-neutral-700 bg-slate-500/10 p-3">
            <p className="text-xs text-neutral-400">
                Non sono disponibili workspace a cui hai accesso.
            </p>
            <button
                type="button"
                onClick={onCreateWorkspace}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-slate-700/60 px-3 py-2 text-xs text-neutral-100 hover:bg-slate-700"
            >
                <Plus className="h-4 w-4" />
                Crea workspace
            </button>
        </div>
    );
};
