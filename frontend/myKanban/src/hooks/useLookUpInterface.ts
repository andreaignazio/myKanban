import { useArchivedEntitiesStore } from "@/stores/archivedEntitiesStore";
import { useBoardsStore } from "@/stores/boardsStore";
import { useCardsStore } from "@/stores/cardsStore";
import { useListsStore } from "@/stores/listsStore";
import { useBoardDetailStore } from "@/stores/boardDetailStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { List, ListWatch, Card, CardWatch, Board, BoardWatch, Workspace } from "@/stores/types";
import { useUserWatchStore } from "@/stores/userWatchStore";

export type Lookup<T> = {
    isActive: (id: string) => boolean;
    getTitle: (id: string) => string;
    getContext?: (id: string) => string | undefined;
    getContextLink?: (id: string) => string | undefined;
    getWorkspace?: (id: string) => Workspace | undefined;
    patchActive?: (id: string, active: boolean) => Promise<void>;
    restore?: (id: string) => Promise<void>;
    delete?: (id: string) => Promise<void>;

}
export function useLookUpInterface(boardID?: string) {


    const listsById = useListsStore((state) => state.listsById);
    const cardsById = useCardsStore((state) => state.cardsById);
    const boardsById = useBoardsStore((state) => state.boardsById);
    const workspacesById = useWorkspaceStore((state) => state.workspacesById);
    const boardListById = useBoardDetailStore((state) => state.boardListById);
    const listCardById = useBoardDetailStore((state) => state.listCardById);

    const resolveWorkspaceByBoardID = (resolvedBoardID?: string): Workspace | undefined => {
        if (!resolvedBoardID) return undefined;
        const board = boardsById[resolvedBoardID] as Board | undefined;
        if (!board?.WorkspaceID) return undefined;
        return workspacesById[board.WorkspaceID];
    };

    const resolveBoardIDByListID = (listID: string): string | undefined => {
        const listFromStore = listsById[listID] as (List & { CreatedInBoardID?: string }) | undefined;
        if (listFromStore?.CreatedInBoardID) return listFromStore.CreatedInBoardID;
        const relation = Object.values(boardListById).find((row) => row.ListID === listID);
        return relation?.BoardID;
    };

    const resolveWorkspaceByListID = (listID: string): Workspace | undefined => {
        const resolvedBoardID = resolveBoardIDByListID(listID);
        return resolveWorkspaceByBoardID(resolvedBoardID);
    };

    const buildBoardPath = (boardID: string): string | undefined => {
        const board = boardsById[boardID] as Board | undefined;
        if (!board?.WorkspaceID) return undefined;
        return `/workspaces/${board.WorkspaceID}/boards/${boardID}`;
    };

    const resolveBoardIDByCardID = (cardID: string): string | undefined => {
        const relation = Object.values(listCardById).find((row) => row.CardID === cardID);
        const listId = relation?.ListID ?? (cardsById[cardID] as (Card & { CreatedInListID?: string }) | undefined)?.CreatedInListID;
        if (!listId) return undefined;
        return resolveBoardIDByListID(listId);
    };

    const resolveBoardNameByListID = (listID: string): string | undefined => {
        const boardId = resolveBoardIDByListID(listID);
        return boardId ? (boardsById[boardId] as Board | undefined)?.Name : undefined;
    };

    const resolveBoardNameByCardID = (cardID: string): string | undefined => {
        const relation = Object.values(listCardById).find((row) => row.CardID === cardID);
        const listId = relation?.ListID ?? (cardsById[cardID] as (Card & { CreatedInListID?: string }) | undefined)?.CreatedInListID;
        if (!listId) return undefined;
        return resolveBoardNameByListID(listId);
    };

    const resolveWorkspaceByCardID = (cardID: string): Workspace | undefined => {
        const relation = Object.values(listCardById).find((row) => row.CardID === cardID);
        if (relation?.ListID) {
            return resolveWorkspaceByListID(relation.ListID);
        }
        const card = cardsById[cardID] as (Card & { CreatedInListID?: string }) | undefined;
        if (card?.CreatedInListID) {
            return resolveWorkspaceByListID(card.CreatedInListID);
        }
        return undefined;
    };

    const listWatchByListId = useUserWatchStore((state) => state.listWatchByListId)
    const cardWatchByCardId = useUserWatchStore((state) => state.cardWatchByCardId)
    const boardWatchByBoardId = useUserWatchStore((state) => state.boardWatchByBoardId)

    const patchCardWatchActive = useUserWatchStore((state) => state.patchCardWatchActive)
    const patchListWatchActive = useUserWatchStore((state) => state.patchListWatchActive)
    const patchBoardWatchActive = useUserWatchStore((state) => state.patchBoardWatchActive)
    const deleteListWatch = useUserWatchStore((state) => state.deleteListWatch)
    const deleteCardWatch = useUserWatchStore((state) => state.deleteCardWatch)
    const deleteBoardWatch = useUserWatchStore((state) => state.deleteBoardWatch)
    const getCardIdFromListCardId = useArchivedEntitiesStore((state) => state.getCardIdFromListCardId)
    const getListIdFromBoardListId = useArchivedEntitiesStore((state) => state.getListIdFromBoardListId)
    const restoreArchivedListCard = useArchivedEntitiesStore((state) => state.restoreArchivedListCard)
    const restoreArchivedBoardList = useArchivedEntitiesStore((state) => state.restoreArchivedBoardList)
    const purgeArchivedListCard = useArchivedEntitiesStore((state) => state.purgeArchivedListCard)
    const purgeArchivedBoardList = useArchivedEntitiesStore((state) => state.purgeArchivedBoardList)


    const ListLookup: Lookup<List> = {
        isActive: (id) => {
            const listWatch = listWatchByListId[id] as ListWatch | undefined;
            return listWatch ? listWatch.Active : false;
        },
        getTitle: (id) => {
            const list = listsById[id] as List | undefined;
            return list ? list.Title : id;
        },
        getContext: (id) => {
            const boardId = listWatchByListId[id]?.BoardID;
            return boardId ? (boardsById[boardId] as Board | undefined)?.Name : resolveBoardNameByListID(id);
        },
        getContextLink: (id) => {
            const watch = listWatchByListId[id];
            if (watch?.BoardID && watch?.WorkspaceID) return `/workspaces/${watch.WorkspaceID}/boards/${watch.BoardID}`;
            const boardId = resolveBoardIDByListID(id);
            return boardId ? buildBoardPath(boardId) : undefined;
        },
        getWorkspace: (id) => {
            const wsId = listWatchByListId[id]?.WorkspaceID;
            return wsId ? workspacesById[wsId] : resolveWorkspaceByListID(id);
        },
        patchActive: async (id: string, active: boolean) => {
            await patchListWatchActive(id, active)
        },
        delete: async (id: string) => {
            await deleteListWatch(id)
        },
    }

    const CardLookup: Lookup<Card> = {
        isActive: (id) => {
            const cardWatch = cardWatchByCardId[id] as CardWatch | undefined;
            return cardWatch ? cardWatch.Active : false;
        },
        getTitle: (id) => {
            const card = cardsById[id] as Card | undefined;
            return card ? card.Title : id;
        },
        getContext: (id) => {
            const boardId = cardWatchByCardId[id]?.BoardID;
            return boardId ? (boardsById[boardId] as Board | undefined)?.Name : resolveBoardNameByCardID(id);
        },
        getContextLink: (id) => {
            const watch = cardWatchByCardId[id];
            if (watch?.BoardID && watch?.WorkspaceID) return `/workspaces/${watch.WorkspaceID}/boards/${watch.BoardID}`;
            const boardId = resolveBoardIDByCardID(id);
            return boardId ? buildBoardPath(boardId) : undefined;
        },
        getWorkspace: (id) => {
            const wsId = cardWatchByCardId[id]?.WorkspaceID;
            return wsId ? workspacesById[wsId] : resolveWorkspaceByCardID(id);
        },
        patchActive: async (id: string, active: boolean) => {
            await patchCardWatchActive(id, active)
        },
        delete: async (id: string) => {
            await deleteCardWatch(id)
        },
    }

    const BoardLookup: Lookup<Board> = {
        isActive: (id) => {
            const boardWatch = boardWatchByBoardId[id] as BoardWatch | undefined;
            return boardWatch ? boardWatch.Active : false;
        },
        getTitle: (id) => {
            const board = boardsById[id] as Board | undefined;
            return board ? board.Name : id;
        },
        getContextLink: (id) => {
            const watch = boardWatchByBoardId[id];
            if (watch?.WorkspaceID) return `/workspaces/${watch.WorkspaceID}/boards/${id}`;
            return buildBoardPath(id);
        },
        getWorkspace: (id) => {
            const wsId = boardWatchByBoardId[id]?.WorkspaceID;
            return wsId ? workspacesById[wsId] : resolveWorkspaceByBoardID(id);
        },
        patchActive: async (id: string, active: boolean) => {
            await patchBoardWatchActive(id, active)
        },
        delete: async (id: string) => {
            await deleteBoardWatch(id)
        },
    }

    const WorkspaceLookup: Lookup<Workspace> = {
        isActive: () => {
            return false;
        },
        getTitle: (id) => {
            const workspace = workspacesById[id] as Workspace | undefined;
            return workspace ? workspace.Name : id;
        },
        getWorkspace: (id) => workspacesById[id],
    }


    const ArchivedCardLookup: Lookup<Card> = {
        isActive: (id) => {
            return false;
        },
        getTitle: (id) => {
            const cardId = getCardIdFromListCardId(id)
            const card = cardsById[cardId ?? ""] as Card | undefined;
            return card ? card.Title : id;
        },
        patchActive: async (id: string, active: boolean) => {
            // No-op for archived cards
        },
        restore: async (id: string) => {
            if (!boardID) return
            await restoreArchivedListCard(boardID, id)
        },
        delete: async (id: string) => {
            if (!boardID) return
            await purgeArchivedListCard(boardID, id)
        }
    }

    const ArchivedListLookup: Lookup<List> = {
        isActive: (id) => {
            return false;
        },
        getTitle: (id) => {
            const listId = getListIdFromBoardListId(id)
            const list = listsById[listId ?? ""] as List | undefined;
            return list ? list.Title : id;
        },
        patchActive: async (id: string, active: boolean) => {
            // No-op for archived lists
        },
        restore: async (id: string) => {
            if (!boardID) return
            await restoreArchivedBoardList(boardID, id)
        },
        delete: async (id: string) => {
            if (!boardID) return
            await purgeArchivedBoardList(boardID, id)
        }
    }


    const lookupByType: Record<string, Lookup<any>> = {
        list: ListLookup,
        card: CardLookup,
        board: BoardLookup,
        workspace: WorkspaceLookup,
        archivedCard: ArchivedCardLookup,
        archivedList: ArchivedListLookup,
    }

    type LookupKind = keyof typeof lookupByType;

    function getLookupForType(type: LookupKind): Lookup<any> {
        return lookupByType[type];
    }

    return {
        getLookupForType,
    }

}
