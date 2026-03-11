import { XMarkIcon } from "@heroicons/react/24/solid";
import { forwardRef, useState } from "react";
import type { MenuItemExtended } from "@/types/uiTypes";
import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry";
import { useParams } from "react-router";
import { DropDown } from "../menuElements/DropDown";
import { ActionMenuWrapper } from "../modals/ListActionsMenu";
import { headerStyle, PADDING_X } from "./cardMenuStyle";
import { UserAvatar } from "../badges/UserAvatar";
import { useUserStore } from "@/stores/userStore";
import { useBoardMembersStore } from "@/stores/boardMembersStore";
import { useCardMembersStore } from "@/stores/CardMembersStore";
import { CustomInput } from "../menuElements/CustomInput";
import { useShallow } from "zustand/shallow";
import { useChecklistStore } from "@/stores/checklistStore";
import type { AsyncRequestKey } from "@/stores/asyncRequestTypes";
import type { User } from "@/stores/types";


type CardMembersMenuProps = {
    onClose: () => void;
    onMemberClick?: (userID: string) => void;
    onMemberRemove?: (userID: string) => void;
    entryId?: string;
    boardId?: string;
    cardId?: string;
    headless?: boolean;


}
const EMPTY_USER_IDS: string[] = [];

type UserItem = {
    id: string;
    disabled: boolean;
    disabledTooltipText?: string;
}


export const CardMembersMenu = forwardRef<HTMLDivElement, CardMembersMenuProps>(({ onClose, onMemberClick, onMemberRemove, entryId, boardId, cardId, headless = false }, ref) => {
    const params = useParams();
    const boardID = boardId ?? params.boardId ?? "";
    const cardID = cardId ?? params.cardId ?? "";
    const cardActions = useCardActionRegistry();
    const removeMember = useCardMembersStore((state) => state.removeMemberFromCard);
    const [searchInput, setSearchInput] = useState("");

    const handleAddMember = (userID: string) => {
        if (!boardID || !cardID) return;
        // console.log("Adding member with ID:", userID, "to card:", cardID, "on board:", boardID);
        cardActions.addMemberToCard(boardID, cardID, userID);
    }
    const handleRemoveMember = (userID: string) => {
        if (!boardID || !cardID) return;
        // console.log("Removing member with ID:", userID, "from card:", cardID, "on board:", boardID);
        removeMember(boardID, cardID, userID);
    }

    const boardMembersIds = useBoardMembersStore(useShallow((state) => state.membersIdsByBoardId[boardID] ?? []));
    const cardMembersIdsFromCard = useCardMembersStore(useShallow((state) => state.getUserIDsByCardID(cardID) ?? []));
    const entryMembersIds = useChecklistStore((state) => {
        if (!entryId) return EMPTY_USER_IDS;
        return state.EntryMembersIdsByEntryId[entryId] ?? EMPTY_USER_IDS;
    });

    const isBoardMember = (userID: string) => boardMembersIds.includes(userID);


    const cardMembersIds = entryId ? entryMembersIds : cardMembersIdsFromCard;

    let resolvedBoardMembersIds = boardMembersIds.filter(id => !cardMembersIds.includes(id));

    const resolvedBoardMembersMenuItems = resolvedBoardMembersIds.map(userID => ({
        id: userID,
        disabled: false
    } as UserItem));

    const cardMembersMenuItems = cardMembersIds.map(userID => ({
        id: userID,
        disabled: isBoardMember(userID) ? false : true,
        disabledTooltipText: "This user is not a member of the board"
    } as UserItem));


    if (searchInput.trim() !== "") {
        const lowerSearchInput = searchInput.toLowerCase();
        resolvedBoardMembersIds = resolvedBoardMembersIds.filter(userID => {
            const user: User | undefined = useUserStore.getState().usersById[userID] as User | undefined;
            if (!user) return false;
            return user.Name.toLowerCase().includes(lowerSearchInput) || user?.Email?.toLowerCase().includes(lowerSearchInput);
        });
    }

    const input = () => {
        return (
            <div className=" py-2 text-gray-500">
                <CustomInput className={"h-[35px] mb-0"}
                    onInputChange={(inputRef) => {
                        inputRef?.current && setSearchInput(inputRef.current.value)
                    }} />
            </div>
        )
    }

    const toIdsHeader = entryId ? "Entry Members" : "Card Members";

    const menuItems: MenuItemExtended[] = [
        { id: "searchUser", label: "Search Members", kind: "custom", customElement: input },
        { id: "boardMembersH", label: "Board Members", kind: "header", style: { ...headerStyle, display: resolvedBoardMembersIds.length > 0 ? 'block' : 'none' } },
        {
            id: "boardMembers", label: "Board Members", kind: "custom", customElement: () =>
                userListRenderer({
                    userItems: resolvedBoardMembersMenuItems,
                    userIDs: resolvedBoardMembersIds,
                    onClick: onMemberClick ? (userID) => onMemberClick(userID) : (userID) => handleAddMember(userID), showXMark: false
                })

        },
        { id: "cardMembersH", label: toIdsHeader, kind: "header", style: { ...headerStyle, display: cardMembersIds.length > 0 ? 'block' : 'none' } },
        {
            id: "cardMembers", label: toIdsHeader, kind: "custom", customElement: () =>
                userListRenderer({
                    userItems: cardMembersMenuItems,
                    userIDs: cardMembersIds,
                    onClick: (userID) => console.log("Clicked user with ID:", userID),
                    showXMark: true, onRemoveClick: onMemberRemove ? (userID) => onMemberRemove(userID) : (userID) => handleRemoveMember(userID)
                })
        },


    ]
    const content = (
        <>
            <div className="relative w-full h-full mb-3" />
            <DropDown items={menuItems} onClick={onClose} />
        </>
    );

    if (headless) {
        return <div style={{ paddingTop: "10px", paddingInline: PADDING_X }}>{content}</div>;
    }

    const Title = entryId ? "Add to entry" : "Add to card";

    const requestKeys: AsyncRequestKey[] = entryId ? ["checklist:entry:member:add", "checklist:entry:member:remove"] : ["card:member:add", "card:member:remove"];

    return (
        <>
            <ActionMenuWrapper Title={Title}
                requestGroups={[{
                    requestKey: requestKeys,
                    minLoadingMs: 0,
                    maxErrorMs: 3000,
                    minSuccessMs: 1000,
                    show: ["loading", "error", "success"]
                }]}
                onClose={onClose}
                width={300}
                style={{ paddingTop: "10px", paddingInline: PADDING_X }}
                titleStyle={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "14px", fontWeight: 600 }}>
                {content}
            </ActionMenuWrapper>

        </>
    )
});

