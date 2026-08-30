import { create } from 'zustand'
import type { RuntimeState, HoveredEntity, SimConfig, RollingStockProfile } from '../types/domain'
import { fetchState, commandSwitch, commandSignal, commandTrain } from '../api/client'

const POLL_INTERVAL_MS = 200

const DEFAULT_PROFILE: RollingStockProfile = {
  id: 'toronto_rocket',
  name: 'Toronto Rocket (TR)',
  max_speed: 22,
  accel: 1.3,
  decel: 1.5,
  length: 138,
  mass: 240,
}

const DEFAULT_CONFIG: SimConfig = {
  rolling_stock_pct: 100,
  active_profile: 'toronto_rocket',
  profiles: [DEFAULT_PROFILE],
  headway_target: 120,
  injected_events: [],
}

interface RuntimeStore {
  runtime: RuntimeState | null
  stale: boolean
  commandError: string | null
  hovered: HoveredEntity | null
  showSafeZones: boolean
  showLabels: boolean
  config: SimConfig

  // poll lifecycle
  startPolling: () => void
  stopPolling: () => void

  // interaction
  setHovered: (e: HoveredEntity | null) => void
  clearCommandError: () => void

  // commands
  sendSwitchCommand: (id: string, state: import('../types/domain').SwitchState) => Promise<void>
  sendSignalCommand: (id: string, aspect: import('../types/domain').SignalAspect) => Promise<void>
  sendTrainCommand: (id: string, action: import('../types/domain').DispatchAction, count?: number) => Promise<void>

  // view toggles
  toggleSafeZones: () => void
  toggleLabels: () => void

  // config
  updateConfig: (patch: Partial<SimConfig>) => void
}

function acceptState(prev: RuntimeState | null, next: RuntimeState): boolean {
  const a = prev?.sim_time_s
  const b = next.sim_time_s
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return true
  if (b + 0.25 >= a) return true
  // Real reset (sim restarted), not a second replica.
  if (b < 15 && a > 30) return true
  return false
}

export const useRuntimeStore = create<RuntimeStore>((set, get) => {
  let _pollTimer: ReturnType<typeof setInterval> | null = null
  let _staleTimer: ReturnType<typeof setTimeout> | null = null
  const STALE_AFTER_MS = 2000

  function resetStaleTimer() {
    if (_staleTimer) clearTimeout(_staleTimer)
    _staleTimer = setTimeout(() => set({ stale: true }), STALE_AFTER_MS)
  }

  return {
    runtime: null,
    stale: false,
    commandError: null,
    hovered: null,
    showSafeZones: true,
    showLabels: true,
    config: DEFAULT_CONFIG,

    startPolling: () => {
      if (_pollTimer) return
      const poll = async () => {
        try {
          const runtime = await fetchState()
          if (!acceptState(get().runtime, runtime)) return
          set({ runtime, stale: false })
          resetStaleTimer()
        } catch {
          // stale timer will fire if this keeps failing
        }
      }
      poll()
      _pollTimer = setInterval(poll, POLL_INTERVAL_MS)
    },

    stopPolling: () => {
      if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null }
      if (_staleTimer) { clearTimeout(_staleTimer); _staleTimer = null }
    },

    setHovered: (hovered) => set({ hovered }),
    clearCommandError: () => set({ commandError: null }),

    sendSwitchCommand: async (id, state) => {
      try {
        await commandSwitch(id, state)
        set({ commandError: null })
      } catch (err) {
        set({ commandError: `Switch ${id}: ${String(err)}` })
      }
    },

    sendSignalCommand: async (id, aspect) => {
      try {
        await commandSignal(id, aspect)
        set({ commandError: null })
      } catch (err) {
        set({ commandError: `Signal ${id}: ${String(err)}` })
      }
    },

    sendTrainCommand: async (id, action, count = 1) => {
      try {
        await commandTrain(id, action, count)
        set({ commandError: null })
      } catch (err) {
        set({ commandError: `Train ${id}: ${String(err)}` })
      }
    },

    toggleSafeZones: () => set(s => ({ showSafeZones: !s.showSafeZones })),
    toggleLabels: () => set(s => ({ showLabels: !s.showLabels })),

    updateConfig: (patch) => set(s => ({ config: { ...s.config, ...patch } })),
  }
})
