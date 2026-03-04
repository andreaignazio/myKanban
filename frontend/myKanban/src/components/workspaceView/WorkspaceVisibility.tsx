import { GlobeAltIcon, LockClosedIcon } from "@heroicons/react/24/solid";



type WorkspaceVisibilityProps = {
    visibility: string;
    mode?: "compact" | "detailed";
    showColor?: boolean;
}

export function WorkspaceVisibility({ visibility, mode = "detailed", showColor = false }: WorkspaceVisibilityProps) {
    const visibilityText = visibility === "public" ? "Public" : "Private";
    return (
        <div className={`flex flex-row justify-start items-baseline mt-0.5 gap-1 text-xs ${showColor ? (visibility === "public" ? "text-green-500" : "text-red-500") : "text-neutral-500"}`}>

            {visibility === "public" ? (
                <GlobeAltIcon className="h-3 " />
            ) : (
                <LockClosedIcon className="h-3 " />
            )}
            {mode === "detailed" && visibilityText}
        </div>
    );
}