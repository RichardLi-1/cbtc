import { create } from 'zustand';
export const useUiStore = create((set) => ({
    infoOpen: false,
    setInfoOpen: (v) => set({ infoOpen: v }),
}));
