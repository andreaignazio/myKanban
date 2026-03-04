import { api } from "@/api/api";
import { create } from "zustand";
import type { UnsplashPhoto, UnsplashSearchResponse } from "@/stores/types";

type MediaStore = {
    mediaCache: UnsplashPhoto[];
    setMediaCache: (id: string, url: string) => void;
    fetchMedia: (q: string, perPage?: number, page?: number) => Promise<void>;
    // photosById: Record<string, UnsplashPhoto>;
    //photosIds: string[];
}

let activeSearchController: AbortController | null = null;

export const useMediaStore = create<MediaStore>((set, get) => ({
    mediaCache: [],
    setMediaCache: (id, url) => set((state) => ({})),

    fetchMedia: async (q: string, perPage = 12, page = 1) => {
        activeSearchController?.abort();
        const controller = new AbortController();
        activeSearchController = controller;

        try {
            const baseURL = "/media/providers/unsplash/search" + encodeURIComponent(`?query=${q}&perPage=${perPage}&page=${page}`);
            // console.log("Fetching media with URL:", baseURL);
            const response = await api.get("/media/providers/unsplash/search", {
                params: { query: q, perPage, page },
                signal: controller.signal,
            })
            const data = response.data as UnsplashSearchResponse;
            const incomingResults = data.Results ?? [];

            set((state) => {
                const merged = page > 1
                    ? [...state.mediaCache, ...incomingResults]
                    : incomingResults;

                const seen = new Set<string>();
                const deduped = merged.filter((photo) => {
                    const key = photo.ID || photo.RegularURL;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });

                return { mediaCache: deduped };
            });

        } catch (error) {
            const err = error as { code?: string; name?: string };
            if (err.code === "ERR_CANCELED" || err.name === "CanceledError" || err.name === "AbortError") {
                return;
            }
            // console.error("Error fetching media:", error);
        } finally {
            if (activeSearchController === controller) {
                activeSearchController = null;
            }
        }
    },
    getUrlsFromCache: () => {
        const cache = get().mediaCache;
        // console.log("Getting URLs from media cache:", cache);
        if (!cache || cache.length === 0) {
            // console.log("Media cache is empty");
            return [];
        }
        return get().mediaCache.map((photo) => photo.RegularURL);
    }

}))
