import { ArchiveIcon, ArrowBigRight, ArrowRight, Clock10Icon, CopyIcon, CreditCardIcon, Link2Icon, TagIcon, User2 } from "lucide-react";
import { forwardRef, useRef, type JSX, type RefObject } from "react";
import { CardLabelMenu } from "../cardMenus/cardLabelMenu";
import { CardRowMenuBtn } from "../cardMenus/cardRowMenus";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { LabeledButtonPresetB } from "../buttons/labeledButton";

import React from "react";
import { CardMembersMenu } from "../cardMenus/cardMembersMenu";
import { CardCoverTabSelector } from "./CardCoverMenu";
import { CardDatesMenu } from "../cardMenus/cardDatesMenu";
import { CardMoveMenu } from "../cardMenus/cardMoveMenu";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry";

type CardEditMenuProps = {
    listId: string;
    cardID: string;
    onClose: () => void;
    menuId?: string;
    // Define the props for the CardEditMenu component here
}


type MenuItem = {
    id: string;
    label: string;
    icon: JSX.Element;
    menuToOpen?: (props: { onClose: () => void; ref: React.RefObject<HTMLDivElement | null> }) => JSX.Element | null;
    actionToPerform?: () => void;
}

type MenuItemAndID = MenuItem & { menuId?: string }

export const CardEditMenu = forwardRef<HTMLDivElement, CardEditMenuProps>((props, ref) => {
    const { listId, cardID, onClose } = props;
    const iconClass = "w-4 h-4 text-neutral-400"
    const navigate = useNavigate()
    const location = useLocation()
    const { workspaceId, boardId } = useParams<{ workspaceId: string; boardId: string }>()
    const cardActions = useCardActionRegistry();

    const handleOpenCardDetailMenu = () => {
        onClose();
        cardActions.openCardDetailMenu({
            cardID: cardID,
            sourceListID: listId,
            boardID: boardId!,
            workspaceId: workspaceId!,
            openedFrom: "card-edit-menu"
        })
    };

    const overlayCloseAll = useOverlayStore((state) => state.closeAll)
    const onMenuClose = useOverlayStore((state) => state.close);


    const handleCloseAllMenu = (id: string) => {
        onMenuClose(id);
        onMenuClose(props.menuId ?? id);

    }


    const menuItems: MenuItemAndID[] = [
        {
            id: "openCard", label: "Open Card", icon: <CreditCardIcon className={iconClass} />,
            actionToPerform: () => handleOpenCardDetailMenu()
        },
        {
            id: "editlabels", label: "Edit Labels", icon: <TagIcon className={iconClass} />,
            menuToOpen: ({ onClose, ref }) => <CardLabelMenu onClose={onClose} ref={ref} cardID={cardID} />,
            menuId: "card-edit-menu-labels"
        },
        {
            id: "editMembers", label: "Edit Members", icon: <User2 className={iconClass} />,
            menuToOpen: ({ onClose, ref }) => <CardMembersMenu onClose={onClose} ref={ref} boardId={boardId} cardId={cardID} />
        },
        {
            id: "editCover", label: "Edit Cover", icon: <CreditCardIcon className={iconClass} />,
            menuToOpen: ({ onClose, ref }) => <CardCoverTabSelector onClose={onClose} ref={ref} cardId={cardID} />,
            menuId: "card-edit-menu-cover"
        },
        {
            id: "editDates", label: "Edit Dates", icon: <Clock10Icon className={iconClass} />,
            menuToOpen: ({ onClose, ref }) => <CardDatesMenu onClose={onClose} ref={ref} cardId={cardID} />,
            menuId: "card-edit-menu-dates"
        },
        {
            id: "move", label: "Move", icon: <ArrowRight className={iconClass} />,
            menuToOpen: ({ onClose, ref }) => <CardMoveMenu onClose={onClose} ref={ref} cardId={cardID} listId={listId} mode="move" />,
            menuId: "card-edit-menu-move"
        },
        {
            id: "copy", label: "Copy", icon: <CopyIcon className={iconClass} />,
            menuToOpen: ({ onClose, ref }) => <CardMoveMenu onClose={onClose} ref={ref} cardId={cardID} listId={listId} mode="copy" />,
            menuId: "card-edit-menu-copy"
        },
        {
            id: "copyLink", label: "Copy Link", icon: <Link2Icon className={iconClass} />,
            menuToOpen: null
        },
        {
            id: "mirror", label: "Mirror", icon: <ArrowBigRight className={iconClass} />,
            menuToOpen: ({ onClose, ref }) => <CardMoveMenu onClose={onClose} ref={ref} cardId={cardID} listId={listId} mode="mirror" />,
            menuId: "card-edit-menu-mirror"
        },
        { id: "archive", label: "Archive", icon: <ArchiveIcon className={iconClass} />, }

    ]
    const openOverlay = useOverlayStore((state) => state.open);


    const cardActionsMenuRef = useRef<HTMLDivElement>(null)
    const acnhorRef = ref as React.RefObject<HTMLDivElement>;
    const btnRef = useRef<HTMLDivElement>(null);

    const anchorMap = new Map<string, React.RefObject<HTMLElement | null>>()
    const registerAnchor = (id: string, ref: React.RefObject<HTMLElement | null>) => {
        anchorMap.set(id, ref)
    }

    function handleOpenCardActionModal(
        menuToOpen?: (props: { onClose: () => void; ref: React.RefObject<HTMLDivElement | null> }) => JSX.Element,
        anchorKey?: string, menuId?: string) {
        // console.log("Opening respond modal for share offer");
        const id = "card-edit-menu-labels";
        const descriptor: OverlayDescriptor = {
            id: menuId ?? id,
            render: () => menuToOpen ? menuToOpen({ onClose: () => handleCloseAllMenu(menuId ?? id), ref: cardActionsMenuRef })
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



                return (
                    <>

                        <div
                            key={item.id} >
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
                    </>
                )
            })}





        </div>
    )
})


