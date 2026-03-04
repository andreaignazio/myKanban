import { useEffect, useMemo, useRef, useState } from "react";

type UseActivityRenderWindowOptions = {
    maxRendered?: number;
    shiftSize?: number;
    topThreshold?: number;
    bottomThreshold?: number;
    onScrollEnd?: () => void;
    resetKey?: string | number;
};

export function useActivityRenderWindow(
    auditIds: string[],
    {
        maxRendered = 50,
        shiftSize = 15,
        topThreshold = 0.15,
        bottomThreshold = 0.85,
        onScrollEnd,
        resetKey,
    }: UseActivityRenderWindowOptions = {}
) {
    const rootRef = useRef<HTMLDivElement>(null);
    const scrollHostRef = useRef<HTMLElement | null>(null);
    const isAdjustingRef = useRef(false);
    const reachedBottomRef = useRef(false);
    const prevResetKeyRef = useRef<string | number | undefined>(resetKey);

    const [windowStart, setWindowStart] = useState(0);
    const [windowEnd, setWindowEnd] = useState(Math.min(auditIds.length, maxRendered));

    const totalCount = auditIds.length;

    useEffect(() => {
        const didContextChange = prevResetKeyRef.current !== resetKey;
        if (didContextChange) {
            prevResetKeyRef.current = resetKey;
            const nextEnd = Math.min(totalCount, maxRendered);
            if (windowStart !== 0) setWindowStart(0);
            if (windowEnd !== nextEnd) setWindowEnd(nextEnd);
            return;
        }

        if (totalCount === 0) {
            if (windowStart !== 0) setWindowStart(0);
            if (windowEnd !== 0) setWindowEnd(0);
            return;
        }

        let nextStart = windowStart;
        let nextEnd = windowEnd;
        const firstWindowEnd = Math.min(totalCount, maxRendered);

        if (nextEnd === 0) {
            nextStart = 0;
            nextEnd = firstWindowEnd;
        }

        if (nextEnd > totalCount) {
            nextEnd = totalCount;
        }

        if (nextStart > nextEnd - 1) {
            nextStart = Math.max(0, nextEnd - 1);
        }

        if (nextEnd - nextStart > maxRendered) {
            nextStart = Math.max(0, nextEnd - maxRendered);
        }

        if (nextStart !== windowStart) setWindowStart(nextStart);
        if (nextEnd !== windowEnd) setWindowEnd(nextEnd);
    }, [maxRendered, resetKey, totalCount, windowEnd, windowStart]);

    const displayedAuditIds = useMemo(() => {
        return auditIds.slice(windowStart, windowEnd);
    }, [auditIds, windowStart, windowEnd]);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        let current: HTMLElement | null = root.parentElement;
        let scrollHost: HTMLElement | null = null;

        while (current) {
            const style = window.getComputedStyle(current);
            const canScroll =
                (style.overflowY === "auto" || style.overflowY === "scroll") &&
                current.scrollHeight > current.clientHeight;

            if (canScroll) {
                scrollHost = current;
                break;
            }
            current = current.parentElement;
        }

        if (!scrollHost) return;
        scrollHostRef.current = scrollHost;

        const onScroll = () => {
            const host = scrollHostRef.current;
            if (!host || isAdjustingRef.current) return;

            const maxScroll = host.scrollHeight - host.clientHeight;
            if (maxScroll <= 0) return;

            const progress = host.scrollTop / maxScroll;

            if (progress > bottomThreshold && !reachedBottomRef.current) {
                reachedBottomRef.current = true;
                onScrollEnd?.();
            }

            if (progress <= bottomThreshold) {
                reachedBottomRef.current = false;
            }

            if (progress < topThreshold && windowStart > 0) {
                isAdjustingRef.current = true;
                const prevHeight = host.scrollHeight;
                const shift = Math.min(shiftSize, windowStart);
                const nextStart = windowStart - shift;
                const nextEnd = Math.min(totalCount, nextStart + maxRendered);

                setWindowStart(nextStart);
                setWindowEnd(nextEnd);

                requestAnimationFrame(() => {
                    const newHeight = host.scrollHeight;
                    host.scrollTop = Math.max(0, host.scrollTop + (newHeight - prevHeight));
                    isAdjustingRef.current = false;
                });
                return;
            }

            if (progress > bottomThreshold && windowEnd < totalCount) {
                isAdjustingRef.current = true;
                const prevHeight = host.scrollHeight;
                const nextEnd = Math.min(totalCount, windowEnd + shiftSize);
                const nextStart = Math.max(0, nextEnd - maxRendered);

                setWindowStart(nextStart);
                setWindowEnd(nextEnd);

                requestAnimationFrame(() => {
                    const newHeight = host.scrollHeight;
                    host.scrollTop = Math.max(0, host.scrollTop + (newHeight - prevHeight));
                    isAdjustingRef.current = false;
                });
            }
        };

        scrollHost.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            scrollHost.removeEventListener("scroll", onScroll);
        };
    }, [bottomThreshold, maxRendered, onScrollEnd, shiftSize, topThreshold, totalCount, windowEnd, windowStart]);

    return {
        rootRef,
        displayedAuditIds,
    };
}