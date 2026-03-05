import { getClassNamesForColorToken } from "@/domain/colorTokens";
import { useBoardsStore } from "@/stores/boardsStore";
import type { Board } from "@/stores/types";
import { useShallow } from "zustand/shallow";
import { useImageAverageColor } from "./useImageAverageColor";

type UseBoardBackgroundParams = {
    boardId?: string;
    board?: Board;
    fallbackBackgroundUrl?: string;
};

const DEFAULT_FALLBACK_BACKGROUND_URL = "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1920&q=80";

export function useBoardBackground({ boardId, board, fallbackBackgroundUrl = DEFAULT_FALLBACK_BACKGROUND_URL }: UseBoardBackgroundParams = {}) {
    const boardFromStore = useBoardsStore(useShallow((state) => boardId ? state.boardsById[boardId] : undefined));
    const resolvedBoard = board ?? boardFromStore;

    const boardBackground = resolvedBoard?.Props?.Background;
    const backgroundType = boardBackground?.Type;
    const backgroundImageUrl = boardBackground?.Image?.Url;
    const backgroundColorToken = boardBackground?.Color?.Token;
    const backgroundColorClassName = backgroundColorToken ? getClassNamesForColorToken(backgroundColorToken) : "";
    const resolvedBackgroundUrl = backgroundImageUrl ?? fallbackBackgroundUrl;

    const { averageColor: imageAverageColor } = useImageAverageColor(
        backgroundType === "image" ? backgroundImageUrl : null
    );

    // Always a hex string — first hex extracted from className for color tokens, average color for images
    const colorTokenHex = backgroundColorClassName
        ? (backgroundColorClassName.match(/#([0-9a-fA-F]{6})/)?.[0] ?? null)
        : null;
    const resolvedColor: string | null =
        backgroundType === "color" ? colorTokenHex :
            backgroundType === "image" ? imageAverageColor :
                null;

    return {
        boardBackground,
        backgroundType,
        backgroundImageUrl,
        backgroundColorToken,
        backgroundColorClassName,
        resolvedBackgroundUrl,
        resolvedColor,
    };
}

export function useBoardBg() {
    return { useBoardBackground };
}