
import { create } from "zustand";


import { api } from "@/api/api";
import { useListsStore } from "./listsStore";
import { useCardsStore, type CrossMoveCardRequest } from "./cardsStore";
import { useBoardsStore } from "./boardsStore";
import type { Board, BoardEvent, BoardLabel, BoardListAccessMode, Card, CardChecklist, CardComment, CardLabelLink, Checklist, ChecklistEntry, CrossBoardMoveBoardPayload, Entry, EntryMember, List, ListCardMovedPayload, ListCardRelation, RootBoardListResponse, User, UserBoard, UserWorkspace } from "./types";
import { useLabelsStore } from "./labelsStore";
import { useBoardMembersStore } from "./boardMembersStore";
import { useUserStore } from "./userStore";
import { useCardMembersStore } from "./CardMembersStore";
import { useChecklistStore } from "./checklistStore";
import { useCardCommentsStore } from "./cardCommentsStore";
import type { ShareOffer } from "./shareOfferTypes";
import { useUiStore } from "./uiStore";
import { useAsyncRequestStore } from "./asyncRequestStore";
import type { AxiosResponse } from "axios";




export type ListCard = ListCardRelation



type BoardList = {
    ID: string
    RootID: string
    BoardID: string
    ListID: string
    Position: string
    AccessMode?: BoardListAccessMode
    CreatedAt: string
    UpdatedAt: string
    DeletedAt: string | null

}


export type BoardDetailPatch = {
    VisibilityRole: string
    Board: Partial<Board> & Pick<Board, "ID">
    UserBoardRelation: UserBoard
    Lists: Record<string, List>
    Cards: Record<string, Card>
    Checklists: Record<string, Checklist>
    Entries: Record<string, Entry>
    Users: Record<string, User>
    Boards: Record<string, Board>
    BoardListRelations: BoardList[]
    ListCardRelations: ListCard[]
    CardChecklistRelations: CardChecklist[]
    ChecklistEntryRelations: ChecklistEntry[]
    BoardLabels: BoardLabel[]
    CardLabelLinks: CardLabelLink[]
    CardMembers: any[]
    UserBoardRelations: UserBoard[]
    EntryMembers: EntryMember[]
    MovedChecklistEntriesByChecklistID?: Record<string, ChecklistEntry[]>
    CardComments?: CardComment[]
    UserWorkspaceRelations?: UserWorkspace[]
    ShareOffers?: ShareOffer[]
    BoardListIdsByBoardID?: Record<string, string[]>



}
type MoveCardEventPayload = ListCardMovedPayload

type MoveListRequest = {
    BeforeID: string | null
    InsertAt: "start" | "end"
}


function compareLexoRank(a: string, b: string): number {
    if (a === b) return 0;
    return a < b ? -1 : 1;
}

function sortByPosition<T extends { Position: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => compareLexoRank(a.Position, b.Position));
}

function uniqueIds(ids: string[]): string[] {
    return Array.from(new Set(ids));
}

function extractInvalidatedRootBoardListCardIds(payloadData: any): string[] {
    // Canonical contract: payload.invalidations.RootBoardListCardIds
    const canonical = payloadData?.Payload?.invalidations?.RootBoardListCardIds;
    if (Array.isArray(canonical)) {
        return canonical.filter((id): id is string => typeof id === "string" && id.trim() !== "");
    }

    return [];
}

type RootData = {
    rootListID?: string
    isUserBoardPurged?: boolean
    isUserBoardSoftDeleted?: boolean
    isMainListCardPurged?: boolean
    isMainListCardSoftDeleted?: boolean
    isRootPurged?: boolean
    isRootSoftDeleted?: boolean
}


type BoardDetailStore = {
    OpCounter: number
    processedEventKeys: string[]
    currentBoardId: string | null
    VisibilityRole: string | null
    listCardById: Record<string, ListCard>
    listCardIdsByListId: Record<string, string[]>
    boardListById: Record<string, BoardList>
    boardListIdsByBoardId: Record<string, string[]>

    rootBoardIdByListCardId: Record<string, string>
    rootListCardDataByListCardId: Record<string, RootData>
    invalidatedRootBoardListCardIds: Record<string, true>


    setCurrentBoardId: (boardID: string | null) => void
    getListCardIds: (listID: string) => string[]

    getRootListIdForCardId: (cardID: string) => string | null

    applyBoardDetailPatch: (payload: BoardDetailPatch) => void
    applyEvent: (payload: any) => Promise<void>
    applyEventEntitiesPatch: (patch: BoardDetailPatch) => void
    getBoardDetailPatch: (boardID: string) => Promise<void>
    applyEventDelta: (payload: DeltaPayload) => Promise<void>
    applyAddCardList: (payload: BoardDetailPatch) => Promise<void>
    applyDetatchCardList: (payload: BoardDetailPatch, forceDelete: boolean) => Promise<void>
    fetchListCardsByListId: (listID: string) => Promise<ListCard[]>
    fetchBoardListByBoardId: (boardID: string) => Promise<void>
    fetchCardsByListId: (boardId: string, listID: string) => Promise<void>
    getListsForBoard: (boardID: string) => Promise<List[]>
    getCardsForList: (boardID: string, listID: string) => Promise<Card[]>
    selectListsForBoard: (boardID: string | null) => List[]
    selectCardsForList: (listID: string | null) => Card[]
    selectSourceListsForCard: (cardID: string, boardID: string) => List[]

    incrementCounter: () => void
    persistMoveCard: (payload: CrossMoveCardRequest, listCardId: string) => Promise<void>
    applyMoveCardEvent: (payload: MoveCardEventPayload) => void
    applyCreateListEvent: (payload: BoardDetailPatch) => Promise<void>
    applyDetatchListEvent: (payload: BoardDetailPatch) => Promise<void>
    applyMoveListEvent: (payload: BoardDetailPatch) => Promise<void>
    persistMoveList: (boardId: string, boardListID: string, beforeID: string | null) => Promise<void>
    applyMergeListCards: (payload: any) => void
    isListCardInBoard: (listCardID: string, boardID: string) => boolean
    applyListCardCrossBoardMove: (payload: CrossBoardMoveBoardPayload) => void
    mergeListCardsPatch: (payload: Record<string, ListCard>) => void
    mergeBoardListsPatch: (payload: Record<string, BoardList>) => void
    removeListCardsByIds: (listCardIds: string[]) => void
    checkBoardListsConsistency: (nextBoardListIds: string[], patch: BoardDetailPatch) => Promise<boolean>
    setBoardListIdsByBoardId: (boardId: string, boardListIds: string[]) => void
    setListCardIdsByListId: (listId: string, listCardIds: string[]) => void
    getListIdForListCardId: (listCardId: string) => string | null
    getListIdForBoardListId: (boardListId: string) => string | null
    getCardIdForListCardId: (listCardId: string) => string | null
    persistMoveCardInBoard: (listCardId: string, targetListID: string, fromListID: string, beforeID: string | null) => Promise<void>

    fetchRootBoardForListcardId: (boardID: string, listCardID: string) => Promise<RootBoardListResponse | null>
    getRootBoardForListCardId: (listCardID: string) => Board | null
    invalidateRootBoardCacheForListCards: (listCardIDs: string[]) => void
    clearRootBoardCacheInvalidation: (listCardID: string) => void
    applyListCardDetachEvent: (payload: BoardDetailPatch) => Promise<void>
    getBoardListForListCardId: (listCardID: string, boardID: string) => BoardList | null
}

