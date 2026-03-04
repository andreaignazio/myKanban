import { useCardCommentsStore } from "@/stores/cardCommentsStore";
import { useCardMembersStore } from "@/stores/CardMembersStore";
import { useCardsStore } from "@/stores/cardsStore";
import { useChecklistStore } from "@/stores/checklistStore";
import type { CardProps, ChecklistEntryRowResponse, CopyCardToListRequest, CreateCardCommentRequest, CreateChecklistEntryRequest, CreateChecklistRequest, CreateInboxCardRequest, CrossMoveChecklistEntryRequest, MirrorCardToInboxRequest, MirrorCardToListRequest, MoveCardToBoardRequest, MoveChecklistEntryRequest, MoveChecklistRequest, PatchCardDetailsRequest, PatchChecklistEntryRequest } from "@/stores/types";
import { extractMentionedUserIDs } from "@/hooks/commentMentions";
import { useUserStore } from "@/stores/userStore";
import { useBoardDetailStore } from "@/stores/boardDetailStore";
import type { CardRouteState } from "@/components/CardRow";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useUserInboxStore } from "@/stores/userInboxStore";
export function useCardActionRegistry() {
    const cardsStore = useCardsStore();
    const cardMembersStore = useCardMembersStore();
    const checklistStore = useChecklistStore();
    const cardCommentsStore = useCardCommentsStore();
    const boardDetailStore = useBoardDetailStore();
    const inboxStore = useUserInboxStore();


    function setCardCoverSize(boardID: string, cardId: string, size: "small" | "large") {
        const props: CardProps = {
            Display: {
                Size: size,
            }
        }

        return cardsStore.patchCardProps(boardID, cardId, props)
    }

    function setCardColor(boardID: string, cardId: string, color: string) {
        const props: CardProps = {
            Display: {
                Cover: {
                    Type: "color",
                    Color: color
                }
            }
        }
        return cardsStore.patchCardProps(boardID, cardId, props)
    }

    function removeCardCover(boardID: string, cardId: string) {
        const props: CardProps = {
            Display: {
                Cover: null
            }
        }
        // console.log("Removing card cover with props:", props);
        return cardsStore.patchCardProps(boardID, cardId, props)
    }

    async function setCardTitle(boardID: string, cardId: string, title: string) {
        const payload: PatchCardDetailsRequest = {
            Title: title
        }
        await cardsStore.patchCardDetails(boardID, cardId, payload)
        return
    }

    async function setCardDone(boardID: string, cardId: string, done: boolean) {
        const payload: PatchCardDetailsRequest = {
            Done: done
        }
        await cardsStore.patchCardDetails(boardID, cardId, payload)
        return
    }

    async function setCardCoverURL(boardID: string, cardId: string, url: string) {
        const props: CardProps = {
            Display: {
                Cover: {
                    Type: "image",
                    URL: url
                }
            }
        }
        await cardsStore.patchCardProps(boardID, cardId, props)
        return
    }

    async function addMemberToCard(boardID: string, cardID: string, memberID: string) {
        await cardMembersStore.addMemberToCard(boardID, cardID, memberID);
    }

    async function removeMemberFromCard(boardID: string, cardID: string, memberID: string) {
        await cardMembersStore.removeMemberFromCard(boardID, cardID, memberID);
    }
    async function addChecklistToCardAtEnd(boardID: string, cardID: string, title: string) {
        const payload: CreateChecklistRequest = {
            Title: title,
            InsertAt: "end"
        }
        await checklistStore.createChecklistInCard(boardID, cardID, payload)
    }

    async function cloneChecklistToCardAtEnd(boardID: string, cardID: string, newTitle: string, checklistIDSource: string) {
        await checklistStore.cloneChecklistInCard(boardID, cardID, {
            NewTitle: newTitle,
            ChecklistIDSource: checklistIDSource,
        })
    }

    async function deleteChecklistFromCard(boardID: string, cardID: string, checklistId: string) {
        await checklistStore.deleteChecklist(boardID, cardID, checklistId)
    }

    async function addChecklistEntry(boardID: string, cardID: string, checklistId: string, title: string): Promise<ChecklistEntryRowResponse | undefined> {
        const payload: CreateChecklistEntryRequest = {
            Title: title
        }
        return await checklistStore.createChecklistEntry(boardID, cardID, checklistId, payload)
    }

    async function markChecklistEntry(boardID: string, cardID: string, checklistId: string, entryId: string, done: boolean) {
        const payload: PatchChecklistEntryRequest = {
            Done: done
        }
        // console.log("Marking checklist entry with payload:", payload);
        await checklistStore.patchChecklistEntry(boardID, cardID, checklistId, entryId, payload)
    }

    async function editChecklistEntryTitle(boardID: string, cardID: string, checklistId: string, entryId: string, title: string) {
        const payload: PatchChecklistEntryRequest = {
            Title: title
        }
        await checklistStore.patchChecklistEntry(boardID, cardID, checklistId, entryId, payload)
    }

    async function deleteChecklistEntry(boardID: string, cardID: string, checklistId: string, entryId: string) {
        await checklistStore.deleteChecklistEntry(boardID, cardID, checklistId, entryId)
    }

    async function convertChecklistEntry(boardID: string, cardID: string, checklistId: string, entryId: string, listID: string) {
        await checklistStore.convertChecklistEntry(boardID, cardID, checklistId, entryId, {
            BoardID: boardID,
            CardID: cardID,
            ListID: listID,
            EntryID: entryId,
        })
    }

    async function editChecklistTitle(boardID: string, cardID: string, checklistId: string, title: string) {
        const payload: PatchChecklistEntryRequest = {
            Title: title
        }
        await checklistStore.patchChecklist(boardID, cardID, checklistId, payload)
    }

    async function moveChecklistInCard(boardID: string, cardID: string, checklistId: string, beforeID?: string | null, insertAtEnd?: boolean) {
        const payload: MoveChecklistRequest = {
            BeforeID: insertAtEnd ? null : beforeID,
            InsertAt: insertAtEnd ? "end" : null
        }
        await checklistStore.moveChecklist(boardID, cardID, checklistId, payload)
    }

    async function addMemberToChecklistEntry(boardID: string, cardID: string, checklistId: string, entryId: string, userId: string) {
        await checklistStore.addMemberToEntry(boardID, cardID, checklistId, entryId, userId)
    }
    async function removeMemberFromChecklistEntry(boardID: string, cardID: string, checklistId: string, entryId: string, userId: string) {
        await checklistStore.removeMemberFromEntry(boardID, cardID, checklistId, entryId, userId)
    }

    async function setDatesForCard(boardID: string, cardID: string, from: Date | null, to: Date | null) {
        const payload: PatchCardDetailsRequest = {
            StartDate: from ? from.toISOString() : null,
            EndDate: to ? to.toISOString() : null
        };
        // console.log("Setting dates for card with payload:", payload);
        await cardsStore.patchCardDetails(boardID, cardID, payload);
    }

    async function setDueDateForChecklistEntry(boardID: string, cardID: string, entryID: string, dueDate: Date | null) {
        const latestChecklistState = useChecklistStore.getState();
        const checklistId = latestChecklistState.EntryInChecklistById[entryID]?.Relation.ChecklistID;
        if (!checklistId) {
            // console.warn("Unable to patch checklist entry due date: checklist relation not found for entry", entryID);
            return;
        }

        const payload: PatchChecklistEntryRequest = {
            DueDate: dueDate ? dueDate.toISOString() : null,
        };

        await latestChecklistState.patchChecklistEntry(boardID, cardID, checklistId, entryID, payload);
    }

    async function setCardDescription(boardID: string, cardID: string, description: string) {
        const payload: PatchCardDetailsRequest = {
            Description: description
        }
        await cardsStore.patchCardDetails(boardID, cardID, payload)
    }

    async function crossMoveChecklistEntry(boardID: string, cardID: string, sourceChecklistId: string, entryId: string, targetChecklistId: string, targetBeforeId?: string, insertAtEnd?: boolean) {
        const payload: CrossMoveChecklistEntryRequest = {
            TargetChecklistID: targetChecklistId,
            TargetBeforeID: insertAtEnd ? null : targetBeforeId,
            InsertAt: insertAtEnd ? "end" : null
        }
        // console.log("Cross moving checklist entry with payload:", payload);
        await checklistStore.crossMoveChecklistEntry(boardID, cardID, sourceChecklistId, entryId, payload)
    }

    async function moveChecklistEntry(boardID: string, cardID: string, checklistId: string, entryId: string, beforeID?: string | null, insertAtEnd?: boolean) {
        const payload: MoveChecklistEntryRequest = {
            BeforeID: insertAtEnd ? null : beforeID,
            InsertAt: insertAtEnd ? "end" : null
        }
        await checklistStore.moveChecklistEntry(boardID, cardID, checklistId, entryId, payload)
    }

    async function addCommentToCard(boardID: string, cardID: string, content: string) {
        // console.log("Adding comment to card with content:", content);
        const ids = extractMentionedUserIDs(content, useUserStore.getState().usersById)
        // console.log("Mentioned user IDs extracted from comment content:", ids);
        const payload: CreateCardCommentRequest = {
            Content: content,
            MentionedUserIDs: ids.length ? ids : undefined,
        }
        await cardCommentsStore.createCommentForCard(boardID, cardID, payload)
    }

    async function editCommentForCard(boardID: string, cardID: string, commentId: string, content: string) {
        // console.log("Editing comment with content:", content);
        const ids = extractMentionedUserIDs(content, useUserStore.getState().usersById)
        // console.log("Mentioned user IDs extracted from comment content:", ids);
        const payload: CreateCardCommentRequest = {
            Content: content,
            MentionedUserIDs: ids.length ? ids : undefined,
        }
        await cardCommentsStore.editCommentForCard(boardID, cardID, commentId, payload)
    }

    async function deleteCommentForCard(boardID: string, cardID: string, commentId: string) {
        // console.log("Deleting comment with id:", commentId);
        await cardCommentsStore.deleteCommentForCard(boardID, cardID, commentId)
    }

    async function moveCardToBoard(boardID: string, cardID: string, sourceListID: string,
        targetBoardID: string, targetListID: string, beforeID?: string | null, insertAtEnd?: boolean,
        getTargetDetails?: boolean) {
        const payload: MoveCardToBoardRequest = {
            TargetBoardID: targetBoardID,
            TargetListID: targetListID,

            SourceListID: sourceListID,
            BeforeID: insertAtEnd ? null : beforeID,
            InsertAt: insertAtEnd ? "end" : undefined
        }
        // console.log("Moving card to board with payload:", payload);
        if (getTargetDetails) {
            boardDetailStore.getBoardDetailPatch(targetBoardID)
        }
        await cardsStore.moveCardToBoard(boardID, cardID, payload)
    }




    function openCardDetailMenu(openCardRoute: OpenCardRoute) {
        const { cardID, sourceListID, boardID, workspaceId, openedFrom } = openCardRoute;
        const location = useLocation();
        const navigate = useNavigate();
        // const { workspaceId, boardId } = useParams<{ workspaceId: string; boardId: string }>()
        const nextState: CardRouteState = {
            backgroundLocation: location,
            sourceListId: sourceListID,
            openedFrom: openedFrom ?? "card-row"
        }
        navigate(
            `/workspaces/${workspaceId}/boards/${boardID}/cards/${cardID}`,
            { state: nextState } // chiave del pattern
        );
    };

    function mirrorCardToList(boardID: string, cardID: string, payload: MirrorCardToListRequest) {
        return cardsStore.mirrorCardToList(boardID, cardID, payload)
    }

    function copyCardToList(boardID: string, cardID: string, payload: CopyCardToListRequest) {
        return cardsStore.copyCardToList(boardID, cardID, payload)
    }

    function mirrorCardToInbox(boardID: string, cardID: string, payload: MirrorCardToInboxRequest) {
        return inboxStore.mirrorCardToInbox(boardID, cardID, payload)
    }
    function createInboxCard(payload: CreateInboxCardRequest) {
        return inboxStore.createInboxCard(payload)
    }


    return {
        setCardCoverSize,
        setCardColor,
        setCardTitle,
        setCardDone,
        removeCardCover,
        setCardCoverURL,
        addMemberToCard,
        removeMemberFromCard,
        addChecklistToCardAtEnd,
        cloneChecklistToCardAtEnd,
        deleteChecklistFromCard,
        addChecklistEntry,
        markChecklistEntry,
        editChecklistTitle,
        editChecklistEntryTitle,
        deleteChecklistEntry,
        convertChecklistEntry,
        moveChecklistInCard,
        moveChecklistEntry,
        addMemberToChecklistEntry,
        removeMemberFromChecklistEntry,
        setDatesForCard,
        setDueDateForChecklistEntry,
        setCardDescription,
        crossMoveChecklistEntry,
        addCommentToCard,
        editCommentForCard,
        deleteCommentForCard,
        moveCardToBoard,
        openCardDetailMenu,
        mirrorCardToList,
        copyCardToList,
        mirrorCardToInbox,
        createInboxCard

    }

}

export type OpenCardRoute = {
    cardID: string;
    sourceListID: string;
    boardID: string;
    workspaceId: string;
    openedFrom?: "card-row" | "card-edit-menu";
}
