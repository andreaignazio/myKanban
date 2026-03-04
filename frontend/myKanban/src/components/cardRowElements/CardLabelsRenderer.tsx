import type { BoardLabel } from "@/stores/types";

type CardLabelsRendererProps = {

    cardLabels: BoardLabel[];
    className?: string;
    classNameLabelItem?: string;
}

export const CardLabelsRenderer = ({ cardLabels, className, classNameLabelItem }: CardLabelsRendererProps) => {

    return (
        <div className={`w-full grid grid-cols-5 gap-1 ps-3 pr-6 pt-2 pb-1 ${className || ""}`}>

            {cardLabels.map((label) => {
                if (!label) return null
                return (
                    <span key={label.ID} className={`col-span-1 ${classNameLabelItem || ""}`}>
                        <div
                            style={{ backgroundColor: label.Color || "#000000" }}
                            className="rounded-xl h-[8px] bg-black"></div>
                    </span>
                )
            })}
        </div>
    )
}