export type DeltaPayload = {
    Type: string
    BoardID: string
    Payload: BoardDetailPatch
    TS: string
}

export const useBoardDetailStore = create<BoardDetailStore>((set, get) => ({

    OpCounter: 0,
    processedEventKeys: [],
    currentBoardId: null,
    VisibilityRole: null,
    listCardById: {}, //ORDER OF LISTCARDS IN THE LIST
    listCardIdsByListId: {}, //META OF LISTCARDS BY ID
    boardListById: {}, //ORDER OF LISTS IN THE BOARD
    boardListIdsByBoardId: {}, //META OF BOARDLISTS BY ID
    //rootsByRootId: {},
    rootListCardDataByListCardId: {},
    rootBoardIdByListCardId: {},
    invalidatedRootBoardListCardIds: {},

    getRootListIdForCardId: (cardID) => {
        const listCardById = get().listCardById
        const listCard = Object.values(listCardById).find((lc) => lc.CardID === cardID)
        if (!listCard) return null
        const rootId = listCard.RootID ?? null
        const listID = listCardById[rootId ?? ""]?.ListID
        //  console.log("getRootListIdForCardId", { cardID, listCard, listID })

        return listID
    },

    getListCardIds: (listID) => {
        return uniqueIds(get().listCardIdsByListId[listID] ?? [])

    },
    incrementCounter() {
        set((state) => ({
            OpCounter: state.OpCounter + 1
        }))
    },

    setCurrentBoardId: (boardID) => set(() => ({ currentBoardId: boardID })),

    selectSourceListsForCard: (cardID, boardID) => {
        const candidateListIdsInBoard = (get().boardListIdsByBoardId[boardID] ?? []).map(((id) => get().boardListById[id])).map(bl => bl.ListID)
        const candidateListIds = Object.values(get().listCardById).filter((lc) => lc.CardID === cardID).map((lc) => lc.ListID)
        const sourceListIds = candidateListIds.filter((id) => candidateListIdsInBoard.some((idInBoard) => idInBoard === id))
        return sourceListIds.map((id) => useListsStore.getState().listsById[id])
    },

    applyBoardDetailPatch: (payload: BoardDetailPatch) => {
        // console.log("Applying board detail patch:", payload)
        useListsStore.getState().mergeListsPatch(payload.Lists)
        useCardsStore.getState().mergeCardsPatch(payload.Cards)
        useBoardsStore.getState().mergeBoardsPatch({
            ...(payload.Boards ?? {}),
            [payload.Board.ID]: payload.Board,
        })
        useBoardsStore.getState().mergeUserBoardRelation(payload.UserBoardRelation)
        useLabelsStore.getState().replaceBoardLabelsPatch(payload.Board.ID, payload.BoardLabels, payload.CardLabelLinks)
        useBoardMembersStore.getState().mergeBoardMembers(payload.Board.ID, payload.UserBoardRelations)
        useUserStore.getState().mergeUsers(Object.values(payload.Users))
        useCardMembersStore.getState().replaceCardMembers(payload.CardMembers)
        useChecklistStore.getState().replaceChecklistData(payload)

        const ListCardById = payload.ListCardRelations.reduce((acc, lc) => {
            acc[lc.ID] = lc
            return acc
        }, {} as Record<string, ListCard>)

        const ListCardIdsByListId: Record<string, string[]> = {}
        payload.ListCardRelations.forEach((rel) => {
            ListCardIdsByListId[rel.ListID] ??= []
            ListCardIdsByListId[rel.ListID] = [...ListCardIdsByListId[rel.ListID], rel.ID]
        })

        const BoardListById = payload.BoardListRelations.reduce((acc, bl) => {
            acc[bl.ID] = bl
            return acc
        }, {} as Record<string, BoardList>)

        const BoardListIdsByBoardId: Record<string, string[]> = {}
        payload.BoardListRelations.forEach((rel) => {
            BoardListIdsByBoardId[rel.BoardID] ??= []
            BoardListIdsByBoardId[rel.BoardID] = [...BoardListIdsByBoardId[rel.BoardID], rel.ID]
        })

        set((state) => ({
            VisibilityRole: payload.VisibilityRole,
            listCardById: { ...state.listCardById, ...ListCardById },
            listCardIdsByListId: { ...state.listCardIdsByListId, ...ListCardIdsByListId },
            boardListById: { ...state.boardListById, ...BoardListById },
            boardListIdsByBoardId: { ...state.boardListIdsByBoardId, ...BoardListIdsByBoardId },
        }))
        //console.log("Updated BoardDetailStore:", get().ListIdsByBoardId, get().CardIdsByListId)
    },
    isListCardInBoard: (listCardID, boardID) => {
        const listCard = get().listCardById[listCardID]
        if (!listCard) return false
        const listID = listCard.ListID
        const boardListIds = get().boardListIdsByBoardId[boardID] ?? []
        const boardListById = get().boardListById
        return boardListIds.some((boardListId) => {
            const boardList = boardListById[boardListId]
            // console.log("Checking if listCardID", listCardID, "is in boardID", boardID, "by comparing boardList.ListID", boardList.ListID, "with listID", listID)
            return boardList.ListID === listID
        })
    },



    getBoardDetailPatch: async (boardID: string) => {
        try {
            const response = await api.get(`/boards/${boardID}/`)
            const data: BoardDetailPatch = response.data
            // console.log("Fetched board detail patch:", data)
            get().applyBoardDetailPatch(data)

        } catch (error) {
            // console.error("Error fetching board detail:", error)
            throw error
        }
    },
    async applyEvent(payload) {
        const eventType = payload?.Type
        const correlationID = payload?.CorrelationID
        const eventID = payload?.ID
        const eventBoardID = payload?.BoardID

        const dedupeKey =
            (typeof correlationID === "string" && correlationID.trim() !== "" && typeof eventType === "string" && eventType.trim() !== "")
                ? `${correlationID}::${eventType}::${typeof eventBoardID === "string" ? eventBoardID : ""}`
                : (typeof eventID === "string" && eventID.trim() !== "" ? `id::${eventID}` : null)

        const processedEventKeys = get().processedEventKeys
        if (dedupeKey && processedEventKeys.includes(dedupeKey)) {
            // console.log("Duplicate event received, ignoring:", dedupeKey)
            return
        }

        if (dedupeKey) {
            set((state) => ({ processedEventKeys: [...state.processedEventKeys, dedupeKey] }))
        }
        // console.log(payload)
        await get().applyEventDelta(payload)
        return
    },
    applyEventEntitiesPatch: (patch: BoardDetailPatch) => {
        useCardsStore.getState().mergeCardsPatch(patch.Cards)
        useListsStore.getState().mergeListsPatch(patch.Lists)
        useBoardsStore.getState().mergeBoardsPatch({
            ...(patch.Boards ?? {}),
            [patch.Board.ID]: patch.Board,
        })
    },
    async applyEventDelta(payloadData: any) {
        const invalidatedListCardIds = extractInvalidatedRootBoardListCardIds(payloadData)
        if (invalidatedListCardIds.length > 0) {
            get().invalidateRootBoardCacheForListCards(invalidatedListCardIds)
        }

        let payload = payloadData as DeltaPayload
        let actionType = payload.Type
        let patch = payload.Payload
        if (
            payloadData &&
            payloadData.Payload &&
            typeof payloadData.Payload === "object" &&
            payloadData.Payload.StatePayload &&
            typeof payloadData.Payload.StatePayload === "object"
        ) {
            patch = payloadData.Payload.StatePayload as BoardDetailPatch
            actionType = (payloadData as BoardEvent).Type
        }

        switch (actionType) {
            case "board.patched": {
                get().applyEventEntitiesPatch(patch)
                break
            }
            case "card.created": {
                get().applyEventEntitiesPatch(patch)
                //Relation
                // console.log("Applying card.created event with patch:", patch)
                //Related entities
                useLabelsStore.getState().mergeLabelsPatch(patch)
                useCardCommentsStore.getState().mergeCommentsPatch(patch)
                useCardMembersStore.getState().mergeCardMembersPatch(patch)
                useChecklistStore.getState().mergeChecklistPatch(patch)
                await get().applyAddCardList(patch)
                break
            }
            case "checklist.entry.converted": {
                get().applyEventEntitiesPatch(patch)
                await get().applyAddCardList(patch)
                break
            }
            case "card.patched":
            case "list.patched": {
                get().applyEventEntitiesPatch(patch)
                break
            }
            case "card.detatched": {
                // console.log("cardDetatchedSwitch")
                // console.debug("[ws] event card.detatched", {
                //     listCards: payload.Payload.ListCardRelations?.length ?? 0
                // })
                //Relation
                await get().applyDetatchCardList(patch, false)
                break
            }
            case "listcard.moved": {
                // console.log("list-card-moved-event")
                get().applyMoveCardEvent(patch as unknown as MoveCardEventPayload)
                break
            }
            case "board.listcard.moved": {
                const movePayload = payloadData?.Payload?.RealtimePayload ?? payloadData?.Payload
                get().applyMoveCardEvent(movePayload as MoveCardEventPayload)
                break
            }

            case "board.list.created": {
                // console.debug("[store] event list.created")
                //useListsStore.getState().mergeListsPatch(patch.Lists)
                get().applyEventEntitiesPatch(patch)
                await get().applyCreateListEvent(patch)
                break
            }
            case "board.list.restored": {
                if (patch?.Lists) {
                    useListsStore.getState().mergeListsPatch(patch.Lists)
                }
                await get().applyCreateListEvent(patch)
                break
            }
            case "board.list.detatched": {
                // console.log("list-detatched-event")
                await get().applyDetatchListEvent(patch as unknown as BoardDetailPatch)
                break

            }
            case "board.list.purged": {
                await get().applyDetatchListEvent(patch as unknown as BoardDetailPatch)
                break
            }
            case "board.list.moved": {
                // console.log("list-moved-event")
                await get().applyMoveListEvent(patch)
                break
            }
            case "board.list.patched": {
                const relations = patch?.BoardListRelations ?? []
                if (relations.length > 0) {
                    const nextBoardListById = { ...get().boardListById }
                    relations.forEach((rel) => {
                        nextBoardListById[rel.ID] = rel as unknown as BoardList
                    })
                    set((state) => ({
                        boardListById: nextBoardListById,
                        OpCounter: state.OpCounter + 1,
                    }))
                }
                break
            }
            case "board.list.mirrored":
            case "board.list.mirrored.target": {
                get().applyEventEntitiesPatch(patch)
                get().applyMergeListCards(patch)
                await get().applyCreateListEvent(patch)
                break
            }
            case "board.list.mirrored.source": {
                break
            }
            case "board.listcard.restored": {
                await get().applyAddCardList(patch)
                break
            }

            case "board.listcard.purged": {
                await get().applyDetatchCardList(patch, false)
                break
            }
            case "card.mirrored":
            case "card.mirrored.target":
            case "card.mirrored.source": {
                useCardsStore.getState().mergeCardsPatch(patch.Cards)
                get().applyMergeListCards(patch)
                break
            }
            case "listcard.crossboard.moved": {
                get().applyListCardCrossBoardMove(payloadData.Payload as CrossBoardMoveBoardPayload)
                break
            }
            case "board.listcard.detatched":
            case "board.listcards.detatched": {
                await get().applyDetatchCardList(patch, true)
                //get().applyListCardDetachEvent(patch)
                break
            }
        }
    },
    applyListCardCrossBoardMove(payload) {
        if (payload.Cards) {
            useCardsStore.getState().mergeCardsPatch(payload.Cards)
        }
        if (payload.Boards) {
            useBoardsStore.getState().mergeBoardsPatch(payload.Boards)
        }
        const fromListcards = payload.FromListCards ?? []
        const fromIds = fromListcards.map((lc) => lc.ID) ?? []
        const fromListID = payload.FromListID
        const toListcards = payload.ToListCards ?? []
        const toIds = toListcards.map((lc) => lc.ID) ?? []
        const toListID = payload.ToListID

        const listcard = payload.ListCardPatch
        set((state) => {
            const nextListcardById = { ...state.listCardById, [listcard.ID]: listcard }
            const nextListcardIdsByListId = { ...state.listCardIdsByListId, [fromListID]: fromIds, [toListID]: toIds }
            return {
                listCardById: nextListcardById,
                listCardIdsByListId: nextListcardIdsByListId,
                OpCounter: state.OpCounter + 1
            }

        })

    },





    fetchListCardsByListId: async (listID: string) => {
        try {
            const boardID = get().currentBoardId

            const response = await api.get(`/boards/${boardID}/lists/${listID}/listcards`)
            const data: ListCard[] = response.data
            return data

        } catch (error) {
            // console.log(error)
            throw error
        }

    },
    fetchBoardListByBoardId: async (boardID: string) => {
        try {
            const response = await api.get(`/boards/${boardID}/lists/`)
            const data: BoardDetailPatch = response.data
            // console.log("Fetched board lists:", data)
            const BoardListById = data.BoardListRelations.reduce((acc, bl) => {
                acc[bl.ID] = bl
                return acc
            }, {} as Record<string, BoardList>)
            set((state) => ({
                boardListById: { ...state.boardListById, ...BoardListById },
                boardListIdsByBoardId: { ...state.boardListIdsByBoardId, [boardID]: data.BoardListRelations.map((rel) => rel.ID) }
            }))
            useListsStore.getState().mergeListsPatch(data.Lists)
        }
        catch (error) {
            throw error
        }
    },
    fetchCardsByListId: async (boardId: string, listID: string) => {
        try {
            const response = await api.get(`/boards/${boardId}/lists/${listID}/cards`)
            const data: BoardDetailPatch = response.data
            useCardsStore.getState().mergeCardsPatch(data.Cards)
            const ListCardById = data.ListCardRelations.reduce((acc, lc) => {
                acc[lc.ID] = lc
                return acc
            }, {} as Record<string, ListCard>)

            set((state) => ({
                listCardById: { ...state.listCardById, ...ListCardById },
                listCardIdsByListId: { ...state.listCardIdsByListId, [listID]: data.ListCardRelations.map((rel) => rel.ID) }
            }))
        } catch (error) {
            throw error
        }

    },
    selectListsForBoard: (boardID: string | null) => {
        if (!boardID) return []
        const boardListIds = get().boardListIdsByBoardId[boardID] ?? []
        const boardListsById = get().boardListById
        const listsById = useListsStore.getState().listsById

        const lists: List[] = []
        for (const boardListId of boardListIds) {
            const boardList = boardListsById[boardListId]
            if (!boardList) continue
            const list = listsById[boardList.ListID]
            if (list) {
                lists.push(list)
            }
        }
        return lists
    },
    selectCardsForList: (listID: string | null) => {
        if (!listID) return []
        const listCardIds = get().listCardIdsByListId[listID] ?? []
        const listCardById = get().listCardById
        const cardsById = useCardsStore.getState().cardsById

        const cards: Card[] = []
        for (const listCardId of listCardIds) {
            const listCard = listCardById[listCardId]
            if (!listCard) continue
            const card = cardsById[listCard.CardID]
            if (card) {
                cards.push(card)
            }
        }
        return cards
    },
    getListsForBoard: async (boardID: string) => {
        await get().fetchBoardListByBoardId(boardID)
        return get().selectListsForBoard(boardID)
    },
    getCardsForList: async (boardID: string, listID: string) => {
        await get().fetchCardsByListId(boardID, listID)
        return get().selectCardsForList(listID)
    },




    applyAddCardList: async (payload) => {
        // console.log("applyADD")
        const lcPayload = payload.ListCardRelations
        if (lcPayload.length > 1) return
        const rel = lcPayload[0]

        // console.log("Applying AddCardList for ListCard ID:", rel)

        const prevListCardById = get().listCardById
        let nextListCardById = { ...prevListCardById, [rel.ID]: rel }

        const prevListCardIdsByListId = get().listCardIdsByListId
        const nextLCIdsByListId = { ...prevListCardIdsByListId }
        nextLCIdsByListId[rel.ListID] ??= []
        if (!nextLCIdsByListId[rel.ListID].includes(rel.ID)) {
            nextLCIdsByListId[rel.ListID].push(rel.ID)

            const ids = nextLCIdsByListId[rel.ListID]
            const listCards = ids.map((id) => nextListCardById[id])
            const sortedListCards = sortByPosition(listCards)
            nextLCIdsByListId[rel.ListID] = sortedListCards.map((lc) => lc.ID)



        } else {
            const updatedListCards = await get().fetchListCardsByListId(rel.ListID)
            const ids = updatedListCards.map((lc) => lc.ID)
            nextLCIdsByListId[rel.ListID] = ids

            updatedListCards.forEach((lc) => {
                nextListCardById = { ...prevListCardById, [lc.ID]: lc }
            })


        }
        set((state) => ({
            listCardById: nextListCardById,
            listCardIdsByListId: nextLCIdsByListId,

            OpCounter: state.OpCounter + 1,


        }))
    },
    applyDetatchCardList: async (payload, forceDelete) => {
        // console.log("applyDETATCH")
        const lcPayload = payload.ListCardRelations
        if (!lcPayload || lcPayload.length < 1) return

        const currentRouteCardId = useUiStore.getState().currentRouteParams.cardId
        if (currentRouteCardId && lcPayload.some((rel) => rel.CardID === currentRouteCardId)) {
            useUiStore.getState().setDeletedCardModalOpen(true, currentRouteCardId)
        }

        // console.debug("[store] applyDetatchCardList", {
        // listCardId: rel.ID,
        // listId: rel.ListID
        // })

        const prevListCardById = get().listCardById
        const prevListCardIdsByListId = get().listCardIdsByListId
        const prevRootBoardIdByListCardId = get().rootBoardIdByListCardId
        const prevRootListCardDataByListCardId = get().rootListCardDataByListCardId
        const prevInvalidatedRootBoardListCardIds = get().invalidatedRootBoardListCardIds
        let nextListCardById = { ...prevListCardById }
        const nextRootBoardIdByListCardId = { ...prevRootBoardIdByListCardId }
        const nextRootListCardDataByListCardId = { ...prevRootListCardDataByListCardId }
        const nextInvalidatedRootBoardListCardIds = { ...prevInvalidatedRootBoardListCardIds }

        const nextLCIdsByListId = { ...prevListCardIdsByListId }
        const affectedListIDs = Array.from(new Set(lcPayload.map((rel) => rel.ListID)))

        for (const rel of lcPayload) {
            delete nextListCardById[rel.ID]
            delete nextRootBoardIdByListCardId[rel.ID]
            delete nextRootListCardDataByListCardId[rel.ID]
            delete nextInvalidatedRootBoardListCardIds[rel.ID]
            const ids = [...(nextLCIdsByListId[rel.ListID] ?? [])]
            const idx = ids.findIndex((id) => id === rel.ID)
            if (idx !== -1) {
                ids.splice(idx, 1)
            }
            nextLCIdsByListId[rel.ListID] = ids
        }

        for (const listID of affectedListIDs) {
            const ids = nextLCIdsByListId[listID] ?? []
            if (ids.length === 0 && !forceDelete) {
                const updatedListCards = await get().fetchListCardsByListId(listID)
                nextLCIdsByListId[listID] = updatedListCards.map((lc) => lc.ID)
                updatedListCards.forEach((lc) => {
                    nextListCardById = { ...nextListCardById, [lc.ID]: lc }
                })
            }
        }



        set((state) => ({
            listCardById: nextListCardById,
            listCardIdsByListId: nextLCIdsByListId,
            rootBoardIdByListCardId: nextRootBoardIdByListCardId,
            rootListCardDataByListCardId: nextRootListCardDataByListCardId,
            invalidatedRootBoardListCardIds: nextInvalidatedRootBoardListCardIds,
            OpCounter: state.OpCounter + 1

        }))

    },
    persistMoveCardInBoard: async (listCardId: string, targetListID: string, fromListID: string, beforeID: string | null) => {
        const payload: CrossMoveCardRequest = {
            ListCardID: listCardId,
            TargetListID: targetListID,
            FromListID: fromListID,
            DetatchFromList: true,
            AfterID: null,
            BeforeID: beforeID,
            InsertAt: "end"
        }
        get().persistMoveCard(payload, listCardId)
    },

    persistMoveCard: async (payload, listCardID) => {
        // console.log("persisteMoveCard")
        //console.log("persistMovePayload:", payload)
        try {
            const boardID = get().currentBoardId
            const cardID = get().listCardById[listCardID].CardID
            await api.patch(`/boards/${boardID}/cards/${cardID}/crossmove`, payload)
        } catch (error) {
            throw error
        }

    },
    applyMoveCardEvent: (payload: MoveCardEventPayload) => {
        // console.log("applyMoveCardEvent")
        if (payload.Cards) {
            useCardsStore.getState().mergeCardsPatch(payload.Cards)
        }
        const { ListCardPatch: listCardPatch, FromListCards: fromListCards, ToListCards: toListCards } = payload

        const fromIds = fromListCards ? fromListCards.map((lc) => lc.ID) : []
        const toIds = toListCards ? toListCards.map((lc) => lc.ID) : []
        const fromListID = payload.FromListID
        const toListID = payload.ToListID

        const currentBoardID = get().currentBoardId
        const sourceBoardID = payload.SourceBoardID
        const targetBoardID = payload.TargetBoardID
        const scopedListIDs = payload.ListCardIdsByListID
        const hasBoardScopedPayload = !!currentBoardID && !!sourceBoardID && !!targetBoardID && !!scopedListIDs

        if (hasBoardScopedPayload) {
            const expectedListID = currentBoardID === sourceBoardID
                ? fromListID
                : currentBoardID === targetBoardID
                    ? toListID
                    : null

            if (!expectedListID) {
                return
            }

            if (!(expectedListID in scopedListIDs)) {
                return
            }
        }

        const applyFromSide = !hasBoardScopedPayload || (fromListID in (scopedListIDs ?? {}))
        const applyToSide = !hasBoardScopedPayload || (toListID in (scopedListIDs ?? {}))

        const currentFromIds = get().listCardIdsByListId[fromListID] ?? []
        const currentToIds = get().listCardIdsByListId[toListID] ?? []

        const isFromMismatched = applyFromSide && JSON.stringify(fromIds) != JSON.stringify(currentFromIds)
        const isToMismatched = applyToSide && JSON.stringify(toIds) != JSON.stringify(currentToIds)

        if (isFromMismatched || isToMismatched) {
            // console.log("FOUND MISMATCH")
            // console.log("Event FromIds:", fromIds)
            // console.log("Current FromIds:", currentFromIds)
            // console.log("Event ToIds:", toIds)
            // console.log("Current ToIds:", currentToIds)
            const nextListCardIdsByListId = { ...get().listCardIdsByListId }
            if (applyToSide) {
                nextListCardIdsByListId[toListID] = toIds
            }
            if (applyFromSide) {
                nextListCardIdsByListId[fromListID] = fromIds
            }

            let nextListCardById = { ...get().listCardById }
            if (applyFromSide && fromListCards) {
                fromListCards.forEach((lc) => {
                    nextListCardById = { ...nextListCardById, [lc.ID]: lc }
                })
            }
            if (applyToSide && toListCards) {
                toListCards.forEach((lc) => {
                    nextListCardById = { ...nextListCardById, [lc.ID]: lc }
                })
            }

            set((state) => ({
                listCardById: nextListCardById,
                listCardIdsByListId: nextListCardIdsByListId,
                OpCounter: state.OpCounter + 1
            }))

        }
        else {
            const currentListCardById = get().listCardById
            const nextListCardById = {
                ...currentListCardById,
                [listCardPatch.ID]: listCardPatch,
            }
            set(() => ({
                listCardById: nextListCardById
            }))
        }


    },
    applyCreateListEvent: async (payload) => {
        // console.debug("[store] applyCreateListEvent")

        const relations = payload.BoardListRelations ?? []
        if (relations.length === 0) return

        const prevBoardListById = get().boardListById
        const nextBoardListById = { ...prevBoardListById }
        const prevBoardListIdsByBoardId = get().boardListIdsByBoardId
        const nextBoardListIdsByBoardId = { ...prevBoardListIdsByBoardId }

        let hasChanges = false

        for (const rel of relations) {
            const prevRel = nextBoardListById[rel.ID]
            if (!prevRel || JSON.stringify(prevRel) !== JSON.stringify(rel)) {
                nextBoardListById[rel.ID] = rel
                hasChanges = true
            }

            nextBoardListIdsByBoardId[rel.BoardID] = [...new Set([...(nextBoardListIdsByBoardId[rel.BoardID] ?? [])])]
            if (!nextBoardListIdsByBoardId[rel.BoardID].includes(rel.ID)) {
                nextBoardListIdsByBoardId[rel.BoardID].push(rel.ID)
                hasChanges = true
            }
        }

        if (!hasChanges) return
        if (!await get().checkBoardListsConsistency(nextBoardListIdsByBoardId[relations[0].BoardID], payload)) {
            return
        }

        set((state) => ({
            boardListById: nextBoardListById,
            boardListIdsByBoardId: nextBoardListIdsByBoardId,
            OpCounter: state.OpCounter + 1
        }))

    },
    applyDetatchListEvent: async (payload) => {
        //console.log("applyDetatchListEvent", payload)
        const rel = payload.BoardListRelations[0]


        const prevBoardListById = get().boardListById
        const nextBoardListById = { ...prevBoardListById }
        delete nextBoardListById[rel.ID]

        const prevBLIdsByBoardId = get().boardListIdsByBoardId
        const nextBLIdsByBoardId = { ...prevBLIdsByBoardId }
        nextBLIdsByBoardId[rel.BoardID] = [...new Set([...(nextBLIdsByBoardId[rel.BoardID] ?? [])])]
        //console.log("Before Detatch:", nextBLIdsByBoardId[rel.BoardID], "Rel.ID:", rel.ID)
        const idx = nextBLIdsByBoardId[rel.BoardID].findIndex((id) => id === rel.ID)
        //console.log("IDX to Detatch:", idx)
        if (idx === -1) {
            let boardId = rel.BoardID
            const currentBoardID = get().currentBoardId
            if (currentBoardID != null) { boardId = currentBoardID }
            if (!boardId) return
            await get().getBoardDetailPatch(boardId)
            return

        } else {
            nextBLIdsByBoardId[rel.BoardID].splice(idx, 1)
            nextBLIdsByBoardId[rel.BoardID] = [...new Set(nextBLIdsByBoardId[rel.BoardID])]

            if (!await get().checkBoardListsConsistency(nextBLIdsByBoardId[rel.BoardID], payload)) {
                return
            }
            //console.log("Applying DetatchListEvent for BoardList ID:", rel.ID)
            //console.log("prevIds:", prevBLIdsByBoardId[rel.BoardID])
            set((state) => ({
                boardListById: nextBoardListById,
                boardListIdsByBoardId: nextBLIdsByBoardId,
                OpCounter: state.OpCounter + 1

            }))
        }
        // console.log("Updated BoardListIds for BoardID", rel.BoardID, ":", nextBLIdsByBoardId[rel.BoardID])
    },

    checkBoardListsConsistency: async (nextBoardListIds: string[], payload: BoardDetailPatch): Promise<boolean> => {
        let boardId = payload.BoardListRelations[0].BoardID
        const currentBoardID = get().currentBoardId
        if (currentBoardID != null) { boardId = currentBoardID }
        if (!boardId) return false
        const serverBlIds = payload?.BoardListIdsByBoardID?.[boardId] ?? []
        // console.log("Checking board lists consistency. Next IDs:", nextBoardListIds, "Server IDs:", serverBlIds)
        if (JSON.stringify(nextBoardListIds) !== JSON.stringify(serverBlIds)) {
            await get().getBoardDetailPatch(boardId)
            return false
        }
        return true
    },
    persistMoveList: async (boardId, boardListID, beforeID) => {
        // console.log("persistMoveList")
        const movedBoardList = get().boardListById[boardListID]
        const beforeBoardList = beforeID ? get().boardListById[beforeID] : null

        if (!movedBoardList) {
            return
        }

        const request: MoveListRequest = {
            BeforeID: beforeBoardList?.ListID ?? null,
            InsertAt: "end"
        }
        try {
            const listId = movedBoardList.ListID
            api.patch(`/boards/${boardId}/lists/${listId}/move`, request)
        } catch (error) {
            // console.error("Error persisting list move:", error)
            throw error
        }
    },
    applyMoveListEvent: async (payload) => {
        const movedRel = payload.BoardListRelations?.[0]
        if (!movedRel) {
            return
        }

        const boardID = movedRel.BoardID
        const currentBoardID = get().currentBoardId
        const targetBoardID = currentBoardID ?? boardID
        const serverBLIds = payload.BoardListIdsByBoardID?.[targetBoardID] ?? []

        const prevBoardListById = get().boardListById
        const nextBoardListById = { ...prevBoardListById, [movedRel.ID]: movedRel }
        const prevBoardListIdsByBoardId = get().boardListIdsByBoardId
        const currentBLIds = prevBoardListIdsByBoardId[targetBoardID] ?? []

        const hasServerOrder = serverBLIds.length > 0
        const isOrderMismatched = hasServerOrder && JSON.stringify(currentBLIds) !== JSON.stringify(serverBLIds)

        if (isOrderMismatched) {
            set((state) => ({
                boardListById: nextBoardListById,
                boardListIdsByBoardId: {
                    ...state.boardListIdsByBoardId,
                    [targetBoardID]: serverBLIds,
                },
                OpCounter: state.OpCounter + 1,
            }))
            return
        }

        if (!hasServerOrder && targetBoardID) {
            await get().getBoardDetailPatch(targetBoardID)
            return
        }

        const prevRel = prevBoardListById[movedRel.ID]
        const hasRelChanged = !prevRel || JSON.stringify(prevRel) !== JSON.stringify(movedRel)
        if (!hasRelChanged) {
            return
        }

        set((state) => ({
            boardListById: nextBoardListById,
            OpCounter: state.OpCounter + 1,
        }))
    },
    applyMergeListCards: (payload: BoardDetailPatch) => {

        if (payload.Boards) {
            useBoardsStore.getState().mergeBoardsPatch(payload.Boards)
        }
        const listCardById = payload.ListCardRelations.reduce((acc, lc) => {
            acc[lc.ID] = lc
            return acc
        }, {} as Record<string, ListCard>)

        const listCardIdsByListId: Record<string, string[]> = {}
        payload.ListCardRelations.forEach((rel) => {
            listCardIdsByListId[rel.ListID] ??= []
            listCardIdsByListId[rel.ListID] = [...listCardIdsByListId[rel.ListID], rel.ID]
        })

        set((state) => ({
            listCardById: { ...state.listCardById, ...listCardById },
            listCardIdsByListId: { ...state.listCardIdsByListId, ...listCardIdsByListId },
            OpCounter: state.OpCounter + 1
        }))

    },

    mergeListCardsPatch: (payload: Record<string, ListCard>) => {
        const listCardById = payload

        set((state) => {
            const nextListCardIdsByListId = { ...state.listCardIdsByListId }
            const incomingIdsByListId: Record<string, string[]> = {}

            Object.values(payload).forEach((lc) => {
                incomingIdsByListId[lc.ListID] ??= []
                incomingIdsByListId[lc.ListID].push(lc.ID)
            })

            Object.entries(incomingIdsByListId).forEach(([listID, incomingIds]) => {
                const currentIds = nextListCardIdsByListId[listID] ?? []
                nextListCardIdsByListId[listID] = uniqueIds([...currentIds, ...incomingIds])
            })

            return {
                listCardById: { ...state.listCardById, ...listCardById },
                listCardIdsByListId: nextListCardIdsByListId,
                OpCounter: state.OpCounter + 1
            }
        })
    },
    mergeBoardListsPatch: (payload: Record<string, BoardList>) => {
        const boardListById = payload

        set((state) => {
            const nextBoardListIdsByBoardId = { ...state.boardListIdsByBoardId }
            const incomingIdsByBoardId: Record<string, string[]> = {}

            Object.values(payload).forEach((bl) => {
                incomingIdsByBoardId[bl.BoardID] ??= []
                incomingIdsByBoardId[bl.BoardID].push(bl.ID)
            })

            Object.entries(incomingIdsByBoardId).forEach(([boardID, incomingIds]) => {
                const currentIds = nextBoardListIdsByBoardId[boardID] ?? []
                nextBoardListIdsByBoardId[boardID] = uniqueIds([...currentIds, ...incomingIds])
            })

            return {
                boardListById: { ...state.boardListById, ...boardListById },
                boardListIdsByBoardId: nextBoardListIdsByBoardId,
                OpCounter: state.OpCounter + 1
            }
        })
    },
    removeListCardsByIds: (listCardIds: string[]) => {
        if (listCardIds.length === 0) return

        const nextListCardById = { ...get().listCardById }
        const nextListCardIdsByListId = { ...get().listCardIdsByListId }
        const nextRootBoardIdByListCardId = { ...get().rootBoardIdByListCardId }
        const nextRootListCardDataByListCardId = { ...get().rootListCardDataByListCardId }
        const nextInvalidatedRootBoardListCardIds = { ...get().invalidatedRootBoardListCardIds }

        listCardIds.forEach((listCardId) => {
            const listId = nextListCardById[listCardId]?.ListID
            delete nextListCardById[listCardId]
            delete nextRootBoardIdByListCardId[listCardId]
            delete nextRootListCardDataByListCardId[listCardId]
            delete nextInvalidatedRootBoardListCardIds[listCardId]

            if (!listId) return
            const ids = nextListCardIdsByListId[listId] ?? []
            nextListCardIdsByListId[listId] = ids.filter((id) => id !== listCardId)
        })

        set((state) => ({
            listCardById: nextListCardById,
            listCardIdsByListId: nextListCardIdsByListId,
            rootBoardIdByListCardId: nextRootBoardIdByListCardId,
            rootListCardDataByListCardId: nextRootListCardDataByListCardId,
            invalidatedRootBoardListCardIds: nextInvalidatedRootBoardListCardIds,
            OpCounter: state.OpCounter + 1,
        }))
    },
    setBoardListIdsByBoardId: (boardID: string, listIDs: string[]) => {
        const nextBoardListIdsByBoardId = { ...get().boardListIdsByBoardId, [boardID]: listIDs }
        set((state) => ({
            boardListIdsByBoardId: nextBoardListIdsByBoardId,
            OpCounter: state.OpCounter + 1
        }))
    },
    setListCardIdsByListId: (listID: string, listCardIds: string[]) => {
        const nextListCardIdsByListId = { ...get().listCardIdsByListId, [listID]: listCardIds }
        set((state) => ({
            listCardIdsByListId: nextListCardIdsByListId,
            OpCounter: state.OpCounter + 1
        }))
    },
    getListIdForListCardId: (listCardID: string): string | null => {
        const listCard = get().listCardById[listCardID]
        return listCard ? listCard.ListID : null
    },
    getListIdForBoardListId: (boardListID: string): string | null => {
        const boardList = get().boardListById[boardListID]
        return boardList ? boardList.ListID : null
    },
    getCardIdForListCardId: (listCardID: string): string | null => {
        const listCard = get().listCardById[listCardID]
        return listCard ? listCard.CardID : null
    },

    fetchRootBoardForListcardId: async (boardID: string, listCardID: string): Promise<RootBoardListResponse | null> => {

        const response = await useAsyncRequestStore.getState().execute<AxiosResponse<RootBoardListResponse | null>>("listcard:rootboard:fetch",
            () => api.get(`/boards/${boardID}/listcards/${listCardID}/rootboard`),
            {
                successResetDelayMs: 2000, onSuccess(result) {
                    const payload = result.data as RootBoardListResponse | null
                    const board = payload?.Board ?? null
                    const rootData = {
                        rootListID: payload?.List?.ID,
                        isUserBoardPurged: payload?.IsUserBoardPurged ?? false,
                        isUserBoardSoftDeleted: payload?.IsUserBoardSoftDeleted ?? false,
                        isMainListCardPurged: payload?.IsMainListCardPurged ?? false,
                        isMainListCardSoftDeleted: payload?.IsMainListCardSoftDeleted ?? false,
                        isRootPurged: payload?.IsRootPurged ?? false,
                        isRootSoftDeleted: payload?.IsRootSoftDeleted ?? false,
                    }
                    if (!board?.ID) {
                        set((state) => {
                            const nextRootBoardByListCardId = { ...state.rootBoardIdByListCardId }
                            delete nextRootBoardByListCardId[listCardID]

                            const nextInvalidated = { ...state.invalidatedRootBoardListCardIds }
                            delete nextInvalidated[listCardID]

                            return {
                                rootBoardIdByListCardId: nextRootBoardByListCardId,
                                rootListCardDataByListCardId: {
                                    ...state.rootListCardDataByListCardId,
                                    [listCardID]: rootData,
                                },
                                invalidatedRootBoardListCardIds: nextInvalidated,
                            }
                        })
                        return
                    }
                    useBoardsStore.getState().mergeBoardsPatch({ [board.ID]: board })
                    if (payload?.UserBoard) {
                        useBoardsStore.getState().mergeUserBoardPatch({ [payload.UserBoard.BoardID]: payload.UserBoard })
                    }
                    if (payload?.List?.ID) {
                        console.log("Merging list patch for List ID:", payload.List.ID)
                        useListsStore.getState().mergeListsPatch({ [payload.List.ID]: payload.List })
                    }
                    if (payload?.BoardList?.ID) {
                        get().mergeBoardListsPatch({ [payload.BoardList.ID]: payload.BoardList })
                    }
                    set((state) => {
                        const nextInvalidated = { ...state.invalidatedRootBoardListCardIds }
                        delete nextInvalidated[listCardID]

                        return {
                            rootBoardIdByListCardId: {
                                ...state.rootBoardIdByListCardId,
                                [listCardID]: board.ID
                            },
                            invalidatedRootBoardListCardIds: nextInvalidated,
                            rootListCardDataByListCardId: {
                                ...state.rootListCardDataByListCardId,
                                [listCardID]: rootData,
                            }
                        }
                    })

                },
            }
        )


        return response?.data ?? null

    },

    getRootBoardForListCardId: (listCardID: string): Board | null => {
        const rootBoardId = get().rootBoardIdByListCardId[listCardID]
        if (!rootBoardId) return null
        const board = useBoardsStore.getState().boardsById[rootBoardId]
        return board ?? null
    },

    invalidateRootBoardCacheForListCards: (listCardIDs: string[]) => {
        if (listCardIDs.length === 0) return
        set((state) => {
            const nextInvalidated = { ...state.invalidatedRootBoardListCardIds }
            for (const id of listCardIDs) {
                if (!id) continue
                nextInvalidated[id] = true
            }
            return { invalidatedRootBoardListCardIds: nextInvalidated }
        })
    },

    clearRootBoardCacheInvalidation: (listCardID: string) => {
        if (!listCardID) return
        set((state) => {
            const nextInvalidated = { ...state.invalidatedRootBoardListCardIds }
            delete nextInvalidated[listCardID]
            return { invalidatedRootBoardListCardIds: nextInvalidated }
        })
    },

    applyListCardDetachEvent: async (payload: BoardDetailPatch) => {
        const lcPayload = payload.ListCardRelations
        if (!lcPayload || lcPayload.length < 1) return

        const nextlistCardById = { ...get().listCardById }
        const nextListCardIdsByListId = { ...get().listCardIdsByListId }
        lcPayload.forEach((rel) => {
            delete nextlistCardById[rel.ID]
            const ids = nextListCardIdsByListId[rel.ListID] ?? []
            const idx = ids.findIndex((id) => id === rel.ID)
            if (idx !== -1) {
                ids.splice(idx, 1)
                nextListCardIdsByListId[rel.ListID] = ids
            }
        })
        set((state) => ({
            listCardById: nextlistCardById,
            listCardIdsByListId: nextListCardIdsByListId,
        }))
    },
    getBoardListForListCardId: (listCardID: string, boardID: string): BoardList | null => {
        const listCard = get().listCardById[listCardID]
        if (!listCard) return null
        const blIds = get().boardListIdsByBoardId[boardID] ?? []
        const bl = blIds.map((id) => get().boardListById[id]).find((bl) => bl.ListID === listCard.ListID)
        return bl ?? null
    }

}


));

