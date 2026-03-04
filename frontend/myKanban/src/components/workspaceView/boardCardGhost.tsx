type BoardCardGhostProps = {
    backgroundClassName?: string;
    backgroundImageUrl?: string;
    className?: string;
};

const columnCards = [3, 2, 3];

export function BoardCardGhost({
    backgroundClassName = "bg-[#157fbc]",
    backgroundImageUrl,
    className = "",
}: BoardCardGhostProps) {
    const hasBackgroundImage = !!backgroundImageUrl?.trim();

    return (
        <div
            className={`relative w-full h-[120px] overflow-hidden rounded-lg text-slate-100 shadow-md shadow-black/20 ${hasBackgroundImage ? "bg-cover bg-center bg-no-repeat" : backgroundClassName} ${className}`}
            style={hasBackgroundImage ? { backgroundImage: `url(${backgroundImageUrl})` } : undefined}
            aria-hidden="true"
        >
            <div className="h-full w-full px-2 grid grid-cols-3 pb-2 pt-2 gap-2">
                {columnCards.map((cardsCount, columnIdx) => (
                    <div
                        key={`ghost-col-${columnIdx}`}
                        className="h-fit rounded-[3px] bg-white/85 p-1.5 flex flex-col gap-1"
                    >
                        <div className="h-1.2 w-4/5 rounded-sm bg-neutral-300" />
                        {Array.from({ length: cardsCount }).map((_, cardIdx) => (
                            <div
                                key={`ghost-card-${columnIdx}-${cardIdx}`}
                                className="rounded-[2px] bg-neutral-200 p-1"
                            >
                                <div className="h-1.5 w-11/12 rounded-sm bg-neutral-300" />
                                <div className="mt-1 h-1.5 w-8/12 rounded-sm bg-neutral-300" />
                            </div>
                        ))}
                        <div className="mt-auto h-1.5 w-2/5 rounded-sm bg-neutral-300" />
                    </div>
                ))}
            </div>
        </div>
    );
}