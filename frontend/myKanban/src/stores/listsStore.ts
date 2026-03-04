
import { create } from "zustand"
import { api } from "@/api/api"
import { useBoardDetailStore } from "@/stores/boardDetailStore"

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
    removeLists: (listIds: string[]) => void
    createList: (payload: CreateListRequest, boardID: string) => Promise<void>
    copyBulkListsRaw: (boardID: string, payload: BulkCopyListsRequest) => Promise<BulkCopyListsResponse>
    moveBoardList: (sourceBoardID: string, listID: string, payload: MoveBoardListRequest) => Promise<MoveBoardListResponse>
    mirrorBoardList: (sourceBoardID: string, listID: string, payload: MirrorBoardListRequest) => Promise<MirrorBoardListResponse>
    detatchList: (listID: string, boardID: string) => Promise<void>
    patchListDetails: (listID: string, boardID: string, payload: { Title?: string }) => Promise<void>
    patchListProps: (listID: string, boardID: string, payload: { Props: Record<string, unknown> }) => Promise<void>
    patchListAccessMode: (listID: string, boardID: string, payload: PatchListAccessModeRequest) => Promise<void>
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
    removeLists: (listIds) => {
        if (listIds.length === 0) return
        const next = { ...get().listsById }
        listIds.forEach((id) => delete next[id])
        set({ listsById: next })

    },
    createList: async (payload: CreateListRequest, boardID: string) => {

        try {
            const response = await api.post(`/boards/${boardID}/lists`, payload)
        } catch (error) {
            // console.error("Failed to create list:", error)
            throw error
        }
    },
    copyBulkListsRaw: async (boardID: string, payload: BulkCopyListsRequest) => {
        try {
            const response = await api.post(`/boards/${boardID}/lists/copybulk`, payload)
            return response.data as BulkCopyListsResponse
        } catch (error) {
            throw error
        }
    },
    moveBoardList: async (sourceBoardID: string, listID: string, payload: MoveBoardListRequest) => {
        try {
            const response = await api.patch(`/boards/${sourceBoardID}/lists/${listID}/moveto`, payload)
            return response.data as MoveBoardListResponse
        } catch (error) {
            throw error
        }
    },
    mirrorBoardList: async (sourceBoardID: string, listID: string, payload: MirrorBoardListRequest) => {
        try {
            const response = await api.post(`/boards/${sourceBoardID}/lists/${listID}/mirror`, payload)
            return response.data as MirrorBoardListResponse
        } catch (error) {
            throw error
        }
    },
    detatchList: async (listID: string, boardID: string) => {
        try {
            const response = await api.delete(`/boards/${boardID}/lists/${listID}`)
        } catch (error) {
            // console.error("Failed to detatch list:", error)
            throw error
        }
    },
    patchListDetails: async (listID: string, boardID: string, payload: { Title?: string }) => {
        try {
            const response = await api.patch(`/boards/${boardID}/lists/${listID}`, payload)
        } catch (error) {
            // console.error("Failed to patch list details:", error)
            throw error
        }
    },
    patchListProps: async (listID: string, boardID: string, payload: { Props: Record<string, unknown> }) => {
        try {
            const response = await api.patch(`/boards/${boardID}/lists/${listID}/props`, payload)
        } catch (error) {
            throw error
        }
    },
    patchListAccessMode: async (listID: string, boardID: string, payload: PatchListAccessModeRequest) => {
        try {
            await api.patch(`/boards/${boardID}/lists/${listID}/access`, payload)
        } catch (error) {
            throw error
        }
    },

}))
