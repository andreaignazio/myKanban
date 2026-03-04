import { forwardRef, useState, type ComponentType, type SVGProps } from "react"
import type { MenuItemExtended } from "@/types/uiTypes"
import { DropDown } from "../menuElements/DropDown"
import { ArchiveIcon, ArrowBigRight, ArrowRight, Clock10Icon, CopyIcon, EyeIcon, TagIcon, User2, UserMinus } from "lucide-react"
import { ActionMenuWrapper } from "../modals/ListActionsMenu"
import { CardMoveMenu } from "./cardMoveMenu"
import { CardLabelMenu } from "./cardLabelMenu"
import { CardMembersMenu } from "./cardMembersMenu"
import { CardDatesMenu } from "./cardDatesMenu"
import { useBoardDetailStore } from "@/stores/boardDetailStore"
import { useObservedHeight } from "@/hooks/useObservedHeight"
import { useUserWatchStore } from "@/stores/userWatchStore"
import { CheckIcon } from "@heroicons/react/24/solid"
import { useCardsStore } from "@/stores/cardsStore"
import { useParams } from "react-router"
import { useAuthStore } from "@/stores/auth"
import { useCardMembersStore } from "@/stores/CardMembersStore"

type CardActionsDropDownProps = {
    onClose: () => void
    cardId: string
    listId?: string
}

type CardActionsTab = "menu" | "move" | "copy" | "mirror" | "labels" | "members" | "dates";

