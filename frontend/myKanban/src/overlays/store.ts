import { create } from 'zustand';

type OverlayState = {
    openId: string | null
    open: (id: string) => void
    close: () => void
    getOpenId: () => string | null
}


export const useOverlayStore = create<OverlayState>((set, get) => ({
    openId: null,
    open: (id) => set({ openId: id }),
    close: () => set({ openId: null }),
    getOpenId: () => {
        return get().openId
    }
}))
