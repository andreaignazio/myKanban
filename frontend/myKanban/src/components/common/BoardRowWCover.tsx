
import { BoardCoverRenderer } from "../menuElements/BoardCoverRenderer";

import type { Board } from "@/stores/types";

type BoardRowProps = {
    board: Board
    onClick?: (id: string) => void
    className?: string
    children?: React.ReactNode
}


export const BoardRowWCover = ({ board, onClick, className, children }: BoardRowProps) => {

    return (
        <div onClick={() => onClick?.(board.ID)}
            className={`flex flex-row h-10 items-center gap-3 ${className}`}>
            <BoardCoverRenderer board={board} />
            <div className="flex flex-col">
                <div className="text-sm font-medium">{board.Name}</div>
                {children}
            </div>
        </div>
    )
}