import { create } from 'zustand'

const DEV_KEY = 'cbtc-dev-mode'

function readDevMode(): boolean {
  try {
    return localStorage.getItem(DEV_KEY) === '1'
  } catch {
    return false
  }
}

interface UiState {
  infoOpen: boolean
  devMode: boolean
  setInfoOpen: (v: boolean) => void
  setDevMode: (v: boolean) => void
  toggleDevMode: () => void
}

export const useUiStore = create<UiState>((set) => ({
  infoOpen: false,
  devMode: readDevMode(),
  setInfoOpen: (v) => set({ infoOpen: v }),
  setDevMode: (devMode) => {
    try {
      localStorage.setItem(DEV_KEY, devMode ? '1' : '0')
    } catch { /* ignore */ }
    set({ devMode })
  },
  toggleDevMode: () =>
    set((s) => {
      const devMode = !s.devMode
      try {
        localStorage.setItem(DEV_KEY, devMode ? '1' : '0')
      } catch { /* ignore */ }
      return { devMode }
    }),
}))
