import { useListsStore } from "@/stores/listsStore"

import { AddForm } from "./common/AddForm"
import { useState } from "react"
import { useBoardDetailStore } from "@/stores/boardDetailStore"
import type { BoardList, CreateListInBoardResponse, List } from "@/stores/types"
import { useAsyncKey, useAsyncRequestStore } from "@/stores/asyncRequestStore"


type ListAddProps = {
    boardID: string | null
    setShouldAnimate?: (shouldAnimate: boolean) => void
}


export const ListAdd = ({ boardID, setShouldAnimate }: ListAddProps) => {
    const [isAdding, setIsAdding] = useState(false)
    // const boardID = useBoardDetailStore((state) => state.currentBoardId)
    const createListRaw = useListsStore((state) => state.createListRaw)
    const execute = useAsyncRequestStore((state) => state.execute)

    async function handleAdd(title: string) {
        try {
            if (!boardID) return
            await handleAddList(title)

            setIsAdding(false)
        }
        catch (error) {
            console.error("Error creating list:", error)
        }
        // Logic for adding a new list
    }

    const boardListIdsByBoardId = useBoardDetailStore((state) => state.boardListIdsByBoardId)
    const boardListById = useBoardDetailStore((state) => state.boardListById)
    const listsById = useListsStore((state) => state.listsById)
    const mergeLists = useListsStore((state) => state.mergeLists)
    //const [tempID, setTempID] = useState<string | null>(null)
    //const [requestKey, setRequestKey] = useState<AsyncRequestKey | null>(null)
    const getListsById = useListsStore((state) => state.getListsById)
    const setListsById = useListsStore((state) => state.setListsById)

    const getRequestKey = (tempID: string) => {
        return useAsyncKey("list:create", tempID)
    }



    const handleAddList = async (title: string) => {
        if (!boardID) return
        // setShouldAnimate && setShouldAnimate(true)
        const tempID = `temp-${Date.now()}`
        // setTempID(tempID)
        const key = getRequestKey(tempID)
        await execute(key, async () => {
            await new Promise((resolve) => setTimeout(resolve, 1))
            return await executeAddList(title, boardID, tempID)
        })

        async function executeAddList(title: string, boardID: string, tempID: string) {
            addListOptimistic(tempID, boardID, title)

            try {
                await createListRaw({ Title: title, AfterID: null, InsertAt: "end" }, boardID).then((res) => {
                    if (res) {
                        reconcileAddList(res, tempID, boardID)
                    } else {
                        rollbackAddList(tempID, boardID)
                        throw new Error("Failed to create list")
                    }
                })
            } catch (error) {
                console.error("Error creating list:", error)
                rollbackAddList(tempID, boardID)
                throw error
            } finally {

            }
        }


    }

    //const {isLoading, isSuccessful, errorMessage} = useAsyncRequest(requestKey ?? "")



    const addListOptimistic = (tempID: string, boardID: string | null, title: string) => {
        if (!boardID) return
        const boardListIds = [...boardListIdsByBoardId[boardID ?? ""] ?? []]
        const nextboardListById = { ...boardListById }
        const nextlistsById = { ...listsById }


        const tempList: List = {
            ID: tempID,
            Title: title,
            Props: {},
            CreatedAt: new Date().toISOString(),
            UpdatedAt: new Date().toISOString(),
            DeletedAt: null,
        }
        const tempBoardList: BoardList = {
            ID: tempID,
            BoardID: boardID,
            RootID: tempID,
            ListID: tempID,
            Position: "",
            AccessMode: "editable",
            CreatedAt: new Date().toISOString(),
            UpdatedAt: new Date().toISOString(),
            DeletedAt: null,
        }
        boardListIds.push(tempID)
        nextboardListById[tempID] = tempBoardList
        nextlistsById[tempID] = tempList
        useBoardDetailStore.setState({
            boardListIdsByBoardId: {
                ...useBoardDetailStore.getState().boardListIdsByBoardId,
                [boardID]: boardListIds,
            },
            boardListById: nextboardListById,
        })
        mergeLists([tempList])
    }

    const rollbackAddList = (tempID: string, boardID: string) => {
        useBoardDetailStore.setState((state) => {
            const nextBoardListIds = (state.boardListIdsByBoardId[boardID] ?? []).filter((id) => id !== tempID)
            const nextBoardListById = { ...state.boardListById }
            delete nextBoardListById[tempID]
            return {
                boardListIdsByBoardId: {
                    ...state.boardListIdsByBoardId,
                    [boardID]: nextBoardListIds,
                },
                boardListById: nextBoardListById,
            }
        })
        const nextListsById = { ...getListsById() }
        delete nextListsById[tempID]
        setListsById(nextListsById)
    }

    const reconcileAddList = (createdList: CreateListInBoardResponse, tempID: string, boardID: string) => {


        const { List, Relation } = createdList

        const nextListsById = { ...getListsById() }
        nextListsById[List.ID] = List
        delete nextListsById[tempID]
        setListsById(nextListsById)

        useBoardDetailStore.setState((state) => {
            const nextBoardListIds = [...(state.boardListIdsByBoardId[boardID] ?? [])]
            const tempIndex = nextBoardListIds.indexOf(tempID)
            if (tempIndex !== -1) {
                nextBoardListIds.splice(tempIndex, 1, Relation.ID)
            }
            const nextBoardListById = { ...state.boardListById }
            nextBoardListById[Relation.ID] = Relation
            delete nextBoardListById[tempID]
            return {
                boardListIdsByBoardId: {
                    ...state.boardListIdsByBoardId,
                    [boardID]: nextBoardListIds,
                },
                boardListById: nextBoardListById,
            }
        })

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