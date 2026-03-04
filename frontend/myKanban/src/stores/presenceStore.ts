import { create } from "zustand";
import type { BoardEvent, UserLite, WorkspaceEvent } from "./types";

type PresencePayload = {
    Count: number;
    Users: UserLite[];
}

type PresenceStore = {
    OpCounter: number;
    usersByBoardId: Record<string, UserLite[]>;
    eventIds: string[]; // to prevent processing the same event multiple times
    applyEvent: (evt: BoardEvent | WorkspaceEvent) => void;
    getUsersForBoard: (boardId: string) => UserLite[];

}



export const usePresenceStore = create<PresenceStore>((set, get) => ({
    OpCounter: 0,
    usersByBoardId: {} as Record<string, UserLite[]>,
    eventIds: [],
    applyEvent: (evt: BoardEvent | WorkspaceEvent) => {
        if (get().eventIds.includes(evt.ID)) {
            return;
        }
        set((state) => ({ eventIds: [...state.eventIds, evt.ID] }));

        if (evt.Type === "presence.snapshot" && "BoardID" in evt) {
            const boardId = evt.BoardID
            const payload = evt.Payload as PresencePayload
            // console.debug("[presence] snapshot for board", boardId, payload)
            set((state) => {
                const nextUsersByBoardId = { ...state.usersByBoardId }
                const validUsers: UserLite[] = []
                payload.Users.forEach(user => {
                    if (validUsers?.some(u => u.ID === user.ID)) {

                    } else {
                        validUsers.push(user)
                    }
                })
                nextUsersByBoardId[boardId] = validUsers
                // console.log("[presence] applying snapshot, valid users:", validUsers)
                return { usersByBoardId: nextUsersByBoardId, OpCounter: state.OpCounter + 1 }
            })
        } else if (evt.Type === "presence.join" && "BoardID" in evt) {
            const boardId = evt.BoardID
            const payload = evt.Payload as PresencePayload

            set((state) => {
                const nextUsersByBoardId = { ...state.usersByBoardId }
                const currentUsers = nextUsersByBoardId[boardId] ?? []
                payload.Users.forEach(newUser => {
                    if (!currentUsers.some(u => u.ID === newUser.ID)) {
                        currentUsers.push(newUser)
                    }
                })
                nextUsersByBoardId[boardId] = currentUsers
                //nextUsersByBoardId[boardId] = updatedUsers
                return { usersByBoardId: nextUsersByBoardId, OpCounter: state.OpCounter + 1 }

            })
        } else if (evt.Type === "presence.leave" && "BoardID" in evt) {
            const boardId = evt.BoardID
            const payload = evt.Payload as PresencePayload
            set((state) => {
                const nextUsersByBoardId = { ...state.usersByBoardId }
                const currentUsers = nextUsersByBoardId[boardId] ?? []
                const updatedUsers = currentUsers.filter(user => !payload.Users.some(u => u.ID === user.ID))
                nextUsersByBoardId[boardId] = updatedUsers
                return {
                    usersByBoardId: nextUsersByBoardId,
                    OpCounter: state.OpCounter + 1
                }
            })
        }


    },
    getUsersForBoard: (boardId: string) => {
        const users = get().usersByBoardId[boardId] ?? []
        return users
    }
}))
