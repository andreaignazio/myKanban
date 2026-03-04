import { useBoardsStore } from "@/stores/boardsStore"
import { useUserStore } from "@/stores/userStore"

export function useBoardDescription({ boardID }: { boardID: string }) {
    const boardById = useBoardsStore(state => state.boardsById)
    const userById = useUserStore(state => state.usersById)
    const board = boardById[boardID]
    const user = userById[board?.CreatedByUserID ?? ""]

    const defaultDescription = user ? `Created by ${user.Name}` : "No description"

    return board?.Props?.Description || defaultDescription
}