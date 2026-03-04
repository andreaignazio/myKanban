
type BoardRowProps = {
    boardID: string
    onClick?: (id: string) => void

}
import { useBoardsStore } from "@/stores/boardsStore";

export function BoardRow({ boardID: boardID, onClick }: BoardRowProps) {

    const name = useBoardsStore(state => state.boardsById[boardID]?.Name)
    return (
        <>
            <div
                onClick={() => onClick?.(boardID)}
                className="rounded-xl
         
            px-4 py-2 text-slate-100 shadow-sm">
                {name}
            </div>
        </>
    )
}