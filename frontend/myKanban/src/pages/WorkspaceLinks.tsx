import { WorkspaceShareLinks } from "@/components/OffersLists/WorkspaceShareLinks";

export function WorkspaceLinks() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center">
            <span className="text-2xl font-medium text-muted">Links</span>
            <WorkspaceShareLinks />
        </div>
    )
}