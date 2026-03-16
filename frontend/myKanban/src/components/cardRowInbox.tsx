import { useCardsStore } from "@/stores/cardsStore"
import { CardRowCoverWrapper } from "./cardRowElements/CardRowCoverWrapper"
import { useUserInboxStore } from "@/stores/userInboxStore"
import type { CardRowMode } from "./CardRow"
import { CardRowTitle } from "./cardRowElements/CardRowTitle"
import { Mirrors } from "./cardRowElements/CardMirrorsField"
import { useCardRootBoardContext } from "@/hooks/useCardRootBoardContext"
import { useParams } from "react-router-dom"


export const CardRowInbox = ({ inboxCardId }: { inboxCardId: string }) => {
    const { boardId } = useParams<{ boardId: string }>()
    const inboxCardsById = useUserInboxStore(state => state.inboxCardsById)
    const inboxCard = inboxCardsById[inboxCardId]
    if (!inboxCard) return null

    const cardID = inboxCard?.CardID
    const card = useCardsStore(state => state.cardsById[cardID!])
    //const rootListCard = listcardsById[inboxCard.RootListCardID || ""]

    const cardColor = card?.Props?.Props?.Display?.Cover?.Type === "color" ? card.Props.Props.Display.Cover.Color : undefined;
    const cardCoverURL = card?.Props?.Props?.Display?.Cover?.Type === "image" ? card.Props.Props.Display.Cover.URL : undefined;
    //const cardHasCover = !!card?.Props?.Props?.Display?.Cover;
    const hasCover = !!card?.Props?.Props?.Display?.Cover
    const coverSize = card?.Props?.Props?.Display?.Size
    const isDetailed = hasCover && coverSize === "large"

    const mode: CardRowMode = hasCover ? (isDetailed ? "detailed" : "compact") : "default"
    const rootBoardContext = useCardRootBoardContext({
        boardId,
        source: "inbox",
        rootListCardId: inboxCard.RootListCardID ?? undefined,
    })


    const done = false

    const isInboxOnlyCard = () => {
        return !inboxCard?.RootListCardID
    }


    return (
        <CardRowCoverWrapper mode={mode} cardColor={cardColor} cardCoverURL={cardCoverURL}>

            {!isInboxOnlyCard() && <Mirrors cardId={cardID!} listCardId={inboxCard.RootListCardID ?? undefined} rootBoardContext={rootBoardContext} mode={"inbox"} />}
            <div className="flex flex-col p-2 pb-2 gap-1">
                <CardRowTitle title={card?.Title || "Untitled Card"} editMode={false} done={done} />
            </div>
        </CardRowCoverWrapper >
    )
}