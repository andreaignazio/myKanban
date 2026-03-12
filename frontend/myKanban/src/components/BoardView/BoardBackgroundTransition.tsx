import { useSmoothBoardBackground, type BoardBackgroundSpec } from "@/hooks/useSmoothBoardBackground"

export type { BoardBackgroundSpec }

export function BoardBackgroundLayer({ spec }: { spec: BoardBackgroundSpec }) {
    if (spec.kind === "color") {
        return (
            <div
                className={`absolute inset-0 ${spec.className}`.trim()}
                style={!spec.className ? { backgroundColor: spec.colorToken ?? "#0f172a" } : undefined}
            />
        )
    }

    return (
        <div
            className="absolute inset-0 bg-center bg-cover"
            style={{ backgroundImage: `url('${spec.url}')` }}
        />
    )
}

export function BoardBackgroundTransition({ target }: { target: BoardBackgroundSpec }) {
    const { activeBackground, incomingBackground, incomingVisible } = useSmoothBoardBackground(target, {
        transitionMs: 320,
        frameDelayMs: 16,
    })

    return (
        <div className="absolute inset-0 -z-10 pointer-events-none">
            <div className="absolute inset-0 opacity-100 transition-opacity duration-300 ease-out">
                <BoardBackgroundLayer spec={activeBackground} />
            </div>
            {incomingBackground && (
                <div className={`absolute inset-0 transition-opacity duration-300 ease-out ${incomingVisible ? "opacity-100" : "opacity-0"}`}>
                    <BoardBackgroundLayer spec={incomingBackground} />
                </div>
            )}
        </div>
    )
}
