import { useArchivedEntitiesStore } from "@/stores/archivedEntitiesStore";
import { useBoardsStore } from "@/stores/boardsStore";
import { useCardsStore } from "@/stores/cardsStore";
import { useListsStore } from "@/stores/listsStore";
import type { List, ListWatch, Card, CardWatch, Board, BoardWatch } from "@/stores/types";
import { useUserWatchStore } from "@/stores/userWatchStore";

export type Lookup<T> = {
    isActive: (id: string) => boolean;
    getTitle: (id: string) => String;
    patchActive?: (id: string, active: boolean) => Promise<void>;
    restore?: (id: string) => Promise<void>;
    delete?: (id: string) => Promise<void>;

}
export function useLookUpInterface(boardID?: string) {


    const listsById = useListsStore((state) => state.listsById);
    const cardsById = useCardsStore((state) => state.cardsById);
    const boardsById = useBoardsStore((state) => state.boardsById);

    const listWatchByListId = useUserWatchStore((state) => state.listWatchByListId)
    const cardWatchByCardId = useUserWatchStore((state) => state.cardWatchByCardId)
    const boardWatchByBoardId = useUserWatchStore((state) => state.boardWatchByBoardId)

    const patchCardWatchActive = useUserWatchStore((state) => state.patchCardWatchActive)
    const patchListWatchActive = useUserWatchStore((state) => state.patchListWatchActive)
    const patchBoardWatchActive = useUserWatchStore((state) => state.patchBoardWatchActive)
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
        patchActive: async (id: string, active: boolean) => {
            await patchListWatchActive(id, active)
        }


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
        patchActive: async (id: string, active: boolean) => {
            await patchCardWatchActive(id, active)
        }
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
        patchActive: async (id: string, active: boolean) => {
            await patchBoardWatchActive(id, active)
        }
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