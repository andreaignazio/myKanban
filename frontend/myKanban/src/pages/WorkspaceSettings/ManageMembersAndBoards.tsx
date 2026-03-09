import { TabSelector } from "@/components/cardMenus/cardMoveMenu";
import { MemberRow } from "@/components/common/MemberRow";
import { useAsyncKey } from "@/stores/asyncRequestStore";
import { useBoardsStore } from "@/stores/boardsStore";
import type { Board, UserWorkspace } from "@/stores/types";
import { useUserStore } from "@/stores/userStore";
import type { AnyUser, User } from "@/stores/usertypes";
import { useWsMembersStore } from "@/stores/wsMembersStore";
import { ArrowsUpDownIcon, ExclamationCircleIcon } from "@heroicons/react/24/solid";
import { Activity, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useParams } from "react-router-dom";
import { useShallow } from "zustand/shallow";

type PendingSortMode = "disabled" | "first" | "last";

const nextPendingSortMode: Record<PendingSortMode, PendingSortMode> = {
    disabled: "first",
    first: "last",
    last: "disabled",
};

const pendingSortModeLabel: Record<PendingSortMode, string> = {
    disabled: "Pending off",
    first: "Pending first",
    last: "Pending last",
};

export const ManagaeMembersAndBoards = () => {
    const workspaceID = useParams().workspaceId as string;
    const [activeTab, setActiveTab] = useState<"members" | "boards">("members");
    const [pendingSortMode, setPendingSortMode] = useState<PendingSortMode>("disabled");
    const [selectedUserIDs, setSelectedUserIDs] = useState<string[]>([]);
    const [selectedBoardIDs, setSelectedBoardIDs] = useState<string[]>([]);
    const membersIds = useWsMembersStore(useShallow((state) => state.userIdsByWorkspaceId[workspaceID] ?? []));
    const membersById = useWsMembersStore(useShallow((state) => state.userWorkspacesByWorkspaceId[workspaceID] ?? {}));
    const boardIds = useBoardsStore(useShallow((state) => state.boardIdsByWorkspaceId[workspaceID] ?? []));
    const boardsById = useBoardsStore(useShallow((state) => state.boardsById));
    const usersById = useUserStore(useShallow((state) => state.usersById));

    useEffect(() => {
        setSelectedUserIDs(membersIds.filter((id) => membersById[id]?.IsPendingSuspend));
    }, [membersIds, membersById]);

    useEffect(() => {
        setSelectedBoardIDs(boardIds.filter((id) => boardsById[id]?.IsPendingSuspend));
    }, [boardIds, boardsById]);

    const tabs: { id: string; label: string }[] = [
        { id: "members", label: "Members" },
        { id: "boards", label: "Boards" },
    ];

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between gap-3">
                <TabSelector tabs={tabs} setActiveTab={(tabID) => setActiveTab(tabID as "members" | "boards")} activeTab={activeTab} />
                <button
                    type="button"
                    onClick={() => setPendingSortMode((current) => nextPendingSortMode[current])}
                    className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-3xl border px-4 text-sm font-semibold transition-colors
                        ${pendingSortMode === "disabled"
                            ? "border-neutral-600/80 bg-neutral-800/60 text-neutral-300 hover:border-neutral-500 hover:text-white"
                            : "border-amber-400/60 bg-amber-500/20 text-amber-100"
                        }`}
                >
                    <ArrowsUpDownIcon className="h-4 w-4" />
                    {pendingSortModeLabel[pendingSortMode]}
                </button>
            </div>

            <Activity name="members" mode={activeTab === "members" ? "visible" : "hidden"}>
                <SuspendMembersList
                    workspaceID={workspaceID}
                    membersIds={membersIds}
                    membersById={membersById}
                    usersById={usersById}
                    selectedUserIDs={selectedUserIDs}
                    setSelectedUserIDs={setSelectedUserIDs}
                    pendingSortMode={pendingSortMode}
                />
            </Activity>
            <Activity name="boards" mode={activeTab === "boards" ? "visible" : "hidden"}>
                <SuspendBoardsList
                    workspaceID={workspaceID}
                    boardIds={boardIds}
                    boardsById={boardsById}
                    selectedBoardIDs={selectedBoardIDs}
                    setSelectedBoardIDs={setSelectedBoardIDs}
                    pendingSortMode={pendingSortMode}
                />
            </Activity>
        </div>
    );
};

type SuspendMembersListProps = {
    workspaceID: string;
    membersIds: string[];
    membersById: Record<string, UserWorkspace>;
    usersById: Record<string, AnyUser>;
    selectedUserIDs: string[];
    setSelectedUserIDs: Dispatch<SetStateAction<string[]>>;
    pendingSortMode: PendingSortMode;
};

const MEMBERSHIP_ROLE_ORDER: Record<string, number> = {
    owner: 0,
    admin: 1,
    member: 2,
    viewer: 3,
};

const SuspendMembersList = ({
    workspaceID,
    membersIds,
    membersById,
    usersById,
    selectedUserIDs,
    setSelectedUserIDs,
    pendingSortMode,
}: SuspendMembersListProps) => {
    const replaceMemberPendingSuspensionSelection = useWsMembersStore((state) => state.replaceMemberPendingSuspensionSelection);
    const sortedMemberIDs = [...membersIds].sort((leftId, rightId) => {
        const leftMember = membersById[leftId];
        const rightMember = membersById[rightId];

        if (pendingSortMode !== "disabled") {
            const leftPendingOrder = leftMember?.IsPendingSuspend
                ? (pendingSortMode === "first" ? 0 : 1)
                : (pendingSortMode === "first" ? 1 : 0);
            const rightPendingOrder = rightMember?.IsPendingSuspend
                ? (pendingSortMode === "first" ? 0 : 1)
                : (pendingSortMode === "first" ? 1 : 0);
            if (leftPendingOrder !== rightPendingOrder) {
                return leftPendingOrder - rightPendingOrder;
            }
        }

        const leftRoleOrder = MEMBERSHIP_ROLE_ORDER[leftMember?.Role ?? ""] ?? Number.MAX_SAFE_INTEGER;
        const rightRoleOrder = MEMBERSHIP_ROLE_ORDER[rightMember?.Role ?? ""] ?? Number.MAX_SAFE_INTEGER;
        if (leftRoleOrder !== rightRoleOrder) {
            return leftRoleOrder - rightRoleOrder;
        }

        const leftCreatedAt = leftMember?.CreatedAt ? new Date(leftMember.CreatedAt).getTime() : 0;
        const rightCreatedAt = rightMember?.CreatedAt ? new Date(rightMember.CreatedAt).getTime() : 0;
        if (leftCreatedAt !== rightCreatedAt) {
            return leftCreatedAt - rightCreatedAt;
        }

        return leftId.localeCompare(rightId);
    });

    const selectedSet = new Set(selectedUserIDs);
    const expectedSelectedCount = membersIds.filter((id) => membersById[id]?.IsPendingSuspend).length;
    const selectedCountMatchesExpected = selectedUserIDs.length === expectedSelectedCount;
    const hasChanges = membersIds.some((id) => (membersById[id]?.IsPendingSuspend ?? false) !== selectedSet.has(id));

    const handleToggle = (userID: string) => {
        const member = membersById[userID];
        if (!member || member.IsSuspended || member.Role === "owner") {
            return;
        }
        setSelectedUserIDs((current) => current.includes(userID) ? current.filter((id) => id !== userID) : [...current, userID]);
    };

    const handleSave = async () => {
        await replaceMemberPendingSuspensionSelection(
            workspaceID,
            selectedUserIDs,
            membersIds.filter((id) => !selectedSet.has(id)),
            useAsyncKey("subscription:suspension:members:save", workspaceID),
        );
    };

    return (
        <div className="mt-4 flex flex-col gap-4 px-2 py-4">
            <InfoBox text="Choose the full member suspension set locally, then save it in one request." />
            <SaveSelectionButton
                className="sticky top-0"
                disabled={!hasChanges || !selectedCountMatchesExpected}
                selectedCount={selectedUserIDs.length}
                expectedCount={expectedSelectedCount}
                onClick={() => { void handleSave(); }}
            />
            {sortedMemberIDs.map((id) => {
                const member = membersById[id];
                const user = usersById[id] as User | undefined;
                if (!member || !user) {
                    return null;
                }
                const isDraftSelected = selectedSet.has(id);
                const isPendingSuspend = member.IsPendingSuspend;

                const isGoingToBeSuspended = isDraftSelected && !isPendingSuspend
                const isGoingToBeReinstated = isPendingSuspend && !isDraftSelected
                const isCurrentlyPendingSuspension = isPendingSuspend && isDraftSelected

                return (
                    <MemberRow
                        key={id}
                        rowClassName={` transition-all ease-in-out duration-300
                            relative overflow-hidden shadow-md shadow-black/30
                            ${(isGoingToBeSuspended) ? "ring-2 ring-orange-500/50" : ""}
                                ${(isCurrentlyPendingSuspension) ? "!text-neutral-500/20 opacity-50" : ""}
                                    ${(isGoingToBeReinstated) ? "bg-lime-500/20 ring-2 ring-lime-500/50" : ""}
                            `}
                        user={user}
                        member={member}
                        endRowClassName="grid grid-cols-[70px_110px] justify-center -me-2 items-center gap-4"
                    >
                        <div className={`absolute inset-0 
                            ${isDraftSelected ? "bg-orange-600/10" : "bg-transparent"}
                             transition-colors pointer-events-none`} />
                        <SuspendButton onClick={() => handleToggle(id)}
                            isOwner={member.Role === "owner"}
                            disabled={member.IsSuspended}
                            selected={isDraftSelected}
                            isUnselecting={isGoingToBeReinstated || isGoingToBeSuspended}
                        />
                    </MemberRow>
                );
            })}
        </div>
    );
};

type SuspendBoardsListProps = {
    workspaceID: string;
    boardIds: string[];
    boardsById: Record<string, Board>;
    selectedBoardIDs: string[];
    setSelectedBoardIDs: Dispatch<SetStateAction<string[]>>;
    pendingSortMode: PendingSortMode;
};

const SuspendBoardsList = ({
    workspaceID,
    boardIds,
    boardsById,
    selectedBoardIDs,
    setSelectedBoardIDs,
    pendingSortMode,
}: SuspendBoardsListProps) => {
    const replaceBoardPendingSuspensionSelection = useBoardsStore((state) => state.replaceBoardPendingSuspensionSelection);
    const sortedBoardIDs = [...boardIds].sort((leftId, rightId) => {
        const leftBoard = boardsById[leftId];
        const rightBoard = boardsById[rightId];

        if (pendingSortMode !== "disabled") {
            const leftPendingOrder = leftBoard?.IsPendingSuspend
                ? (pendingSortMode === "first" ? 0 : 1)
                : (pendingSortMode === "first" ? 1 : 0);
            const rightPendingOrder = rightBoard?.IsPendingSuspend
                ? (pendingSortMode === "first" ? 0 : 1)
                : (pendingSortMode === "first" ? 1 : 0);
            if (leftPendingOrder !== rightPendingOrder) {
                return leftPendingOrder - rightPendingOrder;
            }
        }

        const leftCreatedAt = leftBoard?.CreatedAt ? new Date(leftBoard.CreatedAt).getTime() : 0;
        const rightCreatedAt = rightBoard?.CreatedAt ? new Date(rightBoard.CreatedAt).getTime() : 0;
        if (leftCreatedAt !== rightCreatedAt) {
            return rightCreatedAt - leftCreatedAt;
        }

        return leftId.localeCompare(rightId);
    });

    const selectedSet = new Set(selectedBoardIDs);
    const expectedSelectedCount = boardIds.filter((id) => boardsById[id]?.IsPendingSuspend).length;
    const selectedCountMatchesExpected = selectedBoardIDs.length === expectedSelectedCount;
    const hasChanges = boardIds.some((id) => (boardsById[id]?.IsPendingSuspend ?? false) !== selectedSet.has(id));

    const handleToggle = (boardID: string) => {
        const board = boardsById[boardID];
        if (!board || board.IsSuspended) {
            return;
        }
        setSelectedBoardIDs((current) => current.includes(boardID) ? current.filter((id) => id !== boardID) : [...current, boardID]);
    };

    const handleSave = async () => {
        await replaceBoardPendingSuspensionSelection(
            workspaceID,
            selectedBoardIDs,
            boardIds.filter((id) => !selectedSet.has(id)),
            useAsyncKey("subscription:suspension:boards:save", workspaceID),
        );
    };

    return (
        <div className="mt-4 flex flex-col gap-4 px-2 py-4">
            <InfoBox text="Choose the full board suspension set locally, then save it in one request." />
            <SaveSelectionButton
                className="sticky top-0"
                disabled={!hasChanges || !selectedCountMatchesExpected}
                selectedCount={selectedBoardIDs.length}
                expectedCount={expectedSelectedCount}
                onClick={() => { void handleSave(); }}
            />
            {sortedBoardIDs.map((boardID) => {
                const board = boardsById[boardID];
                if (!board) {
                    return null;
                }
                const isSelected = selectedSet.has(boardID);

                const isDraftSelected = selectedSet.has(boardID);
                const isPendingSuspend = board.IsPendingSuspend;

                const isGoingToBeSuspended = isDraftSelected && !isPendingSuspend
                const isGoingToBeReinstated = isPendingSuspend && !isDraftSelected
                const isCurrentlyPendingSuspension = isPendingSuspend && isDraftSelected
                return (
                    <div key={boardID} className={`group flex flex-row items-center justify-between gap-3 rounded-2xl border
                     border-amber-500/30 bg-neutral-500/20 px-4 py-3 transition-colors ease-in-out duration-300 shadow-md shadow-black/30
                     ${(isGoingToBeSuspended) ? "ring-2 ring-orange-500/50" : ""}
                                ${(isCurrentlyPendingSuspension) ? "!text-neutral-500/20 opacity-50" : ""}
                                    ${(isGoingToBeReinstated) ? "bg-lime-500/20" : ""}
                     `}>
                        <div className="flex min-w-0 flex-col gap-1">
                            <span className="truncate text-sm font-medium text-neutral-200">{board.Name}</span>
                            <span className="text-xs text-neutral-400">{board.Visibility} board</span>
                        </div>
                        <div className="flex flex-row items-center gap-3">
                            {board.IsPendingSuspend && <ExclamationCircleIcon className="h-4 w-4 text-amber-500" />}
                            <SuspendButton onClick={() => handleToggle(boardID)} disabled={board.IsSuspended} selected={isSelected} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

type SuspensionFlagShape = {
    IsSuspended: boolean;
    IsPendingSuspend: boolean;
};

const getRowClassName = (entity: SuspensionFlagShape, isSelected: boolean) => {
    if (entity.IsSuspended) {
        return "bg-red-500/10";
    }
    if (isSelected || entity.IsPendingSuspend) {
        return "bg-amber-500/50";
    }
    return "";
};

type InfoBoxProps = {
    text: string;
};

const InfoBox = ({ text }: InfoBoxProps) => {
    return (
        <div className="w-full rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm leading-6 text-amber-100">
            <p>{text}</p>
        </div>
    );
};

type SaveSelectionButtonProps = {
    disabled: boolean;
    selectedCount: number;
    expectedCount: number;
    onClick: () => void;
    className?: string;
    buttonClassName?: string;

};

const SaveSelectionButton = ({ disabled, selectedCount, expectedCount, onClick, className, buttonClassName }: SaveSelectionButtonProps) => {
    return (
        <div className={`z-30 flex justify-end ${className ?? ""}`}>
            <button
                onClick={onClick}
                disabled={disabled}
                className={`h-10 rounded-3xl px-4 text-sm font-semibold transition-colors 
                    backdrop-blur-lg
                    ${disabled
                        ? "cursor-not-allowed bg-neutral-700/30 text-neutral-500"
                        : "bg-amber-500/70 text-white hover:bg-amber-500"} 
                    shadow-md shadow-black/10
                    ${buttonClassName ?? ""}`}
            >
                Save {selectedCount} / {expectedCount} selected
            </button>
        </div>
    );
};

type SuspendButtonProps = {
    onClick: () => void;

    selected?: boolean;
    isOwner?: boolean;
    disabled?: boolean;
    isUnselecting?: boolean;
};

const SuspendButton = ({ onClick, selected = false, isOwner = false, disabled = false, isUnselecting = false }: SuspendButtonProps) => {
    const label = isUnselecting ? "Unselect" : "Select";
    const isDisabled = isOwner || disabled;
    const className = isDisabled ? "cursor-not-allowed bg-neutral-700/40 text-neutral-500"

        : isUnselecting
            ? "bg-neutral-600 text-white"
            : "bg-amber-500/50 text-white";

    return (
        <div className="bg-menusec w-full h-fit rounded-full flex flex-row">
            <button onClick={onClick} disabled={isDisabled} className={` ${(!isDisabled) ? "hover:bg-amber-500/70" : ""} transition-colors ease-in-out duration-300
        w-full flex h-10 flex-row items-center justify-center gap-2 rounded-3xl px-3 text-xs font-semibold  ${className}`}>
                <ExclamationCircleIcon className="inline-block h-4 w-4" />
                {label}
            </button>
        </div>
    );
};