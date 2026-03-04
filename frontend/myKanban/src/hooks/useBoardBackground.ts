import { getClassNamesForColorToken } from "@/domain/colorTokens";
import { useBoardsStore } from "@/stores/boardsStore";
import type { Board } from "@/stores/types";
import { useShallow } from "zustand/shallow";

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

    return {
        boardBackground,
        backgroundType,
        backgroundImageUrl,
        backgroundColorToken,
        backgroundColorClassName,
        resolvedBackgroundUrl,
    };
}
