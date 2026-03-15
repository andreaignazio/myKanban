import { CustomInput } from "@/components/menuElements/CustomInput";
import { UserRow } from "@/components/UserRow";
import type { UserWorkspace } from "@/stores/types";
import { useUserStore } from "@/stores/userStore";
import { useWsMembersStore } from "@/stores/wsMembersStore";
import { ArrowUpDown, BriefcaseBusiness } from "lucide-react";
import { useEffect, useState } from "react";
import { useMatch, useParams } from "react-router-dom";
import { useShallow } from "zustand/shallow";

type SortMode = "hierarchy" | "name-asc" | "name-desc";

const nextSortMode: Record<SortMode, SortMode> = {
    hierarchy: "name-asc",
    "name-asc": "name-desc",
    "name-desc": "hierarchy",
};

const sortModeLabel: Record<SortMode, string> = {
    hierarchy: "Role + Date",
    "name-asc": "Name A→Z",
    "name-desc": "Name Z→A",
};

const roleOrder: Record<string, number> = {
    owner: 0,
    admin: 1,
    member: 2,
    viewer: 3,
};

export function WorkspaceMembersMain() {
    const workspaceID = useParams().workspaceId as string;
    const membersIds = useWsMembersStore(useShallow((state) => state.userIdsByWorkspaceId[workspaceID] ?? []));
    const membersById = useWsMembersStore(useShallow((state) => state.userWorkspacesByWorkspaceId[workspaceID] ?? {}));

    const [visibleIds, setVisibleIds] = useState<string[]>(membersIds);
    const [currentSearch, setCurrentSearch] = useState("");
    const [sortMode, setSortMode] = useState<SortMode>("hierarchy");

    const isMembersRoute = useMatch("/workspaces/:workspaceId/members/");
    const isGuestsRoute = useMatch("/workspaces/:workspaceId/members/guests/*");

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
        const handleSearch = () => {
            if (!membersIds) return;
            const searchTerm = currentSearch.trim().toLowerCase();
            const usersById = useUserStore.getState().usersById;

            const filtered = membersIds
                .filter((id) => {
                    const member = membersById[id];
                    const user = usersById[member?.UserID];
                    return user?.Name.toLowerCase().includes(searchTerm) || user?.Username.toLowerCase().includes(searchTerm);
                })
                .map((id) => membersById[id])
                .filter(filterCallback);

            const sorted = [...filtered].sort((a, b) => {
                if (sortMode === "hierarchy") {
                    const roleDiff = (roleOrder[a.Role] ?? 99) - (roleOrder[b.Role] ?? 99);
                    if (roleDiff !== 0) return roleDiff;
                    return new Date(a.CreatedAt).getTime() - new Date(b.CreatedAt).getTime();
                }
                if (sortMode === "name-asc" || sortMode === "name-desc") {
                    const nameA = usersById[a.UserID]?.Name?.toLowerCase() ?? "";
                    const nameB = usersById[b.UserID]?.Name?.toLowerCase() ?? "";
                    const cmp = nameA.localeCompare(nameB);
                    return sortMode === "name-asc" ? cmp : -cmp;
                }
                return 0;
            });

            setVisibleIds(sorted.map((m) => m.UserID));
        };
        handleSearch();
    }, [membersIds, membersById, currentSearch, isMembersRoute, isGuestsRoute, sortMode]);

    const label = isMembersRoute ? "Workspace members" : isGuestsRoute ? "Guests" : "Members and guests";

    const description = isMembersRoute ? "Workspace members can view and join all Workspace visible boards and create new boards in the Workspace." :
        isGuestsRoute ? "Guests can only access specific boards they have been invited to. They cannot create new boards in the Workspace." :
            "Members can view and join all Workspace visible boards and create new boards in the Workspace. Guests can only access specific boards they have been invited to. They cannot create new boards in the Workspace."


    return (
        <div className="rounded-lg bg-transparent p-4 h-full flex flex-col ">
            <div className="flex flex-row items-center justify-start gap-2 mb-4">
                <h2 className="text-lg font-bold">{label}</h2>
                <BriefcaseBusiness className="h-4 aspect-square text-neutral-400" />
            </div>
            <p className="text-sm text-neutral-500 ">{description}</p>

            <div className="flex flex-row justify-between items-center gap-2 mt-4 mb-3">
                <CustomInput
                    value={currentSearch}
                    onInputChange={(input) => setCurrentSearch(input?.current?.value ?? "")}
                    placeholder="Search members..." className="w-full max-w-72 !h-9"
                />
                <button
                    type="button"
                    onClick={() => setSortMode((current) => nextSortMode[current])}
                    className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-3xl border px-4 text-sm font-semibold transition-colors
                        ${sortMode === "hierarchy"
                            ? "border-neutral-600/80 bg-neutral-800/60 text-neutral-300 hover:border-neutral-500 hover:text-white"
                            : "border-blue-400/60 bg-blue-500/20 text-blue-100"
                        }`}
                >
                    <ArrowUpDown className="h-4 w-4" />
                    {sortModeLabel[sortMode]}
                </button>
            </div>
            {visibleIds.length === 0 && <div className="w-full h-px bg-neutral-700 my-1" />}

            <div className="flex-1 min-h-0 pb-12 overflow-y-auto scrollbar-hidden">
                {visibleIds.length === 0 && (

                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">

                        <BriefcaseBusiness className="h-8 w-8 text-neutral-600" />
                        <p className="text-sm font-medium text-neutral-400">
                            {currentSearch.trim()
                                ? isGuestsRoute
                                    ? "No guests match your search."
                                    : "No members match your search."
                                : isGuestsRoute
                                    ? "This workspace has no guests yet."
                                    : "This workspace has no members yet."
                            }
                        </p>
                        {currentSearch.trim() && (
                            <button
                                type="button"
                                onClick={() => setCurrentSearch("")}
                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                )}
                {visibleIds?.map((memberID) => (
                    <>
                        <div key={`divider-${memberID}`} className="w-full h-px bg-neutral-700 my-1" />
                        <UserRow key={memberID} userID={memberID} workspaceId={workspaceID} />
                    </>
                ))}
                <div className="w-full h-px bg-neutral-700 my-1" />
            </div>

        </div>
    )
}
