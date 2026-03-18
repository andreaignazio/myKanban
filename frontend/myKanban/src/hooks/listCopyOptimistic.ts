import { useBoardDetailStore, type ListCard } from "@/stores/boardDetailStore";
import { useCardsStore } from "@/stores/cardsStore";
import { useListsStore } from "@/stores/listsStore";
import type { BoardList, Card, List } from "@/stores/types";
import { useShallow } from "zustand/shallow";
//import { addOptimisticEntity, reconcileOptimisticEntity, rollbackOptimisticEntity } from "@/utils/optimisticEntity";

export function useListCopyOptimistic(listID: string, boardID: string) {
    const listCardIdsByListId = useBoardDetailStore(useShallow((state) => state.getListCardIdsByListId()))
    const listCardById = useBoardDetailStore(useShallow((state) => state.getListCardById()))
    const boardListIdsByBoardId = useBoardDetailStore(useShallow((state) => state.boardListIdsByBoardId))
    const boardListById = useBoardDetailStore(useShallow((state) => state.boardListById))
    const cardsById = useCardsStore(useShallow((state) => state.cardsById))
    const listcardIdsToCopy = listCardIdsByListId[listID] ?? []

    const executeCopyListOptimistic = (title: string) => {
        const tempListID = `temp-list-${Date.now()}`
        const tempListCardIds = listcardIdsToCopy.map((cardID) => `temp-card-${Date.now()}-${cardID}`)

        const currentBLId = Object.values(boardListById).find((bl) => bl.ListID === listID)?.ID
        if (!currentBLId) {
            return
        }

        const idx = boardListIdsByBoardId[boardID]?.findIndex((id) => id === currentBLId) ?? -1
        if (idx === -1) {
            return
        }
        const nextBoardListIds = [...(boardListIdsByBoardId[boardID] ?? [])]
        nextBoardListIds.splice(idx + 1, 0, tempListID)
        const nextBoardListIdsByBoardId = {
            ...boardListIdsByBoardId,
            [boardID]: nextBoardListIds
        }
        const nextListCardIdsByListId = {
            ...listCardIdsByListId,
            [tempListID]: tempListCardIds
        }



        const tempList: List = {
            ID: tempListID,
            Title: title,
            ExternalAccess: "open",
            CreatedAt: new Date().toISOString(),
            UpdatedAt: new Date().toISOString(),
            DeletedAt: null,
        }
        const tempBoardList: BoardList = {
            ID: tempListID,
            RootID: tempListID,
            BoardID: boardID,
            Position: "",
            ListID: tempListID,
            AccessMode: "editable",
            CreatedAt: new Date().toISOString(),
            UpdatedAt: new Date().toISOString(),
            DeletedAt: null,
        }

        const tempCards: Card[] = []
        const tempListCards: ListCard[] = []
        listcardIdsToCopy.forEach((lcId) => {
            const listCard = listCardById[lcId]
            if (!listCard) return
            const card = cardsById[listCard.CardID]
            if (!card) return
            const tempCardID = `temp-card-${Date.now()}-${card.ID}`

            tempCards.push({
                ...card,
                ID: tempCardID,
                CreatedAt: new Date().toISOString(),
                UpdatedAt: new Date().toISOString(),
                DeletedAt: null,
            })
            tempListCards.push({
                ...listCard,
                ID: tempCardID,
                CardID: tempCardID,
                ListID: tempListID,
                CreatedAt: new Date().toISOString(),
                UpdatedAt: new Date().toISOString(),
                DeletedAt: null,
            })

        })

        useListsStore.setState((state) => ({
            listsById: {
                ...state.listsById,
                [tempListID]: tempList
            }
        }))

        useCardsStore.setState((state) => ({
            cardsById: {
                ...state.cardsById,
                ...tempCards.reduce((acc, card) => ({ ...acc, [card.ID]: card }), {})
            }
        }))




        useBoardDetailStore.setState((state) => ({
            boardListIdsByBoardId: nextBoardListIdsByBoardId,
            listCardIdsByListId: nextListCardIdsByListId,
            listCardById: {
                ...state.listCardById,
                ...tempListCards.reduce((acc, lc) => ({ ...acc, [lc.ID]: lc }), {})
            },
            boardListById: {
                ...state.boardListById,
                [tempBoardList.ID]: tempBoardList
            }


        }))





    }



    return { executeCopyListOptimistic }

}