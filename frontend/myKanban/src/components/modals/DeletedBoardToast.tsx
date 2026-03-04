import { forwardRef } from "react"
import { CommonMenuWrapper } from "../menuElements/menuWrapper"

type DeletedBoardModal = {
    onClose: () => void;
}

export const DeletedBoardsModal = forwardRef<HTMLDivElement, DeletedBoardModal>((props, ref) => {
    return (
        <CommonMenuWrapper style={{ width: "400px", height: "300px" }} >
            <div className="flex flex-col justify-start items-start w-full h-full p-4 gap-4">
                <h2 className="text-lg font-bold">Deleted Board</h2>
                <div className="flex flex-col gap-2 w-full">
                    <button className="w-full text-left px-3 py-2 rounded hover:bg-neutral-500/50">Board 1</button>
                    <button className="w-full text-left px-3 py-2 rounded hover:bg-neutral-500/50">Board 2</button>
                    <button className="w-full text-left px-3 py-2 rounded hover:bg-neutral-500/50">Board 3</button>
                </div>
            </div>
        </CommonMenuWrapper>
    )
})