type ProgressBarProps = {
    percentage: number;
    containerClassName?: string;
    barClassName?: string;
}


export const ProgressBar = ({ percentage, containerClassName, barClassName }: ProgressBarProps) => {

    return (
        <div className={`h-1.5 rounded-full bg-neutral-500/30 w-full ${containerClassName}`} >
            <div className={`h-1.5 rounded-full bg-neutral-400 transition-all ${barClassName}`} style={{ width: `${percentage}%` }}></div>
        </div>
    )

}