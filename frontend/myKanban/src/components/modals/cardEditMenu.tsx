import { ArchiveIcon, ArrowBigRight, ArrowRight, Clock10Icon, CopyIcon, CreditCardIcon, Link2Icon, TagIcon, User2 } from "lucide-react";
import { forwardRef, useRef, useState, type JSX } from "react";
import { CardLabelMenu } from "../cardMenus/cardLabelMenu";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { LabeledButtonPresetB } from "../buttons/labeledButton";

import React from "react";
import { CardMembersMenu } from "../cardMenus/cardMembersMenu";
import { CardCoverTabSelector } from "./CardCoverMenu";
import { CardDatesMenu } from "../cardMenus/cardDatesMenu";
import { CardMoveMenu } from "../cardMenus/cardMoveMenu";
import { useParams } from "react-router-dom";
import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry";
import { useCardsStore } from "@/stores/cardsStore";
import { ConfirmDeletionPopover } from "./ConfirmDeletion";
import { useUiStore, type DomainModalData } from "@/stores/uiStore";
import { useBoardDetailStore } from "@/stores/boardDetailStore";
import { useUserInboxStore } from "@/stores/userInboxStore";
import type { CardContext } from "@/domain/cardContext";

type CardEditMenuProps = {
    cardContext: CardContext;
    onClose: () => void;
    menuId?: string;
    canEdit?: boolean;
    canEditBoardList?: boolean;
}


type MenuItem = {
    id: string;
    label: string;
    icon: JSX.Element;
    menuToOpen?: (props: { onClose: () => void; ref: React.RefObject<HTMLDivElement | null> }) => JSX.Element | null;
    actionToPerform?: () => void;
    shouldShow?: boolean;
}

type MenuItemAndID = MenuItem & { menuId?: string }

