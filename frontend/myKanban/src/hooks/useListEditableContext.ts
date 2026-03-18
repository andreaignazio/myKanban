import { useBoardDetailStore } from "@/stores/boardDetailStore"
import { useListsStore } from "@/stores/listsStore"
import { useCurrentBoardRole } from "./useCurrentBoardRole"
import type { BoardListAccessMode } from "@/stores/types"

type UseListEditableContextParams = {
    boardID: string
    boardListID: string
}

export function useListEditableContext({ boardID, boardListID }: UseListEditableContextParams) {
    const boardList = useBoardDetailStore((state) => state.boardListById[boardListID])
    const listID = boardList?.ListID ?? ""
    // const getListById = useListsStore((state) => state.getListById)
    const list = useListsStore((state) => state.listsById[listID])

    const { isViewer } = useCurrentBoardRole(boardID)

    const isRootBoardList = !!boardList && boardList.ID === boardList.RootID
    const accessMode: BoardListAccessMode = boardList?.AccessMode === "readonly" ? "readonly" : "editable"
    const isReadonly = accessMode === "readonly"

    const isExternallyRestricted = !isRootBoardList && list?.ExternalAccess === "restricted"

    // canEditList: governs all content operations on the list
    // (add card, edit title, drag-drop into list)
    // Requires: not a viewer + not readonly (AccessMode) + not externally restricted (ExternalAccess)
    const canEditList = !isViewer && !isReadonly && !isExternallyRestricted

    return {
        canEditList,
        isReadonly,
        isRootBoardList,
        accessMode,
        isExternallyRestricted,
    }
}