type UserListRendererProps = {
    userItems?: UserItem[];
    userIDs: string[] | (() => string[]);
    onClick?: (userID: string) => void;
    rowClassName?: string;
    showXMark?: boolean;
    onRemoveClick?: (userID: string) => void;
}
const userListRenderer = ({ userIDs, onClick, rowClassName, showXMark, onRemoveClick, userItems }: UserListRendererProps) => {
    const resolvedUserIDs = typeof userIDs === "function" ? userIDs() : userIDs;
    return (
        <>
            {resolvedUserIDs.length > 0 && !userItems && <div className="flex flex-col gap-2 w-full mt-1">
                {resolvedUserIDs.map((userID) => (
                    <UserRowRendererAdv key={userID} userID={userID}
                        onClick={() => onClick?.(userID)} className={rowClassName} showXMark={showXMark}
                        onRemoveClick={() => onRemoveClick?.(userID)} />
                ))}
            </div>
            }
            {userItems && userItems.length > 0 && <div className="flex flex-col gap-2 w-full mt-1">
                {userItems.map((userItem) => (
                    <UserRowRendererAdv key={userItem.id} userID={userItem.id}
                        onClick={() => onClick?.(userItem.id)} className={rowClassName} showXMark={showXMark} disabled={userItem.disabled} disabledTooltipText={userItem.disabledTooltipText}
                        onRemoveClick={() => onRemoveClick?.(userItem.id)} />
                ))}
            </div>
            }
        </>
    );
};


type UserRowRendererProps = {
    userID: string;
    onClick?: () => void;
    className?: string;
    showXMark?: boolean;
    onRemoveClick?: () => void;
    disabled?: boolean;
    disabledTooltipText?: string;
}

export const UserRowRenderer = ({ userID, onClick, className, disabled }: UserRowRendererProps) => {
    const user = useUserStore((state) => state.usersById[userID]);
    if (!user) return null;
    return (
        <div className={`flex cursor-pointer items-center gap-2 ${className}`} onClick={onClick}>
            <UserAvatar user={user} />
            <span className="text-sm text-gray-300">{user.Name}</span>
        </div>
    )
}
export const UserRowRendererAdv = ({ userID, onClick, className, showXMark, onRemoveClick, cardId, disabled, disabledTooltipText }: UserRowRendererProps & { cardId?: string }) => {
    const user: User | undefined = useUserStore((state) => state.usersById[userID]) as User | undefined;
    if (!user) return null;
    const isDisabled = Boolean(disabled);
    const tooltipText = isDisabled ? disabledTooltipText : undefined;

    return (

        < div
            style={{ width: `calc(100% + ${PADDING_X} * 2)`, marginLeft: `-${PADDING_X}` }}
            onClick={isDisabled ? undefined : onClick}
            title={tooltipText}
            aria-disabled={isDisabled}
            className={` 
                flex flex-row  border-s-2 border-[rgba(0,0,0,0)] items-center gap-2  py-2 transition-all
                     ${!isDisabled ? "hover:bg-neutral-700 hover:border-opacity-100 hover:border-[rgba(102,157,241,1)] cursor-pointer" : "opacity-50 cursor-not-allowed"}
                     `}>
            <div className="flex flex-row items-center w-full justify-between " style={{ paddingInline: PADDING_X }}>
                <div className="flex flex-row  gap-3 items-center">
                    <UserAvatar user={user} />
                    <div className="flex flex-col">
                        <span className="text-sm text-gray-300">{user.Name}</span>
                        <span className="text-xs text-gray-500">{user?.Email}</span>
                    </div>
                </div>
                {showXMark && <XMarkIcon className={` flex justify-end 
                 h-6 p-1 aspect-square rounded-lg
                 ${!isDisabled ? "text-gray-500 hover:bg-white/20 hover:text-white transition-all" : "opacity-50 cursor-not-allowed"}
                 `} onClick={isDisabled ? undefined : onRemoveClick} />}
            </div>
        </div>

    )
}

