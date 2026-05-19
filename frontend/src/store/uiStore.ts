import { create } from 'zustand'

interface UiState {
  infoOpen: boolean
  setInfoOpen: (v: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  infoOpen: false,
  setInfoOpen: (v) => set({ infoOpen: v }),
}))
