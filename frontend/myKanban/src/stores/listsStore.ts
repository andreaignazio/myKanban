import { create } from "zustand"
import { api } from "@/api/api"
import { useAsyncRequestStore, useAsyncKey } from "@/stores/asyncRequestStore"

import type { BulkCopyListsRequest, BulkCopyListsResponse, List, MirrorBoardListRequest, MirrorBoardListResponse, MoveBoardListRequest, MoveBoardListResponse, PatchListAccessModeRequest } from "./types"

type listsById = Record<string, List>

type CreateListRequest = {
    Title: string
    AfterID: string | null
    InsertAt: "start" | "end"
}

type ListsStore = {
    listsById: listsById
    getListById: (listID: string) => List | undefined
    // fetchLists: () => Promise<void>
    mergeListsPatch: (payload: Record<string, List>) => void
    mergeLists: (lists: List[]) => void
    removeLists: (listIds: string[]) => void
    createList: (payload: CreateListRequest, boardID: string) => Promise<void | null>
    copyBulkListsRaw: (boardID: string, payload: BulkCopyListsRequest) => Promise<BulkCopyListsResponse | null>
    moveBoardList: (sourceBoardID: string, listID: string, payload: MoveBoardListRequest) => Promise<MoveBoardListResponse | null>
    mirrorBoardList: (sourceBoardID: string, listID: string, payload: MirrorBoardListRequest) => Promise<MirrorBoardListResponse | null>
    detatchList: (listID: string, boardID: string) => Promise<void | null>
    patchListDetails: (listID: string, boardID: string, payload: { Title?: string }) => Promise<void | null>
    patchListProps: (listID: string, boardID: string, payload: { Props: Record<string, unknown> }) => Promise<void | null>
    patchListAccessMode: (listID: string, boardID: string, payload: PatchListAccessModeRequest) => Promise<void | null>
}

export const useListsStore = create<ListsStore>((set, get) => ({
    listsById: {},

    getListById: (listID: string) => {
        return get().listsById[listID]
    },

    mergeListsPatch: (payload) => {
        // console.log("merging lists patch", payload)
        set((state) => ({
            listsById: {
                ...state.listsById,
                ...payload,
            }
        }))
    },
    mergeLists: (lists) => {
        if (lists.length === 0) return

        set((state) => {
            const nextListsById = { ...state.listsById }
            lists.forEach((list) => {
                nextListsById[list.ID] = list
            })

            return {
                listsById: nextListsById,
            }
        })
    },
    removeLists: (listIds) => {
        if (listIds.length === 0) return
        const next = { ...get().listsById }
        listIds.forEach((id) => delete next[id])
        set({ listsById: next })

    },
    createList: async (payload: CreateListRequest, boardID: string) => {
        await useAsyncRequestStore.getState().execute(
            "list:create",
            () => api.post(`/boards/${boardID}/lists`, payload),
            { successResetDelayMs: 2000 }
        )
    },
    copyBulkListsRaw: async (boardID: string, payload: BulkCopyListsRequest) => {
        const res = await useAsyncRequestStore.getState().execute(
            "list:copy:bulk",
            async () => {
                const response = await api.post(`/boards/${boardID}/lists/copybulk`, payload)
                return response.data as BulkCopyListsResponse
            },
            { successResetDelayMs: 2000 }
        )
        return res as BulkCopyListsResponse
    },
    moveBoardList: async (sourceBoardID: string, listID: string, payload: MoveBoardListRequest) => {
        const res = await useAsyncRequestStore.getState().execute(
            useAsyncKey("list:move", listID),
            async () => {
                const response = await api.patch(`/boards/${sourceBoardID}/lists/${listID}/moveto`, payload)
                return response.data as MoveBoardListResponse
            },
            { successResetDelayMs: 2000 }
        )
        return res as MoveBoardListResponse
    },
    mirrorBoardList: async (sourceBoardID: string, listID: string, payload: MirrorBoardListRequest) => {
        const res = await useAsyncRequestStore.getState().execute(
            useAsyncKey("list:mirror", listID),
            async () => {
                const response = await api.post(`/boards/${sourceBoardID}/lists/${listID}/mirror`, payload)
                return response.data as MirrorBoardListResponse
            },
            { successResetDelayMs: 2000 }
        )
        return res as MirrorBoardListResponse
    },
    detatchList: async (listID: string, boardID: string) => {
        await useAsyncRequestStore.getState().execute(
            useAsyncKey("list:detach", listID),
            () => api.delete(`/boards/${boardID}/lists/${listID}`),
            { successResetDelayMs: 2000 }
        )
    },
    patchListDetails: async (listID: string, boardID: string, payload: { Title?: string }) => {
        await useAsyncRequestStore.getState().execute(
            useAsyncKey("list:edit:title", listID),
            () => api.patch(`/boards/${boardID}/lists/${listID}`, payload),
            { successResetDelayMs: 1500 }
        )
    },
    patchListProps: async (listID: string, boardID: string, payload: { Props: Record<string, unknown> }) => {
        await useAsyncRequestStore.getState().execute(
            useAsyncKey("list:edit:props", listID),
            () => api.patch(`/boards/${boardID}/lists/${listID}/props`, payload),
            { successResetDelayMs: 1500 }
        )
    },
    patchListAccessMode: async (listID: string, boardID: string, payload: PatchListAccessModeRequest) => {
        await useAsyncRequestStore.getState().execute(
            useAsyncKey("list:edit:access", listID),
            () => api.patch(`/boards/${boardID}/lists/${listID}/access`, payload),
            { successResetDelayMs: 1500 }
        )
    },

}))
