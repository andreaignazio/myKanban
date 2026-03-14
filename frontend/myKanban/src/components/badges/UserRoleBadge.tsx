export type Role = "owner" | "admin" | "member" | "viewer" | undefined;

type UserRoleBadgeProps = {
    role: Role;
    className?: string;
    children?: React.ReactNode;
    isLocked?: boolean;
    onClick?: () => void;
    interactive?: boolean;
    lightBg?: boolean;
    solidBg?: boolean;
    shadow?: boolean;
}

export function UserRoleBadge({ role, className, children, isLocked = false, onClick, interactive = false, lightBg = false, solidBg = false, shadow = false }: UserRoleBadgeProps) {
    const roleBadgeClass = getRoleBadgeClass(role, lightBg, solidBg, shadow);

    const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : "No access";

    return (

        <span
            onClick={onClick}
            className={`${isLocked ? "opacity-50 cursor-not-allowed" : interactive ? "hover:filter hover:brightness-200" : ""}
             w-fit flex items-center justify-center rounded-full border 
             px-4 py-2 max-h-12 text-xs font-medium
             border-none
             ${roleBadgeClass} ${className || ""}`}>
            {roleLabel}
            {children}
        </span>

    )
}

export function getRoleBadgeClass(role: Role, lightBg: boolean, solidBg: boolean, shadow: boolean) {
    const shadowClass = shadow ? " shadow-sm" : "";
    if (solidBg) {
        switch (role) {
            case "owner":
                return `bg-gradient-to-br from-amber-700 to-amber-500 text-amber-100 border-amber-600/40${shadowClass}`;
            case "admin":
                return `bg-gradient-to-br from-sky-700 to-sky-500 text-sky-100 border-sky-600/40${shadowClass}`;
            case "member":
                return `bg-gradient-to-br from-teal-700 to-teal-500 text-teal-100 border-teal-600/40${shadowClass}`;
            case "viewer":
                return `bg-gradient-to-br from-slate-600 to-slate-500 text-slate-100 border-slate-500/40${shadowClass}`;
            default:
                return `bg-gradient-to-br from-slate-700 to-slate-600 text-slate-100 border-slate-600/40${shadowClass}`;
        }
    }
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