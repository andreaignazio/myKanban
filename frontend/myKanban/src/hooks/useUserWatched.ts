import { useUserWatchStore } from "@/stores/userWatchStore"
import { useEffect } from "react"
import { useShallow } from "zustand/shallow"



export function useUserWatched() {
    const fetchUserWatches = useUserWatchStore((state) => state.fetchUserWatches)
    const listWatchIds = useUserWatchStore(useShallow((state) => state.listWatchIds))
    const cardWatchIds = useUserWatchStore(useShallow((state) => state.cardWatchIds))
    const boardWatchIds = useUserWatchStore(useShallow((state) => state.boardWatchIds))

    useEffect(() => {
        fetchUserWatches()
    }, [listWatchIds, cardWatchIds, boardWatchIds])

    return {
        listWatchIds,
        cardWatchIds,
        boardWatchIds,
    }
}