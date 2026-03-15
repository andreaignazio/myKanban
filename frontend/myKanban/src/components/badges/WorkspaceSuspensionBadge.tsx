import type { UserWorkspace } from "@/stores/types";

type Props = {
    userWorkspace: UserWorkspace | null | undefined;
    /** Renders a small coloured dot instead of a text badge */
    compact?: boolean;
};

export function WorkspaceSuspensionBadge({ userWorkspace, compact }: Props) {
    if (!userWorkspace) return null;

    if (userWorkspace.IsSuspended) {
        if (compact) {
            return <div className="h-2 w-2 rounded-full bg-red-500 ring-1 ring-black/40" />;
        }
        return (
            <span className="rounded px-1 py-0 text-[10px] font-semibold leading-4 bg-red-600/30 text-red-300 ring-1 ring-red-500/40">
                Suspended
            </span>
        );
    }

    if (userWorkspace.IsPendingSuspend) {
        if (compact) {
            return <div className="h-2 w-2 rounded-full bg-amber-500 ring-1 ring-black/40" />;
        }
        return (
            <span className="rounded px-1 py-0 text-[10px] font-semibold leading-4 bg-amber-600/30 text-amber-300 ring-1 ring-amber-500/40">
                Suspending
            </span>
        );
    }

    return null;
}
