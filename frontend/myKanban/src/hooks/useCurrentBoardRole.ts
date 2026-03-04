import { useAuthStore } from "@/stores/auth";
import { useBoardsStore } from "@/stores/boardsStore";
import { useShallow } from "zustand/shallow";

export type BoardRole = "owner" | "admin" | "member" | "viewer";

const ROLE_SET: ReadonlySet<BoardRole> = new Set(["owner", "admin", "member", "viewer"]);

function normalizeRole(value: string | null | undefined): BoardRole | undefined {
    if (!value) return undefined;
    const normalized = value.toLowerCase();
    return ROLE_SET.has(normalized as BoardRole) ? (normalized as BoardRole) : undefined;
}

export function useCurrentBoardRole(boardId?: string | null) {
    const currentUserId = useAuthStore((state) => state.userID);

    const relation = useBoardsStore(
        useShallow((state) => (boardId ? state.userBoardsById[boardId] : undefined))
    );

    const isCurrentUserRelation = !relation?.UserID || !currentUserId || relation.UserID === currentUserId;
    const role = isCurrentUserRelation ? normalizeRole(relation?.Role) : undefined;

    return {
        role,
        canManageBoard: role === "owner" || role === "admin",
        isOwner: role === "owner",
        isAdminOrOwner: role === "owner" || role === "admin",
    };
}
