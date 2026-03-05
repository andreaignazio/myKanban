import {
    useAsyncRequestStore,
    initialAsyncRequestState,
    type ExecuteOptions,
} from "@/stores/asyncRequestStore";
import type { AsyncRequestKey } from "@/stores/asyncRequestTypes";

/**
 * Hook for reading and triggering an async request tracked in asyncRequestStore.
 *
 * @example
 * const { isLoading, isSuccessful, errorMessage, execute } = useAsyncRequest("setBoardMemberRole")
 * await execute(() => api.patch(...))
 *
 * For multi-instance components, build a unique key with useAsyncKey:
 * const key = useAsyncKey("mirrorDetails", boardID, cardID)
 * const { isLoading, execute } = useAsyncRequest(key)
 */
export function useAsyncRequest(key: AsyncRequestKey) {
    // Subscribes only to requestsByKey[key] — re-renders only when this specific
    // key changes, not on unrelated store updates.
    const state = useAsyncRequestStore(
        (s) => s.requestsByKey[key] ?? initialAsyncRequestState
    );

    const execute = <T = void>(fn: () => Promise<T>, options?: ExecuteOptions<T>) =>
        useAsyncRequestStore.getState().execute(key, fn, options);

    const reset = () => useAsyncRequestStore.getState().resetRequest(key);

    return {
        isLoading: state.isLoading,
        isSuccessful: state.isSuccessful,
        errorMessage: state.errorMessage,
        updatedAt: state.updatedAt,
        execute,
        reset,
    };
}