export const CardEditMenu = forwardRef<HTMLDivElement, CardEditMenuProps>((props, ref) => {
    const { cardContext, onClose, canEdit = true, canEditBoardList = true } = props;
    const { cardId: cardID, sourceListId: listId, source = "board" } = cardContext;
    const iconClass = "w-4 h-4 text-neutral-400"
    const isInboxSource = source === "inbox" || source === "inbox-mirror"
    const { workspaceId, boardId } = useParams<{ workspaceId: string; boardId: string }>()
    const [linkCopied, setLinkCopied] = useState(false)
    const cardActions = useCardActionRegistry();
    const cardsStore = useCardsStore();
    const detatchInboxCard = useUserInboxStore((state) => state.detatchInboxCard)
    const getRootListIdForCardId = useBoardDetailStore((state) => state.getRootListIdForCardId);
    const resolvedListId = listId || getRootListIdForCardId(cardID) || "";

    const handleOpenCardDetailMenu = () => {
        onClose();
        cardActions.openCardDetailMenu({
            cardContext: {
                ...cardContext,
                openedFrom: "card-edit-menu",
            },
            boardID: boardId!,
            workspaceId: workspaceId!,
        })
    };
    const onMenuClose = useOverlayStore((state) => state.close);


    const handleCloseAllMenu = (id: string) => {
        onMenuClose(id);
        onMenuClose(props.menuId ?? id);

    }

    const archiveCard = async () => {
        if (isInboxSource || !boardId || !resolvedListId || !cardID) return;
        if (props.menuId) useOverlayStore.getState().freezeAnchor(props.menuId);
        handleCloseAllMenu(props.menuId ?? "card-edit-menu");
        const result = await cardsStore.removeCardFromList(boardId, resolvedListId, cardID);
        if (result !== null) {
            handleCloseAllMenu(props.menuId ?? "card-edit-menu");
        }
    }

    const detatchFromInbox = async () => {
        if (!isInboxSource || !cardID) return;
        if (props.menuId) useOverlayStore.getState().freezeAnchor(props.menuId);
        await detatchInboxCard(cardID)
        handleCloseAllMenu(props.menuId ?? "card-edit-menu")
    }

    const archiveCardWithConfirmation = () => {
        const data: DomainModalData = {
            componentent: (onCloseModal) => (
                <ConfirmDeletionPopover
                    onClose={onCloseModal}
                    onSubmit={() => {
                        void archiveCard();
                        onCloseModal();
                    }}
                    title="Archive card?"
                    body="Are you sure you want to archive this card?"
                    submitLabel="Archive"
                />
            ),
            anchorRef: null,
        }

        useUiStore.getState().setDomainModalOpen(true, data)
    }

    const detatchInboxCardWithConfirmation = () => {
        const data: DomainModalData = {
            componentent: (onCloseModal) => (
                <ConfirmDeletionPopover
                    onClose={onCloseModal}
                    onSubmit={() => {
                        void detatchFromInbox();
                        onCloseModal();
                    }}
                    title="Detatch from inbox?"
                    body="Are you sure you want to detatch this card from the inbox?"
                    submitLabel="Detatch"
                />
            ),
            anchorRef: null,
        }

        useUiStore.getState().setDomainModalOpen(true, data)
    }

    const freezeAnchor = () => {
        if (props.menuId) {
            useOverlayStore.getState().freezeAnchor(props.menuId);
        }
    }

    const closeMainMenu = () => {
        if (props.menuId) {
            useOverlayStore.getState().close(props.menuId);
        }
    }


    const menuItems: MenuItemAndID[] = [
        {
            id: "openCard", label: "Open Card", icon: <CreditCardIcon className={iconClass} />,
            actionToPerform: () => handleOpenCardDetailMenu()
        },
        {
            id: "editlabels", label: "Edit Labels", icon: <TagIcon className={iconClass} />,
            menuToOpen: ({ onClose, ref }) => <CardLabelMenu onClose={onClose} ref={ref} cardID={cardID} />,
            menuId: "card-edit-menu-labels", shouldShow: !isInboxSource
        },
        {
            id: "editMembers", label: "Edit Members", icon: <User2 className={iconClass} />,
            menuToOpen: ({ onClose, ref }) => <CardMembersMenu onClose={onClose} ref={ref} boardId={boardId} cardId={cardID} />,
            menuId: "card-edit-menu-members", shouldShow: !isInboxSource
        },
        {
            id: "editCover", label: "Edit Cover", icon: <CreditCardIcon className={iconClass} />,
            menuToOpen: ({ onClose, ref }) => <CardCoverTabSelector onClose={onClose} ref={ref} cardId={cardID} listCardId={cardContext.listCardId} source={source} />,
            menuId: "card-edit-menu-cover"
        },
        {
            id: "editDates", label: "Edit Dates", icon: <Clock10Icon className={iconClass} />,
            menuToOpen: ({ onClose, ref }) => <CardDatesMenu onClose={onClose} ref={ref} cardId={cardID} listCardId={cardContext.listCardId} source={source} />,
            menuId: "card-edit-menu-dates"
        },
        {
            id: "move", label: "Move", icon: <ArrowRight className={iconClass} />,
            menuToOpen: ({ onClose, ref }) => <CardMoveMenu onClose={onClose} ref={ref}
                onBeforeSubmit={freezeAnchor} onMoveSubmitSuccess={closeMainMenu}
                cardId={cardID} listId={listId} mode={isInboxSource ? "moveInboxCard" : "move"} />,
            menuId: "card-edit-menu-move"
        },
        {
            id: "copy", label: "Copy", icon: <CopyIcon className={iconClass} />,
            menuToOpen: ({ onClose, ref }) => <CardMoveMenu onClose={onClose} ref={ref} onBeforeSubmit={freezeAnchor} onMoveSubmitSuccess={closeMainMenu}
                cardId={cardID} listId={listId} mode="copy" />,
            menuId: "card-edit-menu-copy", shouldShow: !isInboxSource
        },
        {
            id: "copyLink", label: linkCopied ? "Link Copied!" : "Copy Link", icon: <Link2Icon className={iconClass} />,
            shouldShow: !isInboxSource,
            actionToPerform: () => {
                const url = `${window.location.origin}/workspaces/${workspaceId}/boards/${boardId}/cards/${cardID}`
                void navigator.clipboard.writeText(url)
                setLinkCopied(true)
                setTimeout(() => setLinkCopied(false), 1500)
            },
        },

        {
            id: "mirror", label: "Mirror", icon: <ArrowBigRight className={iconClass} />,
            menuToOpen: ({ onClose, ref }) => <CardMoveMenu onClose={onClose} ref={ref} onBeforeSubmit={freezeAnchor} onMoveSubmitSuccess={closeMainMenu} cardId={cardID} listId={listId} mode="mirror" />,
            menuId: "card-edit-menu-mirror", shouldShow: !isInboxSource
        },
        {
            id: "copyToBoard", label: "Copy to Board", icon: <ArrowBigRight className={iconClass} />,
            menuToOpen: ({ onClose, ref }) => <CardMoveMenu onClose={onClose} ref={ref} onBeforeSubmit={freezeAnchor} onMoveSubmitSuccess={closeMainMenu} cardId={cardID} listId={listId} mode="copyInboxCard" />,
            menuId: "card-edit-menu-insert-into-board", shouldShow: isInboxSource
        },


        {
            id: "archive",
            label: "Archive",
            icon: <ArchiveIcon className={iconClass} />,
            actionToPerform: () => archiveCardWithConfirmation(),
            shouldShow: !isInboxSource,
        },
        {
            id: "detatchFromInbox",
            label: "Detatch from Inbox",
            icon: <ArchiveIcon className={iconClass} />,
            actionToPerform: () => detatchInboxCardWithConfirmation(),
            shouldShow: isInboxSource,
        }

    ]
    const openOverlay = useOverlayStore((state) => state.open);


    const cardActionsMenuRef = useRef<HTMLDivElement>(null)
    const btnRef = useRef<HTMLDivElement>(null);

    const anchorMap = new Map<string, React.RefObject<HTMLElement | null>>()
    const registerAnchor = (id: string, ref: React.RefObject<HTMLElement | null>) => {
        anchorMap.set(id, ref)
    }

    function handleOpenCardActionModal(
        menuToOpen?: (props: { onClose: () => void; ref: React.RefObject<HTMLDivElement | null> }) => JSX.Element | null,
        anchorKey?: string, menuId?: string) {
        // console.log("Opening respond modal for share offer");
        const id = "card-edit-menu-labels";
        const descriptor: OverlayDescriptor = {
            id: menuId ?? id,
            render: () => menuToOpen ? menuToOpen({ onClose: () => onMenuClose(menuId ?? id), ref: cardActionsMenuRef })
                : <CardLabelMenu cardID={cardID} onClose={() => onMenuClose(id)} ref={cardActionsMenuRef} />,
            anchorRef: anchorKey ? anchorMap.get(anchorKey) : btnRef,
            panelRef: cardActionsMenuRef,
            type: "modal",
            renderType: "anchored",
            exclusiveGroup: "card-edit-submenus",
            opts: {
                closeOnMouseLeave: false,
                closeOnClickOutside: true,
                closeOnEscape: true,
                lockBackdrop: true,
            },
            position: {

                placement: "bottom-start",
            }
        }
        openOverlay(descriptor);

    }




    return (
        <div className=" relative flex flex-col gap-1"
            ref={ref}>
            {menuItems.map((item) => {
                const isBoardListOp = item.id === "archive" || item.id === "detatchFromInbox" || item.id === "move" || item.id === "mirror" || item.id === "copyToBoard" || item.id === "editlabels"
                if (isBoardListOp && !canEditBoardList) return null;
                if (!isBoardListOp && !canEdit && item.id !== "openCard" && item.id !== "copy" && item.id !== "copyLink") return null;
                if (item.shouldShow === false) return null;

                return (
                    <div key={item.id}>
                        <LabeledButtonPresetB
                            registerAnchor={registerAnchor}
                            anchorKey={item.id}
                            className="w-fit bg-neutral-800 text-white
                             hover:bg-neutral-700 rounded-[4px] px-2 py-1 text-left"
                            label={item.label}
                            onClick={() => { item.actionToPerform?.(); item.menuToOpen && handleOpenCardActionModal(item.menuToOpen, item.id, item.menuId); }} >
                            {item.icon}
                        </LabeledButtonPresetB>
                    </div>
                )
            })}





        </div>
    )
})


