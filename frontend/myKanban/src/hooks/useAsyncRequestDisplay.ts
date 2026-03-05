import { useEffect, useRef, useState } from "react";
import { useAsyncRequestGroup } from "@/hooks/useAsyncRequestGroup";
import type { AsyncRequestKey } from "@/stores/asyncRequestTypes";

const MIN_LOADING_MS = 600;
const MIN_SUCCESS_MS = 1200;
const MAX_ERROR_MS = 4000;

type UseAsyncRequestDisplayOptions = {
    minLoadingMs?: number;
    minSuccessMs?: number;
    maxErrorMs?: number;
}

export function useAsyncRequestDisplay(
    requestKey: AsyncRequestKey | AsyncRequestKey[],
    { minLoadingMs = MIN_LOADING_MS, minSuccessMs = MIN_SUCCESS_MS, maxErrorMs = MAX_ERROR_MS }: UseAsyncRequestDisplayOptions = {}
) {
    const { isLoading, isSuccessful, errorMessage } = useAsyncRequestGroup(requestKey ?? []);

    const [displayLoading, setDisplayLoading] = useState(isLoading);
    const loadingStartRef = useRef<number | null>(null);

    const [displaySuccess, setDisplaySuccess] = useState(false);
    const [displayError, setDisplayError] = useState(false);

    useEffect(() => {
        if (isLoading) {
            loadingStartRef.current = Date.now();
            setDisplayLoading(true);
        } else {
            const elapsed = loadingStartRef.current != null ? Date.now() - loadingStartRef.current : minLoadingMs;
            const remaining = minLoadingMs - elapsed;
            if (remaining > 0) {
                const timer = setTimeout(() => setDisplayLoading(false), remaining);
                return () => clearTimeout(timer);
            } else {
                setDisplayLoading(false);
            }
        }
    }, [isLoading, minLoadingMs]);

    useEffect(() => {
        if (!displayLoading && isSuccessful) {
            setDisplaySuccess(true);
            const timer = setTimeout(() => setDisplaySuccess(false), minSuccessMs);
            return () => clearTimeout(timer);
        }
    }, [displayLoading, isSuccessful, minSuccessMs]);

    useEffect(() => {
        if (!displayLoading && !!errorMessage) {
            setDisplayError(true);
            const timer = setTimeout(() => setDisplayError(false), maxErrorMs);
            return () => clearTimeout(timer);
        } else {
            setDisplayError(false);
        }
    }, [displayLoading, errorMessage, maxErrorMs]);

    return { displayLoading, displaySuccess, displayError, errorMessage };
}
