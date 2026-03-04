import { useAuditStore } from "@/stores/auditStore";
import { useAuthStore } from "@/stores/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useFetchFeedsForMe() {
    const fetchAuditsForMe = useAuditStore((state) => state.fetchAuditsForMe);
    const resetCursorForUser = useAuditStore((state) => state.resetCursorForUser);
    const meUserID = useAuthStore((state) => state.userID);
    const pageInfo = useAuditStore((state) => meUserID ? (state.cursorByUserId[meUserID] ?? null) : null);
    const inFlightRef = useRef(false);
    const initializedUserRef = useRef<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const hasMore = useMemo(() => {
        if (!meUserID) return false;
        if (!pageInfo) return true;
        return pageInfo.HasMore;
    }, [meUserID, pageInfo]);

    const loadMore = useCallback(async () => {
        if (!meUserID || inFlightRef.current) return;

        if (pageInfo && !pageInfo.HasMore) return;

        inFlightRef.current = true;
        setIsLoading(true);
        try {
            await fetchAuditsForMe(meUserID);
        } finally {
            setIsLoading(false);
            inFlightRef.current = false;
        }
    }, [fetchAuditsForMe, meUserID, pageInfo]);

    useEffect(() => {
        if (meUserID) {
            if (initializedUserRef.current === meUserID) return;
            initializedUserRef.current = meUserID;
            resetCursorForUser(meUserID);

            inFlightRef.current = true;
            setIsLoading(true);
            void fetchAuditsForMe(meUserID).finally(() => {
                setIsLoading(false);
                inFlightRef.current = false;
            });
        }
    }, [fetchAuditsForMe, meUserID, resetCursorForUser]);

    return {
        loadMore,
        hasMore,
        isLoading,
        userId: meUserID,
    };

}
