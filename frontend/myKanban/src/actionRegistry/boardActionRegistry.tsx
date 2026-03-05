import { useBoardMembersStore } from "@/stores/boardMembersStore";
import { useBoardsStore } from "@/stores/boardsStore";
import { useLabelsStore } from "@/stores/labelsStore";
import type { CreateBoardLabelRequest, CreateBoardRequest, PatchBoardLabelRequest } from "@/stores/types";
import { useUiStore, type DomainModalData } from "@/stores/uiStore";
import { ConfirmDeletionPopover } from "@/components/modals/ConfirmDeletion";
import { useOverlayStore } from "@/overlays/overlayStore";
import { useNavigate } from "react-router-dom";
import { useBuildPublicURL } from "@/hooks/useBuildPublicURL";

export function useBoardActionRegistry() {

    const boardMembersStore = useBoardMembersStore();
    const labelStore = useLabelsStore();
    const boardsStore = useBoardsStore();

    function createBoard(workspaceID: string, payload: CreateBoardRequest) {
        return boardsStore.createBoardInWorkspace(workspaceID, payload);
    }

    function setBoardDescription(boardID: string, description: string) {
        return boardsStore.patchBoard(boardID, {
            Props: {
                Description: description,
            },
        });
    }

    function setBoardVisibility(boardID: string, visibility: string) {
        return boardsStore.patchBoard(boardID, { Visibility: visibility }, "board:edit:visibility");
    }

    function setBoardBackgroundColor(boardID: string, colorToken: string) {
        return boardsStore.patchBoard(boardID, {
            Props: {
                Background: {
                    Type: "color",
                    Color: { Token: colorToken },
                    Image: { Url: "" },
                },
            },
        }, "board:edit:background:color");
    }

    function setBoardBackgroundImage(boardID: string, imageUrl: string) {
        return boardsStore.patchBoard(boardID, {
            Props: {
                Background: {
                    Type: "image",
                    Image: { Url: imageUrl },
                    Color: { Token: "" },
                },
            },
        }, "board:edit:background:image");
    }

    function setBoardStarred(boardID: string, starred: boolean) {
        return boardsStore.patchMyUserBoardProps(boardID, { Props: { Starred: starred } }, "userboard:edit:starred");
    }


    function setBoardMemberRole(boardID: string, tagetUserID: string, role: string) {
        return boardMembersStore.setBoardMemberRole(boardID, tagetUserID, role);
    }

    function deleteBoardMember(boardID: string, targetUserID: string) {
        return boardMembersStore.deleteBoardMember(boardID, targetUserID);
    }

    function leaveBoard(boardID: string, currentUserID: string) {
        return boardMembersStore.deleteBoardMember(boardID, currentUserID);
    }

    function leaveBoardWithConfirmation(
        boardID: string,
        currentUserID: string,
        anchorRef?: React.RefObject<HTMLElement | null>,
        onBeforeSubmit?: () => void
    ) {
        const data: DomainModalData = {
            componentent: (onClose) => (
                <ConfirmDeletionPopover
                    onClose={onClose}
                    onSubmit={() => {
                        onBeforeSubmit?.();
                        void leaveBoard(boardID, currentUserID);
                        onClose();
                    }}
                    title="Leave board?"
                    body="You will lose access to this board until invited again."
                    submitLabel="Leave board"
                />
            ),
            anchorRef: anchorRef ?? null,
        }
        useUiStore.getState().setDomainModalOpen(true, data)
    }

    function createBoardLabel(boardID: string, title: string, color: string) {
        const payload: CreateBoardLabelRequest = {
            Title: title,
            Color: color,
        }
        return labelStore.createBoardLabel(boardID, payload);
    }
    function updateBoardLabel(boardID: string, labelID: string, title?: string, color?: string) {
        const payload: PatchBoardLabelRequest = {
            Title: title,
            Color: color,
        }
        return labelStore.updateBoardLabel(boardID, labelID, payload);
    }
    function deleteBoardLabel(boardID: string, labelID: string) {
        return labelStore.deleteBoardLabel(boardID, labelID);
    }
    function addCardLabel(boardID: string, cardID: string, labelID: string) {
        return labelStore.addCardLabel(boardID, cardID, labelID);
    }
    function removeCardLabel(boardID: string, cardID: string, labelID: string) {
        return labelStore.removeCardLabel(boardID, cardID, labelID);
    }
    function closeBoard(workspaceID: string, boardID: string) {
        return boardsStore.closeBoardInWorkspace(workspaceID, boardID, "board:close");
    }

    const closeAllOverlays = useOverlayStore((state) => state.closeAll);
    const navigete = useNavigate();
    const { buildPublicURLFromWorkspaceID } = useBuildPublicURL();

    function handleSubmitCloseBoard(workspaceID: string, boardID: string) {
        closeAllOverlays();
        closeBoard(workspaceID, boardID);
        navigete(buildPublicURLFromWorkspaceID(workspaceID));
    }


    function closeBoardWithConfirmation(workspaceID: string, boardID: string, anchorRef?: React.RefObject<HTMLElement | null>) {
        const data: DomainModalData = {
            componentent: (onClose) => <ConfirmDeletionPopover onClose={onClose} onSubmit={() => { handleSubmitCloseBoard(workspaceID, boardID); onClose(); }} />,
            anchorRef: anchorRef ?? null,
        }
        useUiStore.getState().setDomainModalOpen(true, data);

    }

    function purgeBoardWithConfirmation(workspaceID: string, boardID: string, anchorRef: React.RefObject<HTMLElement | null>) {
        const data: DomainModalData = {
            componentent: (onClose) => <ConfirmDeletionPopover
                onClose={onClose}
                onSubmit={() => { purgeBoard(workspaceID, boardID); onClose(); }}
                title="Permanently delete board?" body="This action cannot be undone." />,
            anchorRef: anchorRef,
            renderType: "anchored",
            placement: "top",
        }
        useUiStore.getState().setDomainModalOpen(true, data);

    }

    function restoreBoard(workspaceID: string, boardID: string) {
        return boardsStore.restoreBoardInWorkspace(workspaceID, boardID);
    }
    function purgeBoard(workspaceID: string, boardID: string) {
        return boardsStore.purgeBoardInWorkspace(workspaceID, boardID);
    }
    function getClosedBoards(workspaceID: string) {
        return boardsStore.getClosedBoardsInWorkspace(workspaceID);
    }

    return {
        setBoardMemberRole,
        deleteBoardMember,
        leaveBoard,
        leaveBoardWithConfirmation,
        createBoardLabel,
        updateBoardLabel,
        deleteBoardLabel,
        addCardLabel,
        removeCardLabel,
        createBoard,
        setBoardDescription,
        setBoardVisibility,
        setBoardBackgroundColor,
        setBoardBackgroundImage,
        setBoardStarred,
        closeBoard,
        restoreBoard,
        purgeBoard,
        getClosedBoards,
        closeBoardWithConfirmation,
        purgeBoardWithConfirmation,
    }
}