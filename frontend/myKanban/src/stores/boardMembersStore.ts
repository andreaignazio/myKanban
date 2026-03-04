import { create } from "zustand";
import type { UserBoard, BoardMember, UserWorkspace, User } from "./types";
import { api } from "@/api/api";
import { useUserStore } from "@/stores/userStore";
import { useWsMembersStore } from "./wsMembersStore";

type BoardMembersState = {
    membersIdsByBoardId: Record<string, string[]>;
    membersById: Record<string, UserBoard>;
    isRequestSuccessful: boolean;
    isSendingShareOffer: boolean;

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
    isRequestSuccessful: false,
    isSendingShareOffer: false,

    fetchBoardMembers: async (boardID: string) => {
        try {
            const response = await api.get(`boards/${boardID}/members`);
            const data: BoardMember[] = response.data;
            // console.log("Fetched board members for board", boardID, data);


            const membersIds = data.map(ub => ub.Relation.UserID);
            const membersById = data.reduce((acc, ub) => {
                acc[ub.Relation.UserID] = ub.Relation;
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
            }))
        } catch (error) {
            // console.error("Failed to fetch board members:", error);
        }
    },
    setBoardMemberRole: async (boardID: string, tagetUserID: string, role: string) => {
        try {
            set({
                isSendingShareOffer: true,
                isRequestSuccessful: false
            });
            await api.patch(`boards/${boardID}/members/${tagetUserID}`, { role });
            set({ isRequestSuccessful: true });
        } catch (error) {
            set({ isRequestSuccessful: false });
            // console.error("Failed to set board member role:", error);
        } finally {
            set({
                isSendingShareOffer: false,

            });
        }
    },
    deleteBoardMember: async (boardID: string, memberID: string) => {
        try {
            set({
                isSendingShareOffer: true,
                isRequestSuccessful: false,
            });
            await api.delete(`boards/${boardID}/members/${memberID}`);
            set({ isRequestSuccessful: true });
        } catch (error) {
            set({ isRequestSuccessful: false });
            throw error;
        } finally {
            set({
                isSendingShareOffer: false,
            });
        }
    },
    mergeBoardMembers: (boardID: string, members: UserBoard[]) => {
        const membersIds = members.map(ub => ub.UserID);
        const membersById = members.reduce((acc, ub) => {
            acc[ub.UserID] = ub;
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
                    [member.UserID]: member,
                }
            };
        });
    },
    removeBoardMember: (boardID: string, userID: string) => {
        set((state) => {
            const currentIds = state.membersIdsByBoardId[boardID] || [];
            const nextIds = currentIds.filter((id) => id !== userID);
            const { [userID]: _removed, ...nextMembersById } = state.membersById;

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
