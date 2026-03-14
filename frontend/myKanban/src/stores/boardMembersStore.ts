import { create } from "zustand";
import type { UserBoard, BoardMember, UserWorkspace } from "./types";
import { api } from "@/api/api";
import { useUserStore } from "@/stores/userStore";
import { useWsMembersStore } from "./wsMembersStore";
import { useAsyncKey, useAsyncRequestStore } from "./asyncRequestStore";

export function boardMemberKey(boardID: string, userID: string): string {
    return `${boardID}:${userID}`;
}

type BoardMembersState = {
    membersIdsByBoardId: Record<string, string[]>;
    membersById: Record<string, UserBoard>;


    fetchBoardMembers: (boardID: string) => Promise<void>;
    setBoardMemberRole: (boardID: string, tagetUserID: string, role: string) => Promise<void>;
    deleteBoardMember: (boardID: string, memberID: string) => Promise<void>;
    mergeBoardMembers: (boardID: string, members: UserBoard[]) => void;
    upsertBoardMember: (boardID: string, member: UserBoard) => void;
    removeBoardMember: (boardID: string, userID: string) => void;
    getBoardMembersCount: (boardID: string) => number;
}

export const useBoardMembersStore = create<BoardMembersState>((set) => ({
    membersIdsByBoardId: {},
    membersById: {},


    fetchBoardMembers: async (boardID: string) => {

        await useAsyncRequestStore.getState().execute(
            useAsyncKey("board:member:fetch", boardID),
            () => api.get(`boards/${boardID}/members`),
            {
                onSuccess(result) {
                    const data: BoardMember[] = result.data;
                    mergeMembers(data);
                },
            }
        );

        function mergeMembers(data: BoardMember[]) {

            const membersIds = data.map(ub => ub.Relation.UserID);
            const membersById = data.reduce((acc, ub) => {
                acc[boardMemberKey(boardID, ub.Relation.UserID)] = ub.Relation;
                return acc;
            }, {} as Record<string, UserBoard>);

            const users = data.map(ub => ub.User);
            useUserStore.getState().mergeUsers(users);
            const userWorkspaces = data.map(ub => ub.UserWorkspace).filter(uw => uw !== undefined) as UserWorkspace[];
            useWsMembersStore.getState().mergeUserWorkspaceRelation(userWorkspaces);

            set((state) => ({
                membersIdsByBoardId: {
                    ...state.membersIdsByBoardId,
                    [boardID]: membersIds,
                },
                membersById: {
                    ...state.membersById,
                    ...membersById,
                }
            }));

        }


    },
    setBoardMemberRole: async (boardID: string, tagetUserID: string, role: string) => {

        await useAsyncRequestStore.getState().execute(
            "board:member:edit:role",
            () => api.patch(`boards/${boardID}/members/${tagetUserID}`, { role }),
            { successResetDelayMs: 2000 }
        );

    },
    deleteBoardMember: async (boardID: string, memberID: string) => {

        await useAsyncRequestStore.getState().execute(
            "board:member:delete",
            () => api.delete(`boards/${boardID}/members/${memberID}`),
            { successResetDelayMs: 2000 }
        );

    },
    mergeBoardMembers: (boardID: string, members: UserBoard[]) => {
        const membersIds = members.map(ub => ub.UserID);
        const membersById = members.reduce((acc, ub) => {
            acc[boardMemberKey(boardID, ub.UserID)] = ub;
            return acc;
        }, {} as Record<string, UserBoard>);

        set((state) => ({
            membersIdsByBoardId: {
                ...state.membersIdsByBoardId,
                [boardID]: membersIds,
            },
            membersById: {
                ...state.membersById,
                ...membersById,
            }
        }));
    },
    upsertBoardMember: (boardID: string, member: UserBoard) => {
        set((state) => {
            const existingIds = state.membersIdsByBoardId[boardID] || [];
            if (!existingIds.includes(member.UserID)) {
                existingIds.push(member.UserID);
            }
            return {
                membersIdsByBoardId: {
                    ...state.membersIdsByBoardId,
                    [boardID]: existingIds,
                },
                membersById: {
                    ...state.membersById,
                    [boardMemberKey(boardID, member.UserID)]: member,
                }
            };
        });
    },
    removeBoardMember: (boardID: string, userID: string) => {
        set((state) => {
            const currentIds = state.membersIdsByBoardId[boardID] || [];
            const nextIds = currentIds.filter((id) => id !== userID);
            const key = boardMemberKey(boardID, userID);
            const { [key]: _removed, ...nextMembersById } = state.membersById;

            return {
                membersIdsByBoardId: {
                    ...state.membersIdsByBoardId,
                    [boardID]: nextIds,
                },
                membersById: nextMembersById,
            };
        });
    },
    getBoardMembersCount: (boardID: string) => {
        const membersIds: string[] = useBoardMembersStore.getState().membersIdsByBoardId[boardID] ?? [];
        return membersIds.length;
    },

}))
