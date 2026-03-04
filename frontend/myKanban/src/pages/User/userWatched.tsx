import { useUserWatched } from "@/hooks/useUserWatched";
import { UserPagesWrapper } from "./userPagesWrapper"
import type { Board, BoardWatch, Card, CardWatch, List, ListWatch } from "@/stores/types";
import { useListsStore } from "@/stores/listsStore";
import { useCardsStore } from "@/stores/cardsStore";
import { useBoardsStore } from "@/stores/boardsStore";
import { useUserWatchStore } from "@/stores/userWatchStore";
import { useLookUpInterface, type Lookup } from "@/hooks/useLookUpInterface";
import { Eye } from "lucide-react";


export const UserWatchedPage = () => {

    const { listWatchIds, cardWatchIds, boardWatchIds } = useUserWatched();

    const { getLookupForType } = useLookUpInterface()

    const listLookup = getLookupForType("list")
    const cardLookup = getLookupForType("card")
    const boardLookup = getLookupForType("board")


    return (
        <UserPagesWrapper Title="Watched">
            <div className="flex flex-row w-full gap-2 mt-12">
                <WatchedSection title="Lists" itemIds={listWatchIds} lookup={listLookup} />
                <WatchedSection title="Cards" itemIds={cardWatchIds} lookup={cardLookup} />
                <WatchedSection title="Boards" itemIds={boardWatchIds} lookup={boardLookup} />
            </div>
        </UserPagesWrapper>
    )
}

type WatchedSectionProps = {
    title: string;
    itemIds: string[];
    lookup?: Lookup<any>;
}

const WatchedSection = ({ title, itemIds, lookup }: WatchedSectionProps) => {
    return (
        <div className="flex flex-col gap-2 w-[550px] rounded-md p-4 bg-slate-500/10">
            <div className="text-sm font-bold">{title}</div>
            <div className="flex flex-col gap-1">

                {itemIds.map((id) => (
                    <WatchedItem key={id} id={id} lookup={lookup} />
                ))}
            </div>
        </div>
    )
}

type WatchedItemProps = {
    id: string;
    lookup?: Lookup<any>;
}

const WatchedItem = ({ id, lookup }: WatchedItemProps) => {

    const isActive = lookup?.isActive(id) ?? false
    const handleToggleActive = async () => {
        console.log("Toggling active for id:", id, "current active state:", isActive)
        if (lookup?.patchActive) {
            await lookup.patchActive(id, !isActive)
        }
    }

    return (
        <div onClickCapture={handleToggleActive}
            className="flex flex-row bg-slate-500/10 rounded-md p-2 pr-4 gap-2 items-center
        hover:bg-slate-500/20 transition-colors duration-200 ease-in-out cursor-pointer">

            <Eye className={`${isActive ? "text-neutral-400" : "text-neutral-500"} p-1
            bg-slate-500/0 rounded-md  "`}
                size={24} />
            <div className="text-sm text-neutral-500">
                {lookup ? lookup.getTitle(id) ?? id : id}
            </div>
        </div>
    )
}
