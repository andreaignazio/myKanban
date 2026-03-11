import { getClassNamesForColorToken, gradientColorTokens } from "@/domain/colorTokens";
import type { Board } from "@/stores/types";
import { ImageColorRenderer } from "./ImageColorRenderer";


type BoardCoverRendererProps = {
    board: Board
    className?: string
    overrideClassName?: boolean
}

function getStableIndexFromString(value: string, length: number): number {
    if (length <= 0) return 0;

    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }

    return hash % length;
}

export const BoardCoverRenderer = ({ board, className, overrideClassName }: BoardCoverRendererProps) => {

    //const board = useBoardsStore((state) => state.boardsById[boardID]);
    const backgroundType = board?.Props?.Background?.Type
    const bgImage = backgroundType === "image" ? board?.Props?.Background?.Image?.Url : null;
    let bgColor = backgroundType === "color" ? board?.Props?.Background?.Color?.Token : null;
    if (bgColor) {
        bgColor = getClassNamesForColorToken(bgColor)
    }
    const gradientIndex = getStableIndexFromString(board.ID, gradientColorTokens.length);
    const fallbackGradient = gradientColorTokens[gradientIndex];
    const finalClassName = overrideClassName ? className || "" : `flex h-full w-16 rounded-md overflow-hidden ${className || ""}`
    return (

        <ImageColorRenderer
            className={finalClassName}
            bgImage={bgImage ?? undefined}
            bgColor={bgColor ?? undefined}
            fallbackGradient={fallbackGradient}
            backgroundType={backgroundType ?? undefined}
        />
    )
}