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
                <div className="h-1.5 rounded-full bg-neutral-500/30 w-full" >
                    <div className="h-1.5 rounded-full bg-neutral-400 transition-all" style={{ width: `${doneEntriesPercentage}%` }}></div>
                </div>
            </div>
        </div>
    )
}
