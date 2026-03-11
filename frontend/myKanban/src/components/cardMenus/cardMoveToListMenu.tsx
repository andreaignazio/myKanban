import { useBoardDetailStore } from "@/stores/boardDetailStore"
import type { List } from "@/stores/types"

import type { MenuItemExtended } from "@/types/uiTypes"
import { forwardRef, useEffect, useRef, useState } from "react"
import { CustomInput, type CustomInputHandle } from "../menuElements/CustomInput"
import { useUserStore } from "@/stores/userStore"
import { DropDown } from "../menuElements/DropDown"
import { CommonMenuWrapper } from "../menuElements/menuWrapper"
import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry"
import { LabeledButtonPresetBSubmit } from "../buttons/labeledButton"

type CardMoveToListMenuProps = {
    boardID: string;
    listId: string;
    cardId: string;
    onClose: () => void;
}


const PADDING = 2

export const CardMoveToListMenu = forwardRef<HTMLDivElement, CardMoveToListMenuProps>(({ boardID, listId, cardId, onClose }, ref) => {

    const [lists, setLists] = useState<List[]>([])
    const [visibleLists, setVisibleLists] = useState<List[]>(lists);
    const [currentSearch, setCurrentSearch] = useState("");
    const [activeListId, setActiveListId] = useState("");
    const cardActions = useCardActionRegistry();
    const moveCardToBoard = cardActions.moveCardToBoard;

    const getListsForBoard = useBoardDetailStore((state) => state.getListsForBoard)


    useEffect(() => {
        getListsForBoard(boardID).then((lists) => {
            setLists(lists);
            setVisibleLists(lists);
        })
    }, [boardID, getListsForBoard])

    const menuItemsLists: MenuItemExtended[] = visibleLists.map((list) => ({
        id: list.ID,
        label: list.Title,
        kind: "standard"
    }))

    const searchInputRef = useRef<CustomInputHandle>(null);
    useEffect(() => {

        const handleSearch = () => {
            if (!lists) return;
            const searchTerm = currentSearch.trim().toLowerCase();
            const filteredLists = lists.filter((list) => list.Title.toLowerCase().includes(searchTerm));
            setVisibleLists(filteredLists);
        }
        handleSearch();
    }, [lists, currentSearch]);

    const handleMove = async () => {

        const sourceBoardId = boardID;
        const sourceListId = listId;
        const targetBoardId = boardID;
        const targetListId = activeListId;


        let insertAtEnd = true;



        try {
            await moveCardToBoard(boardID, cardId, sourceListId, targetBoardId, targetListId, null, insertAtEnd, false)

            onClose();
        }
        catch (error) {
            // console.error("Error moving card: ", error);
        }
    }

    return (
        <CommonMenuWrapper Title="Move to list..." >
            <div className={`flex flex-col justify-start gap-0 w-[300px] max-h-[400px] py-${PADDING} px-0`}>
                <div className="flex mt-2 w-full items-center justify-center text-neutral-300 text-sm px-2"> Move to list...</div>
                <div className={`w-full px-${PADDING}`}>
                    <CustomInput
                        value={currentSearch}
                        onInputChange={(input) => setCurrentSearch(input?.current?.value ?? "")}
                        placeholder="Search lists..." className="w-full mt-4 mb-3 max-w-72 h-9" ref={searchInputRef}

                    />
                </div>
                <div className="max-h-300 overflow-auto scrollbar-hidden">
                    <DropDown items={menuItemsLists} activeMenuItem={activeListId}
                        onClick={(item) => setActiveListId(item)} />
                </div>
                <div className={`w-full px-${PADDING}`}>
                    <LabeledButtonPresetBSubmit
                        label="Move" onClick={handleMove} disabled={!activeListId} className="w-full mt-4" />
                </div>
            </div>
        </CommonMenuWrapper>
    )

}
)

