import { useCardsStore, type CreateCardPayload } from "@/stores/cardsStore";
import { useBoardDetailStore } from "@/stores/boardDetailStore";
import { useListsStore } from "@/stores/listsStore";
import { useUserWatchStore } from "@/stores/userWatchStore";
import type { BoardListAccessMode, BulkCopyListsRequest, BulkCopyListsResponse, MirrorBoardListRequest, MirrorBoardListResponse, MoveBoardListRequest, MoveBoardListResponse } from "@/stores/types";

type CopySingleListInput = {
    title?: string;
    keepMembers?: boolean;
}

export function useListActionRegistry() {
    const cardsStore = useCardsStore();
    const listStore = useListsStore();
    const userWatchStore = useUserWatchStore();

    async function addCardAtEnd(boardId: string, listId: string) {
        const payload: CreateCardPayload = {
            Title: "New Card",
            InsertAt: "end",
            AfterID: null,
        }
        await cardsStore.addCardToList(boardId, listId, payload);
        //console.log("Add Card action triggered");
    }

    async function watchList(boardId: string, listId: string) {
        const watchState = useUserWatchStore.getState()
        const isActive = watchState.isListWatched(listId)
        const existingWatch = watchState.listWatchByListId[listId]

        if (isActive) {
            await watchState.patchListWatchActive(listId, false)
            return
        }

        if (existingWatch) {
            await watchState.patchListWatchActive(listId, true)
            return
        }

        await watchState.addListWatch(boardId, listId)
        //console.log("Watch List action triggered");
    }

    async function setListTitle(boardId: string, listId: string, title: string) {
        await listStore.patchListDetails(listId, boardId, { Title: title });
        //console.log("Set List Title action triggered");
    }

    async function setListColor(boardId: string, listId: string, color: string | null) {
        const currentList = listStore.getListById(listId)
        const currentProps = (currentList?.Props ?? {}) as Record<string, unknown>
        const nestedProps = (typeof currentProps.Props === "object" && currentProps.Props !== null)
            ? currentProps.Props as Record<string, unknown>
            : undefined
        const normalizedProps: Record<string, unknown> = {
            ...(nestedProps ?? {}),
            ...currentProps,
        }
        delete normalizedProps.Props

        await listStore.patchListProps(listId, boardId, {
            Props: {
                ...normalizedProps,
                Color: color,
            },
        })
    }

    async function setListAccessMode(boardId: string, listId: string, accessMode: BoardListAccessMode) {
        await listStore.patchListAccessMode(listId, boardId, { AccessMode: accessMode })
    }

    function copyBulkListsRaw(boardId: string, payload: BulkCopyListsRequest): Promise<BulkCopyListsResponse> {
        return listStore.copyBulkListsRaw(boardId, payload)
    }

    function copySingleListAfterSelf(boardId: string, listId: string, input?: CopySingleListInput): Promise<BulkCopyListsResponse> {
        const payload: BulkCopyListsRequest = {
            AfterID: listId,
            Lists: [{
                ListID: listId,
                Title: input?.title ?? null,
            }],
        }
        if (typeof input?.keepMembers === "boolean") {
            payload.KeepMembers = input.keepMembers
        }
        return listStore.copyBulkListsRaw(boardId, payload)
    }

    function moveBoardList(sourceBoardId: string, listId: string, payload: MoveBoardListRequest): Promise<MoveBoardListResponse> {
        return listStore.moveBoardList(sourceBoardId, listId, payload)
    }

    function mirrorBoardList(sourceBoardId: string, listId: string, payload: MirrorBoardListRequest): Promise<MirrorBoardListResponse> {
        return listStore.mirrorBoardList(sourceBoardId, listId, payload)
    }

    async function archiveList(boardId: string, listId: string) {
        await listStore.detatchList(listId, boardId)
    }

    async function archiveAllCardsInList(boardId: string, listId: string) {
        await cardsStore.bulkDetatchListCards(boardId, listId)
        await useBoardDetailStore.getState().fetchCardsByListId(boardId, listId)
    }

    async function moveAllCardsInList(boardId: string, sourceListId: string, targetListId: string) {
        const listCardIds = useBoardDetailStore.getState().getListCardIds(sourceListId)
        if (listCardIds.length === 0) {
            return
        }

        await cardsStore.bulkMoveListCardsInBoard(boardId, {
            ListCardIDs: listCardIds,
            TargetListID: targetListId,
            InsertAt: "end",
        })

        const boardDetailStore = useBoardDetailStore.getState()
        await Promise.all([
            boardDetailStore.fetchCardsByListId(boardId, sourceListId),
            boardDetailStore.fetchCardsByListId(boardId, targetListId),
        ])
    }



    return {
        addCard: addCardAtEnd,
        watchList: watchList,
        setListTitle: setListTitle,
        setListColor,
        setListAccessMode,
        copyBulkListsRaw,
        copySingleListAfterSelf,
        moveBoardList,
        mirrorBoardList,
        moveAllCardsInList,
        archiveList,
        archiveAllCardsInList,
    }
}