export const CardActionsDropDown = forwardRef<HTMLDivElement, CardActionsDropDownProps>(({ onClose, cardId, listId }, ref) => {

    const [activeTab, setActiveTab] = useState<CardActionsTab>("menu");
    const { elementRef: labelsContentRef, height: labelsContentHeight } = useObservedHeight(300);
    const { elementRef: membersContentRef, height: membersContentHeight } = useObservedHeight(390);
    const boardId = useParams().boardId as string;
    const getRootListIdForCardId = useBoardDetailStore((state) => state.getRootListIdForCardId);
    const resolvedListId = listId ?? getRootListIdForCardId(cardId) ?? undefined;
    const currentUserId = useAuthStore((state) => state.user?.ID ?? state.userID ?? "");
    const isCurrentUserCardMember = useCardMembersStore((state) => {
        if (!cardId || !currentUserId) return false;
        return state.getUserIDsByCardID(cardId).includes(currentUserId);
    });
    const addMemberToCard = useCardMembersStore((state) => state.addMemberToCard);
    const removeMemberFromCard = useCardMembersStore((state) => state.removeMemberFromCard);
    const cardsStore = useCardsStore();
    const isWatched = useUserWatchStore((state) => state.isCardWatched(cardId));
    const cardWatch = useUserWatchStore((state) => state.cardWatchByCardId[cardId]);
    const addCardWatch = useUserWatchStore((state) => state.addCardWatch);
    const patchCardWatchActive = useUserWatchStore((state) => state.patchCardWatchActive);

    const ICON_SIZE_CLASS = "w-4 h-4";
    const iconClassName = `${ICON_SIZE_CLASS} text-neutral-400`;
    const icon = (Icon: ComponentType<SVGProps<SVGSVGElement>>) => <Icon className={iconClassName} />;
    const h = 32;

    const toggleCardWatch = async () => {
        if (!boardId || !cardId) return;
        if (cardWatch) {
            await patchCardWatchActive(cardId, !isWatched);
            return;
        }
        await addCardWatch(boardId, cardId);
    }

    const archiveCard = async () => {
        if (!boardId || !resolvedListId || !cardId) return;
        await cardsStore.removeCardFromList(boardId, resolvedListId, cardId);
        onClose();
    }

    const toggleJoinLeave = async () => {
        if (!boardId || !cardId || !currentUserId) return;

        if (isCurrentUserCardMember) {
            await removeMemberFromCard(boardId, cardId, currentUserId);
            return;
        }

        await addMemberToCard(boardId, cardId, currentUserId);
    }

    const items: MenuItemExtended[] = [
        {
            id: "joinLeave", label: isCurrentUserCardMember ? "Leave" : "Join", kind: "standard",
            height: h,
            icon: isCurrentUserCardMember ? icon(UserMinus) : icon(User2),
            onClick: () => { void toggleJoinLeave(); }
        },
        {
            id: "move", label: "Move", kind: "standard",
            height: h,
            icon: icon(ArrowRight),
            onClick: () => setActiveTab("move")
        },
        {
            id: "copy", label: "Copy", kind: "standard",
            height: h,
            icon: icon(CopyIcon),
            onClick: () => setActiveTab("copy")
        },
        {
            id: "mirror", label: "Mirror", kind: "standard",
            height: h,
            icon: icon(ArrowBigRight),
            onClick: () => setActiveTab("mirror")
        },
        {
            id: "labels", label: "Labels", kind: "standard",
            height: h,
            icon: icon(TagIcon),
            onClick: () => setActiveTab("labels")
        },
        {
            id: "members", label: "Members", kind: "standard",
            height: h,
            icon: icon(User2),
            onClick: () => setActiveTab("members")
        },
        {
            id: "dates", label: "Dates", kind: "standard",
            height: h,
            icon: icon(Clock10Icon),
            onClick: () => setActiveTab("dates")
        },

        {
            id: "watch", label: "Watch", kind: "standard",
            height: h,
            icon: icon(EyeIcon),
            endIcon: isWatched ? <CheckIcon className="w-4 h-4" /> : undefined,
            onClick: () => { void toggleCardWatch(); }
        },
        { id: "divider1", label: "", kind: "divider" },
        {
            id: "archive", label: "Archive", kind: "standard",
            height: h,
            icon: icon(ArchiveIcon),
            onClick: () => { void archiveCard(); }
        },
    ]

    const widthByTab: Record<CardActionsTab, number> = {
        menu: 250,
        move: 320,
        copy: 320,
        mirror: 320,
        labels: 300,
        members: 300,
        dates: 300,
    }

    const heightByTab: Record<CardActionsTab, number> = {
        menu: 290,
        move: 420,
        copy: 660,
        mirror: 420,
        labels: 300,
        members: 390,
        dates: 520,
    }

    const MEMBERS_MIN_HEIGHT = 280;
    const MEMBERS_MAX_HEIGHT = 460;

    const resolvedMembersHeight = Math.min(
        MEMBERS_MAX_HEIGHT,
        Math.max(MEMBERS_MIN_HEIGHT, membersContentHeight)
    );

    const resolvedHeight = activeTab === "labels"
        ? Math.max(220, labelsContentHeight)
        : activeTab === "members"
            ? resolvedMembersHeight
            : heightByTab[activeTab];

    const panelClass = (tab: CardActionsTab) => `absolute inset-0 text-neutral-300 overflow-hidden transition-all duration-200 ease-out ${activeTab === tab
        ? "opacity-100 translate-x-0 pointer-events-auto"
        : "opacity-0 translate-x-2 pointer-events-none"
        }`;


    return (
        <ActionMenuWrapper
            ref={ref}
            Title="Card Actions"
            width={widthByTab[activeTab]}
            onClose={onClose}
            onBack={activeTab !== "menu" ? () => setActiveTab("menu") : undefined}
        >
            <div className="relative" style={{ height: `${resolvedHeight}px` }}>
                <div className={panelClass("menu")}>
                    <DropDown items={items} />
                </div>

                <div className={panelClass("move")}>
                    <CardMoveMenu onClose={onClose} cardId={cardId} listId={resolvedListId} mode="move" headless />
                </div>
                <div className={panelClass("copy")}>
                    <CardMoveMenu onClose={onClose} cardId={cardId} listId={resolvedListId} mode="copy" headless />
                </div>
                <div className={panelClass("mirror")}>
                    <CardMoveMenu onClose={onClose} cardId={cardId} listId={resolvedListId} mode="mirror" headless />
                </div>
                <div className={panelClass("labels")}>
                    <div ref={labelsContentRef}>
                        <CardLabelMenu onClose={onClose} cardID={cardId} headless />
                    </div>
                </div>
                <div className={`${panelClass("members")} overflow-y-auto`}>
                    <div ref={membersContentRef}>
                        <CardMembersMenu onClose={onClose} cardId={cardId} headless />
                    </div>
                </div>
                <div className={panelClass("dates")}>
                    <CardDatesMenu onClose={onClose} cardId={cardId} headless />
                </div>
            </div>

        </ActionMenuWrapper>
    )
})
