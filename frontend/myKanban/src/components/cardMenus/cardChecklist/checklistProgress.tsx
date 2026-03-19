import { ProgressBar } from "@/components/common/progressBar";
import { PADDING_L } from "../../modals/CardDetailMenu";

type ChecklistProgressProps = {
    doneEntriesPercentage: number;
}

export const ChecklistProgress = ({ doneEntriesPercentage }: ChecklistProgressProps) => {
    return (
        <div className="relative flex flex-row items-center my-2 gap-2">
            <div className="absolute text-xs font-inter text-neutral-400 transition-all">
                {doneEntriesPercentage}%
            </div>
            <div className="w-full" style={{ paddingLeft: PADDING_L }}>
                <ProgressBar percentage={doneEntriesPercentage} barClassName={doneEntriesPercentage === 100 ? "!bg-lime-500" : undefined} />
            </div>
        </div>
    )
}
