import { useAuditStore } from "@/stores/auditStore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useFetchFeedsForUser(userID?: string, workspaceID?: string) {
    const fetchAuditsForUser = useAuditStore((state) => state.fetchAuditsForUser);
    const resetCursorForUser = useAuditStore((state) => state.resetCursorForUser);
    const pageInfo = useAuditStore((state) => userID ? (state.cursorByUserId[userID] ?? null) : null);
    const inFlightRef = useRef(false);
    const initializedKeyRef = useRef<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const hasMore = useMemo(() => {
        if (!userID) return false;
        if (!pageInfo) return true;
        return pageInfo.HasMore;
    }, [pageInfo, userID]);

    const loadMore = useCallback(async () => {
        if (!userID || !workspaceID || inFlightRef.current) return;

        if (pageInfo && !pageInfo.HasMore) return;

        inFlightRef.current = true;
        setIsLoading(true);
        try {
            await fetchAuditsForUser(userID, workspaceID);
        } finally {
            setIsLoading(false);
            inFlightRef.current = false;
        }
    }, [fetchAuditsForUser, pageInfo, userID, workspaceID]);

    useEffect(() => {
        if (userID && workspaceID) {
            const key = `${userID}:${workspaceID}`;
            if (initializedKeyRef.current === key) return;
            initializedKeyRef.current = key;
            resetCursorForUser(userID);

            inFlightRef.current = true;
            setIsLoading(true);
            void fetchAuditsForUser(userID, workspaceID).finally(() => {
                setIsLoading(false);
                inFlightRef.current = false;
            });
        }
    }, [fetchAuditsForUser, resetCursorForUser, userID, workspaceID]);

    return {
        loadMore,
        hasMore,
        isLoading,
    };

}
