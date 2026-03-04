import { create } from "zustand";
import type { ApiAuditLogResponse } from "./audittypes";

type EntityWithID = Record<string, unknown> & { ID: string };

type AuditEntityStore = {
    workspacesById: Record<string, EntityWithID>;
    boardsById: Record<string, EntityWithID>;
    listsById: Record<string, EntityWithID>;
    cardsById: Record<string, EntityWithID>;
    usersById: Record<string, EntityWithID>;

    checklistsById: Record<string, EntityWithID>;
    entriesById: Record<string, EntityWithID>;

    mergeAuditEntities: (entities: ApiAuditLogResponse["Entities"] | undefined) => void;
    resetAuditEntities: () => void;
};

function toMap(items?: EntityWithID[]): Record<string, EntityWithID> {
    if (!items || items.length === 0) return {};
    return items.reduce((acc, item) => {
        acc[item.ID] = item;
        return acc;
    }, {} as Record<string, EntityWithID>);
}

export const useAuditEntityStore = create<AuditEntityStore>((set) => ({
    workspacesById: {},
    boardsById: {},
    listsById: {},
    cardsById: {},
    usersById: {},
    checklistsById: {},
    entriesById: {},

    mergeAuditEntities: (entities) => {
        if (!entities) return;

        set((state) => ({
            workspacesById: { ...state.workspacesById, ...toMap(entities.Workspaces) },
            boardsById: { ...state.boardsById, ...toMap(entities.Boards) },
            listsById: { ...state.listsById, ...toMap(entities.Lists) },
            cardsById: { ...state.cardsById, ...toMap(entities.Cards) },
            usersById: { ...state.usersById, ...toMap(entities.Users) },
            checklistsById: { ...state.checklistsById, ...toMap(entities.Checklists) },
            entriesById: { ...state.entriesById, ...toMap(entities.Entries) },
        }));
    },

    resetAuditEntities: () => {
        set({
            workspacesById: {},
            boardsById: {},
            listsById: {},
            cardsById: {},
            usersById: {},
            checklistsById: {},
            entriesById: {},
        });
    },
}));
