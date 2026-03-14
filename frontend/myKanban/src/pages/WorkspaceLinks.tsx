import { WorkspaceShareLinks } from "@/components/OffersLists/WorkspaceShareLinks";
import { useOutletContext } from "react-router-dom";

type OutletCtx = { showOnlyFiltered: boolean }

export function WorkspaceLinks() {
    const { showOnlyFiltered } = useOutletContext<OutletCtx>();
    return (
        <div className="w-full flex flex-col items-center justify-start pb-8">

            <WorkspaceShareLinks showOnlyActive={showOnlyFiltered} />
        </div>
    )
}