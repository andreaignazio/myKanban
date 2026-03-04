export type Role = "owner" | "admin" | "member" | "viewer" | undefined;

type UserRoleBadgeProps = {
    role: Role;
    className?: string;
    children?: React.ReactNode;
    isLocked?: boolean;
    onClick?: () => void;
    interactive?: boolean;
    lightBg?: boolean;
}

export function UserRoleBadge({ role, className, children, isLocked = false, onClick, interactive = false, lightBg = false }: UserRoleBadgeProps) {
    const roleBadgeClass = getRoleBadgeClass(role, lightBg);

    return (
        <span
            onClick={onClick}
            className={`${isLocked ? "opacity-50 cursor-not-allowed" : interactive ? "hover:filter hover:brightness-200" : ""} w-fit flex items-center justify-center rounded-full border px-2 py-1 pb-1.5 max-h-6 text-xs font-medium ${roleBadgeClass} ${className || ""}`}>
            {role}
            {children}
        </span>
    )
}

function getRoleBadgeClass(role: Role, lightBg: boolean) {
    switch (role) {
        case "owner":
            return lightBg
                ? "border-amber-600/40 bg-amber-500/10 text-amber-800"
                : "border-amber-500/40 bg-amber-500/15 text-amber-200";
        case "admin":
            return lightBg
                ? "border-sky-700/40 bg-sky-500/10 text-sky-800"
                : "border-sky-500/40 bg-sky-500/15 text-sky-200";
        case "member":
            return lightBg
                ? "border-emerald-700/40 bg-emerald-500/10 text-emerald-800"
                : "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
        case "viewer":
            return lightBg
                ? "border-slate-700/40 bg-slate-500/10 text-slate-500"
                : "border-slate-500/40 bg-slate-500/15 text-slate-200";
        default:
            return lightBg
                ? "border-slate-700/30 bg-slate-500/5 text-slate-700"
                : "border-border/40 bg-surface/40 text-text";
    }
}