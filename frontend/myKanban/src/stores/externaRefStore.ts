import { create } from "zustand";
import type { ExternalRootRef } from "./types";

type ExternalRefState = {
    rootsByRootId: Record<string, ExternalRootRef>
    mergeExternalRootRefs: (patch: Record<string, ExternalRootRef>) => void
}

export const useExternalRefStore = create<ExternalRefState>((set) => ({

    rootsByRootId: {},
    mergeExternalRootRefs: (patch) => {
        // console.log("Merging external root refs with patch:", patch)
        set((state) => {
            return {
                rootsByRootId: {
                    ...state.rootsByRootId,
                    ...patch
                }
            }
        })


    }
}))
