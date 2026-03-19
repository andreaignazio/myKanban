import { useCardMembersStore } from "@/stores/CardMembersStore"
import { useCardsStore } from "@/stores/cardsStore"
import { useChecklistStore } from "@/stores/checklistStore"
import { useUserWatchStore } from "@/stores/userWatchStore"
import { EyeIcon, SquareCheckBig, TextAlignStartIcon } from "lucide-react"
import { useParams } from "react-router-dom"
import { useShallow } from "zustand/shallow"


export const CardRowFields = ({ cardID, textColor }: { cardID: string; textColor?: string }) => {
    const boardId = useParams().boardId as string
    const card = useCardsStore(state => state.cardsById[cardID])
    const watchedIds = useUserWatchStore(state => state.cardWatchIds)

    const cardIsWatched = watchedIds.includes(cardID)
    const cardHasDescription = !!card?.Description?.toString().trim()

    const cardHasDates = !!card?.StartDate || !!card?.EndDate

    const checklistsByCardId = useChecklistStore(useShallow(state => state.checklistIdsByCardId[boardId] ?? {}))
    const hasChecklists = checklistsByCardId[cardID]?.length > 0

    const cardMembers = useCardMembersStore(useShallow((state) => state.getUserIDsByCardID(cardID) ?? []))
    const hasMembers = cardMembers.length > 0
    const hasFieldsToDisplay = cardIsWatched || hasMembers || hasChecklists || cardHasDescription || cardHasDates

    const iconItemClass = "inline-flex shrink-0 items-center justify-center"

    const rowStyle = { minHeight: CARD_ROW_FIELDS_HEIGHT }
    const itemStyle = { minHeight: CARD_ROW_FIELDS_HEIGHT }

    return (

        <div
            className={`w-full flex flex-row flex-wrap items-center gap-x-1 gap-y-1
             transition-all duration-200 ease-in-out min-h-0
             ps-3 pe-3 pb-2 pt-1
              ${!hasFieldsToDisplay
                    ? " !py-0 !pb-0 !pt-0 !h-0 !max-h-0 opacity-0 overflow-hidden "
                    : "opacity-100 h-auto max-h-28 overflow-visible"}`}
            style={{ ...rowStyle, minHeight: hasFieldsToDisplay ? CARD_ROW_FIELDS_HEIGHT : 0, color: textColor }}
        >

            {cardIsWatched && (
                <span className={iconItemClass} style={itemStyle}>
                    <EyeIcon className="w-4 h-4 text-inherit" />
                </span>
            )}
            {cardHasDescription && (
                <span className={iconItemClass} style={itemStyle}>
                    <TextAlignStartIcon className="w-4 h-4 text-inherit" />
                </span>
            )}
            {<CardDatesField card={card} rowHeight={CARD_ROW_FIELDS_HEIGHT} cardHasDates={cardHasDates} />}

            {cardChecklistProgress(cardID, CARD_ROW_FIELDS_HEIGHT, hasChecklists)}
            {CardMembers(cardMembers, CARD_ROW_FIELDS_HEIGHT)}
        </div>
    )
}

const CARD_ROW_FIELDS_HEIGHT = 28
import { UserAvatar } from "@/components/badges/UserAvatar"
import { useUserStore } from "@/stores/userStore"
import { CardDatesField } from "./CardDatesField"



const cardChecklistProgress = (cardID: string, rowHeight: number, hasChecklists: boolean) => {

    const boardId = useParams().boardId as string
    const getDoneEntriesCountForCard = useChecklistStore(state => state.getDoneEntriesCountForCard)


    const doneData = getDoneEntriesCountForCard(boardId, cardID)
    const checklistProgress = doneData ? `${doneData[0]}/${doneData[1]}` : null
    const isAllDone = doneData ? doneData[0] === doneData[1] : false
    if (!hasChecklists) return null
    return (
        <span className={`
            ${isAllDone ? "bg-lime-400/80 rounded px-2 text-zinc-900" : "bg-transparent"}
            flex shrink-0 items-center whitespace-nowrap text-xs text-inherit`}

            style={{ height: rowHeight }}>
            <SquareCheckBig className="w-3 h-3 inline-block me-1" />
            {checklistProgress}
        </span>
    )

}

const CardMembers = (usersIds: string[], rowHeight: number) => {
    const getUserById = useUserStore((state) => state.getUserByID);
    const isMoreThanTwoMembers = usersIds.length > 2
    const displayedUserIds = isMoreThanTwoMembers ? usersIds.slice(0, 2) : usersIds

    if (usersIds.length === 0) return null
    return (
        <div className="ms-auto flex shrink-0 items-center -space-x-3">
            {displayedUserIds.map((userId, index) => {

                const user = getUserById(userId);
                return (
                    <UserAvatar key={userId} user={user} size={rowHeight} className={`z-[${index}]`} />
                )
            })}
            {isMoreThanTwoMembers && (
                <div
                    className="z-50 flex items-center justify-center rounded-full bg-neutral-500"
                    style={{ width: rowHeight, height: rowHeight }}
                >
                    +{usersIds.length - 2}
                </div>
            )}


        </div>)
}

