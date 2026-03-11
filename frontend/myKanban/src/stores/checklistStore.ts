import { create } from "zustand";
import type { AddEntryMemberRequest, BoardEvent, CardChecklist, Checklist, ChecklistEntry, ChecklistEntryRowResponse, CloneChecklistRequest, CloneChecklistResponse, ConvertChecklistEntryRequest, ConvertChecklistEntryResponse, CreateChecklistEntryRequest, CreateChecklistRequest, CrossMoveChecklistEntryRequest, Entry, EntryMember, MoveChecklistEntryRequest, MoveChecklistRequest, PatchChecklistEntryRequest } from "./types";
import type { BoardDetailPatch } from "./boardDetailStore";
import { api } from "@/api/api";
import { useAsyncRequestStore, useAsyncKey } from "@/stores/asyncRequestStore";
import type { EventPayloadEnvelope } from "./audittypes";
import type { ChecklistEventTypes } from "./eventTypes";

type ChecklistStore = {
    opCounter: number; //To force updates when needed
    eventIds: string[]; //To prevent processing duplicate events
    checklistIdsByCardId: Record<string, Record<string, string[]>>; //Checklist by cardID by boardID
    checklistInCardById: Record<string, ChecklistInCard>;
    EntriesIdsByChecklistId: Record<string, string[]>;
    EntryInChecklistById: Record<string, EntryInChecklist>;
    EntryMemberByUserId: Record<string, EntryMember>;
    EntryMembersIdsByEntryId: Record<string, string[]>;

    replaceChecklistData: (patch: BoardDetailPatch) => void;
    mergeChecklistPatch: (patch: BoardDetailPatch) => void;
    createChecklistInCard: (boardId: string, cardId: string, payload: CreateChecklistRequest) => Promise<void | null>
    cloneChecklistInCard: (boardId: string, cardId: string, payload: CloneChecklistRequest) => Promise<CloneChecklistResponse | null>
    deleteChecklist: (boardId: string, cardId: string, checklistId: string) => Promise<void | null>
    patchChecklist: (boardId: string, cardId: string, checklistId: string, payload: Partial<Checklist>) => Promise<void | null>
    moveChecklist: (boardId: string, cardId: string, checklistId: string, payload: MoveChecklistRequest) => Promise<void | null>
    createChecklistEntry: (boardId: string, cardId: string, checklistId: string, payload: CreateChecklistEntryRequest) => Promise<ChecklistEntryRowResponse | null>
    patchChecklistEntry: (boardId: string, cardId: string, checklistId: string, entryId: string, payload: PatchChecklistEntryRequest) => Promise<void | null>
    convertChecklistEntry: (boardId: string, cardId: string, checklistId: string, entryId: string, payload: ConvertChecklistEntryRequest) => Promise<ConvertChecklistEntryResponse | null>
    deleteChecklistEntry: (boardId: string, cardId: string, checklistId: string, entryId: string) => Promise<void | null>
    moveChecklistEntry: (boardId: string, cardId: string, checklistId: string, entryId: string, payload: MoveChecklistEntryRequest) => Promise<void | null>
    addMemberToEntry: (boardId: string, cardId: string, checklistId: string, entryId: string, userId: string) => Promise<void | null>
    removeMemberFromEntry: (boardId: string, cardId: string, checklistId: string, entryId: string, userId: string) => Promise<void | null>
    crossMoveChecklistEntry: (boardId: string, cardId: string, sourceChecklistId: string, entryId: string, payload: CrossMoveChecklistEntryRequest) => Promise<void | null>
    getChecklistsForBoard: (boardId: string) => ChecklistInCard[];
    getDoneEntriesForChecklist: (checklistId: string) => EntryInChecklist[];
    getDoneEntriesForCard: (boardId: string, cardId: string) => EntryInChecklist[];
    getDoneEntriesCountForCard: (boardId: string, cardId: string) => [number, number]; //Returns [done entries count, total entries count]
    applyChecklistEvent: (event: any) => void;
    applyUpsertChecklist: (evt: any) => void;
    applyMoveChecklist: (evt: BoardEvent) => void;
    applyDeleteChecklist: (evt: BoardEvent) => void;
    applyPatchChecklistEntry: (evt: any) => void;
    applyMoveChecklistEntry: (evt: BoardEvent) => void;
    applyDeleteChecklistEntry: (evt: BoardEvent) => void;
    applyConvertChecklistEntry: (evt: BoardEvent) => void;
    applyInsertChecklistEntry: (evt: BoardEvent) => void;
    applyAddMemberToEntry: (evt: BoardEvent) => void;
    applyRemoveMemberFromEntry: (evt: BoardEvent) => void;
    applyCrossMoveChecklistEntry: (evt: BoardEvent) => void;
    applyCopyChecklist: (evt: BoardEvent) => void;

}




