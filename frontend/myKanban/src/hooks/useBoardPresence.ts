
import { usePresenceStore } from "@/stores/presenceStore"
import type { UserBoard, UserLite } from "@/stores/types"
import { useEffect, useMemo, useState } from "react"

export function useBoardPresence(boardID: string, members?: UserBoard[]) {

    const getConnectedUsers = usePresenceStore((state) => state.getUsersForBoard)
    const [connectedUsers, setConnectedUsers] = useState<UserLite[]>([])
    const counter = usePresenceStore((state) => state.OpCounter)


    useEffect(() => {
        // console.log("Updating connected users for board", boardId)
        setConnectedUsers(getConnectedUsers(boardID))
    }, [boardID, getConnectedUsers, counter])

    const presenceByUserId = useMemo(() => {
        const map: Record<string, boolean> = {}
        members?.forEach(member => {
            ///console.log("Checking presence for member", member.UserID, "connected users:", connectedUsers)
            map[member.UserID] = connectedUsers.some(u => u.ID === member.UserID)
        })
        return map
    }, [connectedUsers, members])
    //console.log("Presence by user ID for board", boardID, presenceByUserId)

    return {
        connectedUsers,
        presenceByUserId
    }
}