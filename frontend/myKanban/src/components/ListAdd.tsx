import { useListsStore } from "@/stores/listsStore"

import { AddForm } from "./common/AddForm"
import { useState } from "react"

type ListAddProps = {
    boardID: string | null
}


export const ListAdd = ({ boardID }: ListAddProps) => {
    const [isAdding, setIsAdding] = useState(false)
    // const boardID = useBoardDetailStore((state) => state.currentBoardId)
    const createList = useListsStore((state) => state.createList)
    function handleAdd(title: string) {
        try {
            if (!boardID) return
            createList({ Title: title, AfterID: null, InsertAt: "end" }, boardID)
            setIsAdding(false)
        }
        catch (error) {
            console.error("Error creating list:", error)
        }
        // Logic for adding a new list
    }

    return (
        <>
            <div
                className={`flex flex-col gap-1
                    transition-all duration-600 ease-in-out
                    ${isAdding ? "bg-listbgdefault" : "bg-white/60 text-accentdark"}
                    font-medium
                          h-auto
            rounded-xl p-2 w-[280px]
            `}>

                <AddForm
                    placeholderClosed="+ Add new list"
                    onSubmit={(title) => handleAdd(title)}
                    isAdding={isAdding}
                    setIsAdding={setIsAdding}
                    onCancel={() => setIsAdding(false)}
                    closedHeight={7}
                    textAreaClassName="!rounded-md"
                    label="Add list"
                    placeholder="Enter a title for this list..."
                />
            </div>

        </>
    )
}