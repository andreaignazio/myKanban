import { useShallow } from "zustand/react/shallow";
import { useAsyncRequestStore, initialAsyncRequestState, type AsyncRequestState } from "@/stores/asyncRequestStore";
import { ASYNC_REQUEST_BASE_KEYS, type AsyncRequestKey } from "@/stores/asyncRequestTypes";

const BASE_KEYS_SET = new Set<string>(ASYNC_REQUEST_BASE_KEYS);

/**
 * Picks the most recently updated state among the given keys.
 *
 * Key matching rules:
 * - Base key (registered in ASYNC_REQUEST_BASE_KEYS) → prefix match: reacts to
 *   the base key itself and any "base:instanceID" composite key in the store
 * - Composite key (not in the base set) → exact match only
 *
 * Returns initialAsyncRequestState if no keys are active.
 */
function pickActiveState(
    requestsByKey: Partial<Record<AsyncRequestKey, AsyncRequestState>>,
    keys: AsyncRequestKey[]
): AsyncRequestState {
    let winner: AsyncRequestState | null = null;

    const consider = (s: AsyncRequestState | undefined) => {
        if (!s) return;
        if (!winner || (s.updatedAt ?? 0) > (winner.updatedAt ?? 0)) {
            winner = s;
        }
    };

    for (const key of keys) {
        const isBaseKey = BASE_KEYS_SET.has(key);
        if (isBaseKey) {
            // prefix match: react to "key" itself and any "key:*" composite
            const prefix = `${key}:`;
            for (const [storeKey, s] of Object.entries(requestsByKey)) {
                if (storeKey === key || storeKey.startsWith(prefix)) {
                    // Skip if a more specific base key also claims this store key.
                    // e.g. "card:mirror" should not match "card:mirror:fetch:{id}"
                    // because "card:mirror:fetch" is its own registered base key.
                    const claimedByMoreSpecific = Array.from(BASE_KEYS_SET).some(
                        (other) =>
                            other !== key &&
                            other.startsWith(prefix) &&
                            (storeKey === other || storeKey.startsWith(`${other}:`))
                    );
                    if (!claimedByMoreSpecific) consider(s);
                }
            }
        } else {
            // exact match
            consider(requestsByKey[key]);
        }
    }

    return winner ?? { ...initialAsyncRequestState };
}

/**
 * Subscribes to one or more async request keys and returns the state of the
 * most recently updated one (last-active-wins).
 *
 * Re-renders only when isLoading / isSuccessful / errorMessage / updatedAt
 * actually change (shallow equality via useShallow).
 *
 * @example
 * // single key
 * const { isLoading, errorMessage } = useAsyncRequestGroup("board:member:edit:role")
 *
 * // multiple keys — shows state of whichever action ran last
 * const { isLoading, errorMessage } = useAsyncRequestGroup([
 *     "board:member:edit:role",
 *     "board:member:delete",
 * ])
 */
export function useAsyncRequestGroup(keys: AsyncRequestKey | AsyncRequestKey[]) {
    const normalizedKeys = Array.isArray(keys) ? keys : [keys];

    return useAsyncRequestStore(
        useShallow((s) => pickActiveState(s.requestsByKey, normalizedKeys))
    );
}
