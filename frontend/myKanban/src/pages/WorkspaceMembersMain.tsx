import { LabeledButtonCustom } from "@/components/buttons/labeledButton";
import { OverlayRootDummy } from "@/components/menu/OverlayRootDummy";
import { CustomInput } from "@/components/menuElements/CustomInput";
import { SearchModal } from "@/components/modals/searchmodal";
import { ShareActionModal } from "@/components/modals/ShareActionModal";
import { WorkspaceShareLinks } from "@/components/OffersLists/WorkspaceShareLinks";
import { UserRow } from "@/components/UserRow";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import type { UserWorkspace } from "@/stores/types";
import { useUserStore } from "@/stores/userStore";
import { useWsMembersStore } from "@/stores/wsMembersStore";
import { BriefcaseBusiness } from "lucide-react";
import { use, useEffect, useRef, useState } from "react";
import { useMatch, useParams } from "react-router-dom";
import { useShallow } from "zustand/shallow";

export function WorkspaceMembersMain() {
    const workspaceID = useParams().workspaceId as string;
    const membersIds = useWsMembersStore(useShallow((state) => state.userIdsByWorkspaceId[workspaceID] ?? []));
    const openOverlay = useOverlayStore((state) => state.open);
    const onMenuClose = useOverlayStore((state) => state.close);
    const membersById = useWsMembersStore(useShallow((state) => state.userWorkspacesByWorkspaceId[workspaceID] ?? {}));

    const [visibleIds, setVisibleIds] = useState<string[]>(membersIds);
    const [currentSearch, setCurrentSearch] = useState("");

    const isMembersRoute = useMatch("/workspaces/:workspaceId/members/");
    const isGuestsRoute = useMatch("/workspaces/:workspaceId/members/guests/*");

    const panelRef = useRef<HTMLDivElement | null>(null)

    const roles = ["member", "admin", "owner"] as const;

    /*useEffect(() => {
        if (!membersIds) return;
        setVisibleIds(membersIds.map(id => membersById[id]).filter((m) => m.Role !== "viewer").map((m) => m.UserID))
    }, [membersIds, membersById])*/

    const filterCallback = (member: UserWorkspace) => {
        if (!isGuestsRoute) {
            return member.Role !== "viewer";
        } else if (isGuestsRoute) {
            return member.Role === "viewer";
        } else {
            return true;
        }
    }


    useEffect(() => {
        console.log("Filtering members with search term", currentSearch, "using membersIds", membersIds, "and membersById", membersById);
        const handleSearch = () => {
            if (!membersIds) return;
            const searchTerm = currentSearch.trim().toLowerCase();
            const filteredIds = membersIds.filter((id) => {
                const member = membersById[id];
                const user = useUserStore.getState().usersById[member.UserID];
                return user?.Name.toLowerCase().includes(searchTerm ?? "") || user?.Username.toLowerCase().includes(searchTerm ?? "");
            }).map(id => membersById[id]).filter(filterCallback).map((m) => m.UserID)
                ;
            setVisibleIds(filteredIds);
        }
        handleSearch();
    }, [membersIds, membersById, currentSearch, isMembersRoute, isGuestsRoute]);

    const label = isMembersRoute ? "Workspace members" : isGuestsRoute ? "Guests" : "Members and guests";

    const description = isMembersRoute ? "Workspace members can view and join all Workspace visible boards and create new boards in the Workspace." :
        isGuestsRoute ? "Guests can only access specific boards they have been invited to. They cannot create new boards in the Workspace." :
            "Members can view and join all Workspace visible boards and create new boards in the Workspace. Guests can only access specific boards they have been invited to. They cannot create new boards in the Workspace."


    return (
        <div className="rounded-lg bg-transparent p-4 h-full flex flex-col">
            <div className="flex flex-row items-center justify-start gap-2 mb-4">
                <h2 className="text-lg font-bold">{label}</h2>
                <BriefcaseBusiness className="h-4 aspect-square text-neutral-400" />
            </div>
            <p className="text-sm text-neutral-500 ">{description}</p>

            <CustomInput
                value={currentSearch}
                onInputChange={(input) => setCurrentSearch(input?.current?.value ?? "")}
                placeholder="Search members..." className="w-full mt-4 mb-3 max-w-72 h-9"

            />

            {visibleIds?.map((memberID) => (
                <>
                    <div key={`divider-${memberID}`} className="w-full h-px bg-neutral-700 my-1" />
                    <UserRow key={memberID} userID={memberID} workspaceId={workspaceID} />
                </>
            ))}
            <div className="w-full h-px bg-neutral-700 my-1" />

        </div>
    )
}
