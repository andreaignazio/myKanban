import { useAuditStore } from "@/stores/auditStore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useFetchFeedsForBoard(boardID?: string) {
    const fetchAuditsForBoard = useAuditStore((state) => state.fetchAuditsForBoard);
    const resetCursorForBoard = useAuditStore((state) => state.resetCursorForBoard);
    const pageInfo = useAuditStore((state) => boardID ? (state.cursorByBoardId[boardID] ?? null) : null);
    const inFlightRef = useRef(false);
    const initializedBoardRef = useRef<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const hasMore = useMemo(() => {
        if (!boardID) return false;
        if (!pageInfo) return true;
        return pageInfo.HasMore;
    }, [boardID, pageInfo]);

    const loadMore = useCallback(async () => {
        if (!boardID || inFlightRef.current) return;

        if (pageInfo && !pageInfo.HasMore) return;

        inFlightRef.current = true;
        setIsLoading(true);
        try {
            await fetchAuditsForBoard(boardID);
        } finally {
            setIsLoading(false);
            inFlightRef.current = false;
        }
    }, [boardID, fetchAuditsForBoard, pageInfo]);

    useEffect(() => {
        if (boardID) {
            if (initializedBoardRef.current === boardID) return;
            initializedBoardRef.current = boardID;
            resetCursorForBoard(boardID);

            inFlightRef.current = true;
            setIsLoading(true);
            void fetchAuditsForBoard(boardID).finally(() => {
                setIsLoading(false);
                inFlightRef.current = false;
            });
        }
    }, [boardID, fetchAuditsForBoard, resetCursorForBoard]);

    return {
        loadMore,
        hasMore,
        isLoading,
    };
}
