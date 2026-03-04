import { ChevronRight } from "lucide-react";

type ShowMoreArrowProps = {
    setShowMore: React.Dispatch<React.SetStateAction<boolean>>;
    showMore: boolean;
    show?: boolean;
}

export const ShowMoreArrow = ({ setShowMore, showMore, show = true }: ShowMoreArrowProps) => {

    return (
        <div onClick={() => setShowMore((prev) => !prev)}
            style={{ right: showMore ? "-60px" : "-40px" }}
            className={`
            ${show ? "opacity-60" : "opacity-0"}
            rounded-full w-12 aspect-square flex items-center justify-center
             bg-neutral-900/20 hover:bg-neutral-500/40  hover:opacity-100 transition-colors cursor-pointer
            absolute top-[200px]  `}>
            <ChevronRight className={`text-neutral-300 ${showMore ? "rotate-180" : ""}`} size={28}></ChevronRight>

        </div>
    )
}