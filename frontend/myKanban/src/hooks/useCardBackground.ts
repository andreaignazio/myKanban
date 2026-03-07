import { useCardsStore } from "@/stores/cardsStore";
import type { Card } from "@/stores/types";

type useCardBackgroundParams = {
    cardId?: string;
    card?: Card;
    // Potentially other params in the future, like listId for list-level backgrounds
}

export function useCardBackground({ cardId, card: cardParam }: useCardBackgroundParams) {
    const card = cardParam ?? useCardsStore(state => state.cardsById[cardId ?? ""])

    const cardColor = card?.Props?.Props?.Display?.Cover?.Type === "color" ? card.Props.Props.Display.Cover.Color : undefined;
    const cardCoverURL = card?.Props?.Props?.Display?.Cover?.Type === "image" ? card.Props.Props.Display.Cover.URL : undefined;
    //const cardHasCover = !!card?.Props?.Props?.Display?.Cover;
    const hasCover = !!card?.Props?.Props?.Display?.Cover
    const coverSize = card?.Props?.Props?.Display?.Size
    const isDetailed = hasCover && coverSize === "large"

    return {
        cardColor,
        cardCoverURL,
        hasCover,
        coverSize,
        isDetailed,
    }
}
