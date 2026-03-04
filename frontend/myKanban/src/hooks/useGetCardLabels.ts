import { useLabelsStore } from "@/stores/labelsStore";
import { useParams } from "react-router-dom";

const EMPTY_IDS: string[] = []
export function useGetCardLabels(boardID: string, cardID: string) {

    const labelsById = useLabelsStore((state) => state.BoardLabelsById)
    function getCardLabels(boardID: string, cardID: string) {
        const boardId = boardID ?? (useParams().boardId as string)
        const cardLabelsIds = useLabelsStore((state) => {
            if (!cardID) return EMPTY_IDS;
            return state.cardLabelsIdsByCardIdAndBoardId[boardId]?.[cardID] ?? EMPTY_IDS;
        });

        //console.log("Card labels ids for card", cardID, "in board", boardId, ":", cardLabelsIds)
        const cardLabels = cardLabelsIds.map((item) => labelsById[item])
        return cardLabels
    }

    const cardLabels = getCardLabels(boardID ?? "", cardID ?? "")


    return cardLabels
}