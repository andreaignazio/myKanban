import { create } from "zustand";
import axios from "axios";

import type { AsyncRequestBaseKey, AsyncRequestKey } from "./asyncRequestTypes";

// --- default error mapper ---
// Maps technical Axios errors to human-readable UI messages.
// Used as fallback when no per-request mapError is provided.
function defaultErrorMapper(err: Error): string {
    if (axios.isAxiosError(err)) {
        switch (err.response?.status) {
            case 400: return "Invalid request";
            case 401: return "Session expired, please sign in again";
            case 403: return "You don't have permission to perform this action";
            case 404: return "Resource not found";
            case 409: return "Conflict: the resource has already been modified";
            case 422: return "The request data is invalid";
            case 429: return "Too many requests, please slow down";
            case 500: return "Server error, please try again later";
            case 503: return "Service unavailable, please try again later";
            default: return "Something went wrong";
        }
    }
    return "An unexpected error occurred";
}

// --- private timer registry (outside Zustand state — no re-renders) ---
const _timers = new Map<string, ReturnType<typeof setTimeout>>();

function _clearTimer(key: string) {
    const t = _timers.get(key);
    if (t) { clearTimeout(t); _timers.delete(key); }
}

function _scheduleReset(key: AsyncRequestKey, delayMs: number, reset: (key: AsyncRequestKey) => void) {
    _clearTimer(key);
    const t = setTimeout(() => { reset(key as AsyncRequestKey); _timers.delete(key); }, delayMs);
    _timers.set(key, t);
}

/**
 * Builds a namespaced async request key from multiple parts.
 * The first part must be a registered AsyncRequestBaseKey.
 * Use this in multi-instance components to avoid key collisions.
 *
 * @example
 * const key = useAsyncKey("board:member:edit:role", boardID, userID)
 * // → "board:member:edit:role:boardID:userID"
 */
export function useAsyncKey(base: AsyncRequestBaseKey, ...rest: string[]): AsyncRequestKey {
    return rest.length > 0 ? `${base}:${rest.join(":")}` : base;
}

// --- types ---
export type AsyncRequestState = {
    isLoading: boolean;
    isSuccessful: boolean | null;
    errorMessage: string | null;
    updatedAt: number | null;
};

export const initialAsyncRequestState: AsyncRequestState = {
    isLoading: false,
    isSuccessful: null,
    errorMessage: null,
    updatedAt: null,
};

export type ExecuteOptions<T = void> = {
    onSuccess?: (result: T) => void;
    /** Called with the original Error before mapping — useful for logging. */
    onError?: (error: Error) => void;
    /**
     * Per-request error mapper. Return a string to override the default message,
     * or null/undefined to fall through to the global defaultErrorMapper.
     */
    mapError?: (err: Error) => string | null | undefined;
    /** If set, resets state to idle after this many ms on success */
    successResetDelayMs?: number;
    /** If set, resets state to idle after this many ms on error */
    errorResetDelayMs?: number;
};

type AsyncRequestStore = {
    requestsByKey: Partial<Record<AsyncRequestKey, AsyncRequestState>>;
    startRequest: (requestKey: AsyncRequestKey) => void;
    markSuccess: (requestKey: AsyncRequestKey) => void;
    markError: (requestKey: AsyncRequestKey, errorMessage?: string) => void;
    resetRequest: (requestKey: AsyncRequestKey) => void;
    getRequestState: (requestKey: AsyncRequestKey) => AsyncRequestState;
    execute: <T = void>(
        requestKey: AsyncRequestKey,
        fn: () => Promise<T>,
        options?: ExecuteOptions<T>
    ) => Promise<T | null>;
};

export const useAsyncRequestStore = create<AsyncRequestStore>((set, get) => ({
    requestsByKey: {},

    startRequest: (requestKey) => {
        set((state) => ({
            requestsByKey: {
                ...state.requestsByKey,
                [requestKey]: {
                    isLoading: true,
                    isSuccessful: null,
                    errorMessage: null,
                    updatedAt: Date.now(),
                },
            },
        }));
    },

    markSuccess: (requestKey) => {
        set((state) => ({
            requestsByKey: {
                ...state.requestsByKey,
                [requestKey]: {
                    isLoading: false,
                    isSuccessful: true,
                    errorMessage: null,
                    updatedAt: Date.now(),
                },
            },
        }));
    },

    markError: (requestKey, errorMessage) => {
        set((state) => ({
            requestsByKey: {
                ...state.requestsByKey,
                [requestKey]: {
                    isLoading: false,
                    isSuccessful: false,
                    errorMessage: errorMessage ?? null,
                    updatedAt: Date.now(),
                },
            },
        }));
    },

    resetRequest: (requestKey) => {
        _clearTimer(requestKey);
        set((state) => {
            const next = { ...state.requestsByKey };
            delete next[requestKey];
            return { requestsByKey: next };
        });
    },

    getRequestState: (requestKey) => {
        return get().requestsByKey[requestKey] ?? { ...initialAsyncRequestState };
    },

    execute: async <T = void>(
        requestKey: AsyncRequestKey,
        fn: () => Promise<T>,
        options?: ExecuteOptions<T>
    ): Promise<T | null> => {
        _clearTimer(requestKey); // cancel any pending auto-reset
        get().startRequest(requestKey);
        try {
            const result = await fn();
            get().markSuccess(requestKey);
            options?.onSuccess?.(result);
            const successDelay = options?.successResetDelayMs ?? 3000;
            _scheduleReset(requestKey, successDelay, get().resetRequest);
            return result;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            const mappedMessage = options?.mapError?.(error) ?? defaultErrorMapper(error);
            get().markError(requestKey, mappedMessage);
            options?.onError?.(error); // receives the original error, not the mapped message
            const errorDelay = options?.errorResetDelayMs ?? 3000;
            _scheduleReset(requestKey, errorDelay, get().resetRequest);
            return null;
        }
    },
}));
