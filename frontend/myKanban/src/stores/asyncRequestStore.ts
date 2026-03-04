import { create } from "zustand";

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

type AsyncRequestStore = {
    requestsByKey: Record<string, AsyncRequestState>;
    startRequest: (requestKey: string) => void;
    markSuccess: (requestKey: string) => void;
    markError: (requestKey: string, errorMessage?: string) => void;
    resetRequest: (requestKey: string) => void;
    getRequestState: (requestKey: string) => AsyncRequestState;
};

const getDefaultState = (): AsyncRequestState => ({
    ...initialAsyncRequestState,
});

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
        set((state) => {
            const next = { ...state.requestsByKey };
            delete next[requestKey];
            return { requestsByKey: next };
        });
    },

    getRequestState: (requestKey) => {
        return get().requestsByKey[requestKey] ?? getDefaultState();
    },
}));
