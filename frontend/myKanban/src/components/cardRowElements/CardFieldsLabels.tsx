import { useLabelsStore } from "@/stores/labelsStore";
import { useParams } from "react-router-dom";
const EMPTY_IDS: string[] = []

type CardFieldsLabelsProps = {
    hasLabels?: boolean;
    cardID: string;
    className?: string;
    boardID?: string;
    mode?: "board" | "inbox" | "inbox-mirror"
}


export const CardFieldsLabels = ({ hasLabels, cardID, className, boardID, mode = "board" }: CardFieldsLabelsProps) => {
    const boardId = boardID ?? (useParams().boardId as string)
    const cardLabelsIds = useLabelsStore((state) => {
        if (!cardID) return EMPTY_IDS;
        return state.cardLabelsIdsByCardIdAndBoardId[boardId]?.[cardID] ?? EMPTY_IDS;
    });
    const labelsById = useLabelsStore((state) => state.BoardLabelsById)
    //if (!cardLabelsIds || cardLabelsIds.length === 0) return null
    if (!hasLabels || mode === "inbox" || mode === "inbox-mirror") return null

    return (
        <div className={`grid grid-cols-5 gap-1 ps-3 pr-6 pt-2 pb-1 ${className || ""}`}>

            {cardLabelsIds.map((item) => {
                const label = labelsById[item]
                if (!label) return null
                return (
                    <span key={item} className="col-span-1">
                        <div
                            style={{ backgroundColor: label.Color || "#000000" }}
                            className="rounded-xl h-[8px] bg-black"></div>
                    </span>
                )
            })}
        </div>
    )
}
