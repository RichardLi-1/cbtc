import { create } from 'zustand'
import { applyHighContrast } from '../constants/colors'

const DEV_KEY = 'cbtc-dev-mode'
const CONTRAST_KEY = 'cbtc-high-contrast'

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeFlag(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? '1' : '0')
  } catch { /* ignore */ }
}

const initialHighContrast = readFlag(CONTRAST_KEY)
applyHighContrast(initialHighContrast)

interface UiState {
  infoOpen: boolean
  devMode: boolean
  highContrast: boolean
  setInfoOpen: (v: boolean) => void
  setDevMode: (v: boolean) => void
  toggleDevMode: () => void
  setHighContrast: (v: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  infoOpen: false,
  devMode: readFlag(DEV_KEY),
  highContrast: initialHighContrast,
  setInfoOpen: (v) => set({ infoOpen: v }),
  setDevMode: (devMode) => {
    writeFlag(DEV_KEY, devMode)
    set({ devMode })
  },
  toggleDevMode: () =>
    set((s) => {
      const devMode = !s.devMode
      writeFlag(DEV_KEY, devMode)
      return { devMode }
    }),
  setHighContrast: (highContrast) => {
    writeFlag(CONTRAST_KEY, highContrast)
    applyHighContrast(highContrast)
    set({ highContrast })
  },
}))
