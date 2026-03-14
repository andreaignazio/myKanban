
type UnreadCounterProps = {
    count: number;
    className?: string;
}

export const UnreadCounter = ({ count, className }: UnreadCounterProps) => {

    return (
        <>
            {count > 0 && (
                <div className={`absolute -top-1 -right-1 bg-amber-600 text-white
                 rounded-full w-4 h-4 flex items-center justify-center text-[10px] ${className}`}>
                    {count > 9 ? "9+" : count}
                </div>
            )}
        </>
    )
}