type ChecklistInCard = {
    Checklist: Checklist
    Relation: CardChecklist
}

type EntryInChecklist = {
    Entry: Entry
    Relation: ChecklistEntry
}

export const useChecklistStore = create<ChecklistStore>((set, get) => ({
    opCounter: 0,
    eventIds: [],
    checklistIdsByCardId: {},
    checklistInCardById: {},
    EntriesIdsByChecklistId: {},
    EntryInChecklistById: {}, //By entry ID, contains the entry and its relation to the checklist (pos, etc)
    EntryMemberByUserId: {},
    EntryMembersIdsByEntryId: {},
    replaceChecklistData: (patch: BoardDetailPatch) => {
        const checklistsById = patch.Checklists || {}
        const checklistInCardById: Record<string, ChecklistInCard> = {}
        const cardChecklists = patch.CardChecklistRelations ?? []
        const checklistIdsByCardId: Record<string, string[]> = {}
        cardChecklists.forEach((cardChecklist) => {
            const checklist = checklistsById[cardChecklist.ChecklistID]
            const checklistInCard: ChecklistInCard = {
                Checklist: checklist,
                Relation: cardChecklist
            }
            checklistInCardById[checklist.ID] = checklistInCard
            if (!checklistIdsByCardId[cardChecklist.CardID]) {
                checklistIdsByCardId[cardChecklist.CardID] = []
            }
            checklistIdsByCardId[cardChecklist.CardID].push(checklist.ID)
        })

        const entriesById = patch.Entries || {}
        const entriesInChecklistById: Record<string, EntryInChecklist> = {}
        const checklistEntries = patch.ChecklistEntryRelations ?? []
        const entriesIdsByChecklistId: Record<string, string[]> = {}

        checklistEntries.forEach((ckentry) => {
            const entry = entriesById[ckentry.EntryID]
            const entryInChecklist: EntryInChecklist = {
                Entry: entry,
                Relation: ckentry
            }
            entriesInChecklistById[entry.ID] = entryInChecklist
            if (!entriesIdsByChecklistId[ckentry.ChecklistID]) {
                entriesIdsByChecklistId[ckentry.ChecklistID] = []
            }
            entriesIdsByChecklistId[ckentry.ChecklistID].push(entry.ID)
        })

        const entryMembers = patch.EntryMembers ?? []
        const entryMemberByUserId: Record<string, EntryMember> = {}
        const entryMembersIdsByEntryId: Record<string, string[]> = {}
        entryMembers.forEach((em) => {
            entryMemberByUserId[em.UserID] = em
            if (!entryMembersIdsByEntryId[em.EntryID]) {
                entryMembersIdsByEntryId[em.EntryID] = []
            }
            entryMembersIdsByEntryId[em.EntryID].push(em.UserID)
        })

        set((state) => ({
            checklistIdsByCardId: { ...state.checklistIdsByCardId, [patch.Board.ID]: checklistIdsByCardId },
            checklistInCardById: { ...state.checklistInCardById, ...checklistInCardById },
            EntriesIdsByChecklistId: { ...state.EntriesIdsByChecklistId, ...entriesIdsByChecklistId },
            EntryInChecklistById: { ...state.EntryInChecklistById, ...entriesInChecklistById },
            EntryMemberByUserId: { ...state.EntryMemberByUserId, ...entryMemberByUserId },
            EntryMembersIdsByEntryId: { ...state.EntryMembersIdsByEntryId, ...entryMembersIdsByEntryId }

        }))
    },
    mergeChecklistPatch: (patch: BoardDetailPatch) => {
        const checklistsById = patch.Checklists || {}
        const checklistInCardById: Record<string, ChecklistInCard> = {}
        const cardChecklists = patch.CardChecklistRelations ?? []
        const checklistIdsByCardId: Record<string, string[]> = {}
        // console.log("Merging checklist patch for board:", patch.Board.ID, "with checklists:", checklistsById, "and card-checklist relations:", cardChecklists)
        cardChecklists.forEach((cardChecklist) => {
            const checklist = checklistsById[cardChecklist.ChecklistID]
            const checklistInCard: ChecklistInCard = {
                Checklist: checklist,
                Relation: cardChecklist
            }
            checklistInCardById[checklist.ID] = checklistInCard
            if (!checklistIdsByCardId[cardChecklist.CardID]) {
                checklistIdsByCardId[cardChecklist.CardID] = []
            }
            checklistIdsByCardId[cardChecklist.CardID].push(checklist.ID)
        })

        const entriesById = patch.Entries || {}
        const entriesInChecklistById: Record<string, EntryInChecklist> = {}
        const checklistEntries = patch.ChecklistEntryRelations ?? []
        const entriesIdsByChecklistId: Record<string, string[]> = {}

        checklistEntries.forEach((ckentry) => {
            const entry = entriesById[ckentry.EntryID]
            const entryInChecklist: EntryInChecklist = {
                Entry: entry,
                Relation: ckentry
            }
            entriesInChecklistById[entry.ID] = entryInChecklist
            if (!entriesIdsByChecklistId[ckentry.ChecklistID]) {
                entriesIdsByChecklistId[ckentry.ChecklistID] = []
            }
            entriesIdsByChecklistId[ckentry.ChecklistID].push(entry.ID)
        })

        const entryMembers = patch.EntryMembers ?? []
        const entryMemberByUserId: Record<string, EntryMember> = {}
        const entryMembersIdsByEntryId: Record<string, string[]> = {}
        entryMembers.forEach((em) => {
            entryMemberByUserId[em.UserID] = em
            if (!entryMembersIdsByEntryId[em.EntryID]) {
                entryMembersIdsByEntryId[em.EntryID] = []
            }
            entryMembersIdsByEntryId[em.EntryID].push(em.UserID)
        })

        const newBoardChecklistIdsByCardId = { ...get().checklistIdsByCardId[patch.Board.ID], ...checklistIdsByCardId }
        set((state) => ({
            checklistIdsByCardId: { ...state.checklistIdsByCardId, [patch.Board.ID]: newBoardChecklistIdsByCardId },
            checklistInCardById: { ...state.checklistInCardById, ...checklistInCardById },
            EntriesIdsByChecklistId: { ...state.EntriesIdsByChecklistId, ...entriesIdsByChecklistId },
            EntryInChecklistById: { ...state.EntryInChecklistById, ...entriesInChecklistById },
            EntryMemberByUserId: { ...state.EntryMemberByUserId, ...entryMemberByUserId },
            EntryMembersIdsByEntryId: { ...state.EntryMembersIdsByEntryId, ...entryMembersIdsByEntryId }

        }))
    },


    getChecklistsForBoard: (boardId: string) => {
        const checklistIdsByCardId = get().checklistIdsByCardId[boardId] || {}
        const checklistInCardById = get().checklistInCardById
        const checklists: ChecklistInCard[] = []
        Object.values(checklistIdsByCardId).forEach((checklistIds) => {
            checklistIds.forEach((checklistId) => {
                const checklist = checklistInCardById[checklistId]
                if (checklist) {
                    checklists.push(checklist)
                }
            })
        })
        return checklists
    },
    getDoneEntriesForChecklist: (checklistId: string) => {
        const entryIds = get().EntriesIdsByChecklistId[checklistId] || []
        const entryInChecklistById = get().EntryInChecklistById
        const doneEntries = entryIds.map((entryId) => entryInChecklistById[entryId]).filter((entryInChecklist) => entryInChecklist.Entry.Done)
        return doneEntries
    },
    getDoneEntriesForCard: (boardId: string, cardId: string) => {
        const checklistIdsByCardId = get().checklistIdsByCardId[boardId]?.[cardId] || []
        const entryInChecklistById = get().EntryInChecklistById
        const doneEntries: EntryInChecklist[] = []
        checklistIdsByCardId.forEach((checklistId) => {
            const entryIds = get().EntriesIdsByChecklistId[checklistId] || []
            entryIds.forEach((entryId) => {
                const entryInChecklist = entryInChecklistById[entryId]
                if (entryInChecklist && entryInChecklist.Entry.Done) {
                    doneEntries.push(entryInChecklist)
                }
            })
        })
        return doneEntries
    },
    getDoneEntriesCountForCard: (boardId: string, cardId: string) => {
        const checklistIdsByCardId = get().checklistIdsByCardId[boardId]?.[cardId] || []
        const entryInChecklistById = get().EntryInChecklistById
        const doneEntries: EntryInChecklist[] = []
        let totalEntries = 0
        checklistIdsByCardId.forEach((checklistId) => {
            const entryIds = get().EntriesIdsByChecklistId[checklistId] || []
            totalEntries += entryIds.length
            entryIds.forEach((entryId) => {
                const entryInChecklist = entryInChecklistById[entryId]
                if (entryInChecklist && entryInChecklist.Entry.Done) {
                    doneEntries.push(entryInChecklist)
                }
            })
        })
        return [doneEntries.length, totalEntries]
    },

    createChecklistInCard: async (boardId: string, cardId: string, payload: CreateChecklistRequest) => {
        return useAsyncRequestStore.getState().execute(
            useAsyncKey("checklist:create", cardId),
            () => api.post(`boards/${boardId}/cards/${cardId}/checklists`, payload),
            { successResetDelayMs: 1500 }
        )
    },
    cloneChecklistInCard: async (boardId: string, cardId: string, payload: CloneChecklistRequest) => {
        return useAsyncRequestStore.getState().execute<CloneChecklistResponse>(
            useAsyncKey("checklist:clone", cardId),
            async () => {
                const response = await api.post<CloneChecklistResponse>(`boards/${boardId}/cards/${cardId}/checklists/clone`, payload)
                return response.data
            },
            { successResetDelayMs: 1500 }
        )
    },
    deleteChecklist: async (boardId: string, cardId: string, checklistId: string) => {
        return useAsyncRequestStore.getState().execute(
            useAsyncKey("checklist:delete", checklistId),
            () => api.delete(`boards/${boardId}/cards/${cardId}/checklists/${checklistId}`),
            { successResetDelayMs: 1500 }
        )
    },
    patchChecklist: async (boardId: string, cardId: string, checklistId: string, payload: PatchChecklistEntryRequest) => {
        return useAsyncRequestStore.getState().execute(
            useAsyncKey("checklist:edit", checklistId),
            () => api.patch(`boards/${boardId}/cards/${cardId}/checklists/${checklistId}`, payload),
            { successResetDelayMs: 1500 }
        )
    },
    moveChecklist: async (boardId: string, cardId: string, checklistId: string, payload: MoveChecklistRequest) => {
        return useAsyncRequestStore.getState().execute(
            useAsyncKey("checklist:move", checklistId),
            () => api.patch(`boards/${boardId}/cards/${cardId}/checklists/${checklistId}/move`, payload),
            { successResetDelayMs: 1500 }
        )
    },

    createChecklistEntry: async (boardId: string, cardId: string, checklistId: string, payload: CreateChecklistEntryRequest) => {
        return useAsyncRequestStore.getState().execute<ChecklistEntryRowResponse>(
            useAsyncKey("checklist:entry:create", checklistId),
            async () => {
                const response = await api.post<ChecklistEntryRowResponse>(`boards/${boardId}/cards/${cardId}/checklists/${checklistId}/entries`, payload)
                return response.data
            },
            { successResetDelayMs: 1500 }
        )
    },
    patchChecklistEntry: async (boardId: string, cardId: string, checklistId: string, entryId: string, payload: PatchChecklistEntryRequest) => {
        return useAsyncRequestStore.getState().execute(
            useAsyncKey("checklist:entry:edit", entryId),
            () => api.patch(`boards/${boardId}/cards/${cardId}/checklists/${checklistId}/entries/${entryId}`, payload),
            { successResetDelayMs: 1500 }
        )
    },
    convertChecklistEntry: async (boardId: string, cardId: string, checklistId: string, entryId: string, payload: ConvertChecklistEntryRequest) => {
        return useAsyncRequestStore.getState().execute<ConvertChecklistEntryResponse>(
            useAsyncKey("checklist:entry:convert", entryId),
            async () => {
                const response = await api.post<ConvertChecklistEntryResponse>(`boards/${boardId}/cards/${cardId}/checklists/${checklistId}/entries/${entryId}/convert`, payload)
                return response.data
            },
            { successResetDelayMs: 1500 }
        )
    },
    deleteChecklistEntry: async (boardId: string, cardId: string, checklistId: string, entryId: string) => {
        return useAsyncRequestStore.getState().execute(
            useAsyncKey("checklist:entry:delete", entryId),
            () => api.delete(`boards/${boardId}/cards/${cardId}/checklists/${checklistId}/entries/${entryId}`),
            { successResetDelayMs: 1500 }
        )
    },
    moveChecklistEntry: async (boardId: string, cardId: string, checklistId: string, entryId: string, payload: MoveChecklistEntryRequest) => {
        return useAsyncRequestStore.getState().execute(
            useAsyncKey("checklist:entry:move", entryId),
            () => api.patch(`boards/${boardId}/cards/${cardId}/checklists/${checklistId}/entries/${entryId}/move`, payload),
            { successResetDelayMs: 1500 }
        )
    },
    addMemberToEntry: async (boardId: string, cardId: string, checklistId: string, entryId: string, userId: string) => {
        const payload: AddEntryMemberRequest = { MemberID: userId }
        return useAsyncRequestStore.getState().execute(
            useAsyncKey("checklist:entry:member:add", entryId),
            () => api.post(`boards/${boardId}/cards/${cardId}/checklists/${checklistId}/entries/${entryId}/members`, payload),
            { successResetDelayMs: 1500 }
        )
    },
    removeMemberFromEntry: async (boardId: string, cardId: string, checklistId: string, entryId: string, userId: string) => {
        return useAsyncRequestStore.getState().execute(
            useAsyncKey("checklist:entry:member:remove", entryId),
            () => api.delete(`boards/${boardId}/cards/${cardId}/checklists/${checklistId}/entries/${entryId}/members/${userId}`),
            { successResetDelayMs: 1500 }
        )
    },
    crossMoveChecklistEntry: async (boardId: string, cardId: string, sourceChecklistId: string, entryId: string, payload: CrossMoveChecklistEntryRequest) => {
        return useAsyncRequestStore.getState().execute(
            useAsyncKey("checklist:entry:crossmove", entryId),
            () => api.patch(`boards/${boardId}/cards/${cardId}/checklists/${sourceChecklistId}/entries/${entryId}/crossmove`, payload),
            { successResetDelayMs: 1500 }
        )
    },


    applyChecklistEvent: (evt: any) => {
        const eventIds = get().eventIds
        if (eventIds.includes(evt.ID)) {
            // console.log("Duplicate event received, ignoring:", evt.ID)
            return
        }

        set((state) => ({ eventIds: [...state.eventIds, evt.ID] }))
        switch (evt.Type as ChecklistEventTypes) {
            case "checklist.created":
                get().applyUpsertChecklist(evt)
                break;
            case "checklist.copied":
                get().applyCopyChecklist(evt)
                break;
            case "checklist.patched":
                get().applyUpsertChecklist(evt)
                break;
            case "checklist.deleted":
                get().applyDeleteChecklist(evt)
                break;
            case "checklist.moved":
                get().applyMoveChecklist(evt)
                break;
            case "checklist.entry.created":
                get().applyInsertChecklistEntry(evt)
                break;
            case "checklist.entry.patched":
                // console.log("Received checklist entry patched event")

                get().applyPatchChecklistEntry(evt)
                break;
            case "checklist.entry.deleted":
                get().applyDeleteChecklistEntry(evt)
                break;
            case "checklist.entry.moved":
                get().applyMoveChecklistEntry(evt)
                break;
            case "checklist.entry.converted":
                get().applyConvertChecklistEntry(evt)
                break;
            case "checklist.entry.member.added":
                // console.log("Received checklist entry member added event")
                get().applyAddMemberToEntry(evt)
                break;
            case "checklist.entry.member.removed":
                // console.log("Received checklist entry member removed event")
                get().applyRemoveMemberFromEntry(evt)
                break;
            case "checklist.entry.crossmoved":
                // console.log("Received checklist entry cross moved event")
                get().applyCrossMoveChecklistEntry(evt)
                break;

        }
    },
    applyUpsertChecklist: (evt: any) => {
        // console.log("applying upsert checklist evt")
        const Payload = (evt.Payload as EventPayloadEnvelope).StatePayload as BoardDetailPatch;
        const checklist = Object.values(Payload.Checklists)[0]
        const cardChecklist = Payload.CardChecklistRelations[0] ?? null

        const checklistInCard: ChecklistInCard = {
            Checklist: checklist,
            Relation: cardChecklist ?? get().checklistInCardById[checklist.ID].Relation
        }
        set((state) => ({
            checklistInCardById: { ...state.checklistInCardById, [checklist.ID]: checklistInCard },
            checklistIdsByCardId: {
                ...state.checklistIdsByCardId, [evt.BoardID]: {
                    ...state.checklistIdsByCardId[evt.BoardID],
                    [cardChecklist.CardID]: [...(state.checklistIdsByCardId[evt.BoardID]?.[cardChecklist.CardID] || []), checklist.ID]
                }
            }
        }))

    },
    applyDeleteChecklist: (evt: BoardEvent) => {
        // console.log("applying delete checklist evt")
        const Payload = (evt.Payload as EventPayloadEnvelope).StatePayload as BoardDetailPatch;
        const checklist = Object.values(Payload.Checklists)[0]
        const cardChecklist = Payload.CardChecklistRelations[0]
        const nextChecklistIds = get().checklistIdsByCardId[evt.BoardID]?.[cardChecklist.CardID].filter((id) => id !== checklist.ID) || []
        const nextChecklistInCardById = { ...get().checklistInCardById }
        delete nextChecklistInCardById[checklist.ID]
        set((state) => ({
            checklistIdsByCardId: {
                ...state.checklistIdsByCardId, [evt.BoardID]: {
                    ...state.checklistIdsByCardId[evt.BoardID],
                    [cardChecklist.CardID]: nextChecklistIds
                }
            },
            checklistInCardById: nextChecklistInCardById
        }))
    },
    applyMoveChecklist: (evt: BoardEvent) => {
        // console.log("applying move checklist evt")
        const Payload = (evt.Payload as EventPayloadEnvelope).StatePayload as BoardDetailPatch;

        const cardChecklists = Payload.CardChecklistRelations
        set((state) => {
            const nextIds = cardChecklists.map((cc) => cc.ChecklistID)
            let nextIdsByCardId = { ...state.checklistIdsByCardId[evt.BoardID] }
            nextIdsByCardId[cardChecklists[0].CardID] = nextIds
            let nextChecklistInCardById = { ...state.checklistInCardById }
            cardChecklists.forEach((cc) => {
                nextChecklistInCardById[cc.ChecklistID].Relation = cc
            })
            return {
                checklistIdsByCardId: {
                    ...state.checklistIdsByCardId,
                    [evt.BoardID]: nextIdsByCardId,
                },
                checklistInCardById: nextChecklistInCardById
            }

        })
    },
    applyPatchChecklistEntry: (evt: BoardEvent) => {
        // console.log("current entries in checklist:", get().EntryInChecklistById)
        const Payload = (evt.Payload as EventPayloadEnvelope).StatePayload as BoardDetailPatch;

        const entry = Object.values(Payload.Entries)[0]
        // console.log("OPPPO: applying patch checklist entry evt for entry", entry.ID)
        // const ce = typeof (Payload.ChecklistEntryRelations) === "object" ? Payload.ChecklistEntryRelations[0] : get().EntryInChecklistById[entry.ID].Relation
        // console.log("[CE:]", ce)
        const ce = null
        const entryInChecklist: EntryInChecklist = {
            Entry: entry,
            Relation: ce ?? get().EntryInChecklistById[entry.ID].Relation
        }

        const checklistEntries = get().EntriesIdsByChecklistId[entryInChecklist.Relation.ChecklistID] || []
        if (!checklistEntries.includes(entry.ID)) {
            checklistEntries.push(entry.ID)
        } else {
            const idx = checklistEntries.findIndex((id) => id === entry.ID)
            checklistEntries[idx] = entry.ID
        }

        set((state) => ({
            EntryInChecklistById: { ...state.EntryInChecklistById, [entry.ID]: entryInChecklist },
            EntriesIdsByChecklistId: {
                ...state.EntriesIdsByChecklistId,
                [entryInChecklist.Relation.ChecklistID]: checklistEntries
            }
        }))
        //console.log("upserted OO entry", entry.ID, "in checklist", ce?.ChecklistID)

    },
    applyInsertChecklistEntry: (evt: BoardEvent) => {
        // console.log("current entries in checklist:", get().EntryInChecklistById)
        const Payload = (evt.Payload as EventPayloadEnvelope).StatePayload as BoardDetailPatch;

        const entry = Object.values(Payload.Entries)[0]
        // console.log("OPPPO: applying patch checklist entry evt for entry", entry.ID)
        const ce = typeof (Payload.ChecklistEntryRelations) === "object" ? Payload.ChecklistEntryRelations[0] : get().EntryInChecklistById[entry.ID].Relation
        // console.log("[CE:]", ce)
        //const ce = null
        const entryInChecklist: EntryInChecklist = {
            Entry: entry,
            Relation: ce ?? get().EntryInChecklistById[entry.ID].Relation
        }

        const checklistEntries = get().EntriesIdsByChecklistId[entryInChecklist.Relation.ChecklistID] || []
        if (!checklistEntries.includes(entry.ID)) {
            checklistEntries.push(entry.ID)
        } else {
            const idx = checklistEntries.findIndex((id) => id === entry.ID)
            checklistEntries[idx] = entry.ID
        }

        set((state) => ({
            EntryInChecklistById: { ...state.EntryInChecklistById, [entry.ID]: entryInChecklist },
            EntriesIdsByChecklistId: {
                ...state.EntriesIdsByChecklistId,
                [entryInChecklist.Relation.ChecklistID]: checklistEntries
            }
        }))
        //console.log("upserted OO entry", entry.ID, "in checklist", ce?.ChecklistID)
    },

    applyDeleteChecklistEntry: (evt: BoardEvent) => {
        // console.log("applying delete checklist entry evt")
        const Payload = (evt.Payload as EventPayloadEnvelope).StatePayload as BoardDetailPatch;
        const entry = Object.values(Payload.Entries)[0]
        const ce = Payload.ChecklistEntryRelations[0]
        const nextEntryIds = get().EntriesIdsByChecklistId[ce.ChecklistID].filter((id) => id !== entry.ID) || []
        const nextEntryInChecklistById = { ...get().EntryInChecklistById }
        delete nextEntryInChecklistById[entry.ID]
        set((state) => ({
            EntriesIdsByChecklistId: {
                ...state.EntriesIdsByChecklistId, [ce.ChecklistID]: nextEntryIds
            },
            EntryInChecklistById: nextEntryInChecklistById
        }))
    },
    applyConvertChecklistEntry: (evt: BoardEvent) => {
        const payload = ((evt.Payload as any)?.RealtimePayload ?? undefined) as {
            ChecklistID?: string
            EntryIDs?: string[]
            DeletedEntryID?: string
        } | undefined

        const deletedEntryID = payload?.DeletedEntryID
        const checklistID = payload?.ChecklistID
        const reorderedEntryIDs = payload?.EntryIDs

        if (!deletedEntryID || !checklistID || !reorderedEntryIDs) {
            get().applyDeleteChecklistEntry(evt)
            return
        }

        const nextEntryInChecklistById = { ...get().EntryInChecklistById }
        delete nextEntryInChecklistById[deletedEntryID]

        const nextEntryMembersIdsByEntryId = { ...get().EntryMembersIdsByEntryId }
        const memberIDsForDeletedEntry = nextEntryMembersIdsByEntryId[deletedEntryID] || []
        delete nextEntryMembersIdsByEntryId[deletedEntryID]

        const nextEntryMemberByUserId = { ...get().EntryMemberByUserId }
        memberIDsForDeletedEntry.forEach((memberID) => {
            delete nextEntryMemberByUserId[memberID]
        })

        set((state) => ({
            EntriesIdsByChecklistId: {
                ...state.EntriesIdsByChecklistId,
                [checklistID]: reorderedEntryIDs,
            },
            EntryInChecklistById: nextEntryInChecklistById,
            EntryMembersIdsByEntryId: nextEntryMembersIdsByEntryId,
            EntryMemberByUserId: nextEntryMemberByUserId,
        }))
    },
    applyMoveChecklistEntry: (evt: BoardEvent) => {
        // console.log("applying move checklist entry evt")
        const Payload = (evt.Payload as EventPayloadEnvelope).StatePayload as BoardDetailPatch;
        const cEntries = Payload.ChecklistEntryRelations
        set((state) => {
            const nextIds = cEntries.map((ce) => ce.EntryID)
            const nextEntriesIdsByChecklistId = { ...state.EntriesIdsByChecklistId, [cEntries[0].ChecklistID]: nextIds }
            const nextEntryInChecklistById = { ...state.EntryInChecklistById }
            cEntries.forEach((ce) => {
                nextEntryInChecklistById[ce.EntryID].Relation = ce
            })
            return {
                EntriesIdsByChecklistId: nextEntriesIdsByChecklistId,
                EntryInChecklistById: nextEntryInChecklistById
            }
        })
    },
    applyAddMemberToEntry: (evt: BoardEvent) => {
        const Payload = (evt.Payload as EventPayloadEnvelope).StatePayload as BoardDetailPatch;
        const entryMember = Payload.EntryMembers[0]
        // console.log("applying add member to entry evt for entry", entryMember.EntryID, "and user", entryMember.UserID)
        const entryId = entryMember.EntryID
        const userId = entryMember.UserID
        const nextEntryMembersIds = [...(get().EntryMembersIdsByEntryId[entryId] || []), userId]
        set((state) => ({
            opCounter: state.opCounter + 1, // Force update
            EntryMemberByUserId: { ...state.EntryMemberByUserId, [userId]: entryMember },
            EntryMembersIdsByEntryId: { ...state.EntryMembersIdsByEntryId, [entryId]: nextEntryMembersIds }
        }))
        // console.log("OPCOUNTER", get().opCounter, "Added member", userId, "to entry", entryId, "Current members for entry:", get().EntryMembersIdsByEntryId[entryId])
    },
    applyRemoveMemberFromEntry: (evt: BoardEvent) => {
        const Payload = (evt.Payload as EventPayloadEnvelope).StatePayload as BoardDetailPatch;
        const entryMember = Payload.EntryMembers[0]
        const entryId = entryMember.EntryID
        const userId = entryMember.UserID
        const nextEntryMembersIds = get().EntryMembersIdsByEntryId[entryId]?.filter((id) => id !== userId) || []
        const nextEntryMemberByUserId = { ...get().EntryMemberByUserId }
        delete nextEntryMemberByUserId[userId]
        set((state) => ({
            EntryMemberByUserId: nextEntryMemberByUserId,
            EntryMembersIdsByEntryId: { ...state.EntryMembersIdsByEntryId, [entryId]: nextEntryMembersIds }
        }))
    },
    applyCrossMoveChecklistEntry: (evt: BoardEvent) => {
        // console.log("applying cross move checklist entry evt")
        const Payload = (evt.Payload as EventPayloadEnvelope).StatePayload as BoardDetailPatch;

        const ce = Payload.ChecklistEntryRelations[0]
        // console.log("Payload for cross move checklist entry:", Payload, "CE:", ce)
        const nextEntryInChecklistById = { ...get().EntryInChecklistById }
        nextEntryInChecklistById[ce.EntryID].Relation = ce
        // console.log("Updated entry in checklist with new checklist ID", ce.ChecklistID, "for entry", ce.EntryID)

        let toBeUpdated = false
        const nextChecklistEntriesByChecklistId: Record<string, string[]> = { ...get().EntriesIdsByChecklistId }

        const payloadChelistEntries = Payload.MovedChecklistEntriesByChecklistID
        // console.log("Payload checklist entries by checklist ID:", payloadChelistEntries)
        payloadChelistEntries && Object.keys(payloadChelistEntries).forEach((checklistId) => {
            const entryIds = payloadChelistEntries[checklistId].map((entry) => entry.EntryID)
            const currentEntryIds = get().EntriesIdsByChecklistId[checklistId] || []
            // console.log("Comparing entry IDs for checklist", checklistId, "Current:", currentEntryIds, "New:", entryIds)
            if (JSON.stringify(entryIds) !== JSON.stringify(currentEntryIds)) {
                toBeUpdated = true
                if (!nextChecklistEntriesByChecklistId[checklistId]) {
                    nextChecklistEntriesByChecklistId[checklistId] = []
                }
                nextChecklistEntriesByChecklistId[checklistId] = entryIds
            }
        })
        if (!toBeUpdated) {
            set((state) => ({
                EntryInChecklistById: nextEntryInChecklistById
            }))
            return
        } else {
            set((state) => ({
                EntriesIdsByChecklistId: {
                    ...state.EntriesIdsByChecklistId,
                    ...nextChecklistEntriesByChecklistId
                },
                EntryInChecklistById: nextEntryInChecklistById
            }))
        }

    },
    applyCopyChecklist: (evt: BoardEvent) => {
        const payload = ((evt.Payload as any)?.RealtimePayload ?? undefined) as {
            CardID?: string
            CardChecklist?: CardChecklist
            Checklist?: Checklist
            Entries?: Entry[]
            ChecklistEntries?: ChecklistEntry[]
        } | undefined

        const cardID = payload?.CardID
        const cardChecklist = payload?.CardChecklist
        const checklist = payload?.Checklist

        if (!cardID || !cardChecklist || !checklist) {
            get().applyUpsertChecklist(evt)
            return
        }

        const entries = payload?.Entries ?? []
        const checklistEntries = payload?.ChecklistEntries ?? []

        set((state) => {
            const existingChecklistIDs = state.checklistIdsByCardId[evt.BoardID]?.[cardID] ?? []
            const nextChecklistIDs = existingChecklistIDs.includes(checklist.ID)
                ? existingChecklistIDs
                : [...existingChecklistIDs, checklist.ID]

            const nextChecklistInCardById = {
                ...state.checklistInCardById,
                [checklist.ID]: {
                    Checklist: checklist,
                    Relation: cardChecklist,
                },
            }

            const nextEntryInChecklistById = { ...state.EntryInChecklistById }
            const nextEntriesIdsByChecklistId = { ...state.EntriesIdsByChecklistId }

            checklistEntries.forEach((relation) => {
                const entry = entries.find((e) => e.ID === relation.EntryID)
                if (!entry) {
                    return
                }
                nextEntryInChecklistById[entry.ID] = {
                    Entry: entry,
                    Relation: relation,
                }

                const currentIds = nextEntriesIdsByChecklistId[relation.ChecklistID] ?? []
                if (!currentIds.includes(entry.ID)) {
                    nextEntriesIdsByChecklistId[relation.ChecklistID] = [...currentIds, entry.ID]
                }
            })

            return {
                checklistIdsByCardId: {
                    ...state.checklistIdsByCardId,
                    [evt.BoardID]: {
                        ...state.checklistIdsByCardId[evt.BoardID],
                        [cardID]: nextChecklistIDs,
                    },
                },
                checklistInCardById: nextChecklistInCardById,
                EntryInChecklistById: nextEntryInChecklistById,
                EntriesIdsByChecklistId: nextEntriesIdsByChecklistId,
            }
        })
    }

}))
