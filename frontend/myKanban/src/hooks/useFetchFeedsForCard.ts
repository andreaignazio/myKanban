import { useAuditStore } from "@/stores/auditStore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useFetchFeedsForCard(cardID: string | null, workspaceId?: string) {
    const MIN_LOADING_VISIBLE_MS = 350;
    const fetchAuditsForCard = useAuditStore((state) => state.fetchAuditsForCardPaginated);
    const cursorByCardId = useAuditStore((state) => state.cursorByCardId);
    const inFlightRef = useRef(false);
    const [isLoading, setIsLoading] = useState(false);

    const hasMore = useMemo(() => {
        if (!cardID) return false;
        const pageInfo = cursorByCardId[cardID] ?? null;
        if (!pageInfo) return true;
        return pageInfo.HasMore;
    }, [cardID, cursorByCardId]);

    const loadMore = useCallback(async () => {
        if (!cardID || inFlightRef.current) return;

        const pageInfo = cursorByCardId[cardID] ?? null;
        if (pageInfo && !pageInfo.HasMore) return;

        inFlightRef.current = true;
        const startedAt = Date.now();
        setIsLoading(true);
        try {
            await fetchAuditsForCard(cardID, workspaceId ?? undefined);
        } finally {
            const elapsed = Date.now() - startedAt;
            if (elapsed < MIN_LOADING_VISIBLE_MS) {
                await new Promise((resolve) => setTimeout(resolve, MIN_LOADING_VISIBLE_MS - elapsed));
            }
            setIsLoading(false);
            inFlightRef.current = false;
        }
    }, [cardID, workspaceId, fetchAuditsForCard, cursorByCardId]);

    useEffect(() => {
        if (cardID) {
            void loadMore();
        }
    }, [cardID, loadMore]);

    return {
        loadMore,
        hasMore,
        isLoading,
    };
}
