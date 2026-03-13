
type UnreadCounterProps = {
    count: number;
}

export const UnreadCounter = ({ count }: UnreadCounterProps) => {

    return (
        <>
            {count > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {count > 9 ? "9+" : count}
                </div>
            )}
        </>
    )
}