import { create } from 'zustand'
import { useRuntimeStore } from './runtimeStore'
import type { RuntimeState } from '../types/domain'

export type EventSeverity = 'info' | 'warn' | 'error'
export type EventSource = 'system' | 'wayside' | 'driver' | 'manual'

export interface SimEvent {
  id: number
  t: number            // wall time ms
  simT: number | null  // sim timestamp if available
  source: EventSource
  severity: EventSeverity
  kind: string         // short tag e.g. 'SIG' / 'SW' / 'TRAIN' / 'EB' / 'CMD'
  message: string
}

const MAX_EVENTS = 200

interface EventsStore {
  events: SimEvent[]
  paused: boolean
  panelOpen: boolean
  injectOpen: boolean
  append: (e: Omit<SimEvent, 'id' | 't' | 'simT'>) => void
  clear: () => void
  togglePaused: () => void
  setPanelOpen: (v: boolean) => void
  setInjectOpen: (v: boolean) => void
}

let _nextId = 1

export const useEventsStore = create<EventsStore>((set, get) => ({
  events: [],
  paused: false,
  panelOpen: true,
  injectOpen: false,
  append: (e) => {
    if (get().paused) return
    const simT = useRuntimeStore.getState().runtime?.timestamp ?? null
    const ev: SimEvent = {
      id: _nextId++,
      t: Date.now(),
      simT,
      ...e,
    }
    set((s) => ({ events: [ev, ...s.events].slice(0, MAX_EVENTS) }))
  },
  clear: () => set({ events: [] }),
  togglePaused: () => set((s) => ({ paused: !s.paused })),
  setPanelOpen: (v) => set({ panelOpen: v }),
  setInjectOpen: (v) => set({ injectOpen: v }),
}))

// ── Auto-derive events from runtime state changes ──────────────────────────

let _prev: RuntimeState | null = null
let _prevStale = false
let _prevCommandError: string | null = null

useRuntimeStore.subscribe((state) => {
  const append = useEventsStore.getState().append

  // Command error edge-trigger
  if (state.commandError && state.commandError !== _prevCommandError) {
    append({ source: 'system', severity: 'error', kind: 'CMD', message: state.commandError })
  }
  _prevCommandError = state.commandError

  // Stale edge-trigger
  if (state.stale !== _prevStale) {
    append({
      source: 'system',
      severity: state.stale ? 'warn' : 'info',
      kind: 'LINK',
      message: state.stale ? 'state feed went stale' : 'state feed recovered',
    })
    _prevStale = state.stale
  }

  const cur = state.runtime
  if (!cur) return

  if (!_prev) {
    append({
      source: 'system', severity: 'info', kind: 'INIT',
      message: `runtime online — ${cur.trains.length} trains, ${cur.switches.length} switches, ${cur.signals.length} signals`,
    })
    _prev = cur
    return
  }

  // Train roster diff
  const prevIds = new Set(_prev.trains.map((t) => t.train_id))
  const curIds = new Set(cur.trains.map((t) => t.train_id))
  for (const id of curIds) if (!prevIds.has(id)) {
    append({ source: 'wayside', severity: 'info', kind: 'TRAIN', message: `${id} entered service` })
  }
  for (const id of prevIds) if (!curIds.has(id)) {
    append({ source: 'wayside', severity: 'warn', kind: 'TRAIN', message: `${id} left service` })
  }

  // Train state changes (running ↔ dwelling ↔ arriving)
  const prevTrains = new Map(_prev.trains.map((t) => [t.train_id, t]))
  for (const t of cur.trains) {
    const p = prevTrains.get(t.train_id)
    if (p && p.state !== t.state) {
      append({
        source: 'wayside', severity: 'info', kind: 'TRAIN',
        message: `${t.train_id} ${p.state} → ${t.state}`,
      })
    }
    // ATP slack edge-triggers: only fire on the crossing, not every tick.
    if (p && p.atp_slack_m != null && t.atp_slack_m != null) {
      if (p.atp_slack_m >= 0 && t.atp_slack_m < 0) {
        append({
          source: 'wayside', severity: 'error', kind: 'ATP',
          message: `${t.train_id} authority breached — slack ${t.atp_slack_m.toFixed(1)} m`,
        })
      } else if (p.atp_slack_m < 0 && t.atp_slack_m >= 0) {
        append({
          source: 'wayside', severity: 'info', kind: 'ATP',
          message: `${t.train_id} authority recovered`,
        })
      } else if (p.atp_slack_m >= 15 && t.atp_slack_m < 15) {
        append({
          source: 'wayside', severity: 'warn', kind: 'ATP',
          message: `${t.train_id} slack tightening — ${t.atp_slack_m.toFixed(1)} m`,
        })
      }
    }
  }

  // Switch state changes
  const prevSw = new Map(_prev.switches.map((s) => [s.switch_id, s.state]))
  for (const s of cur.switches) {
    const pv = prevSw.get(s.switch_id)
    if (pv && pv !== s.state) {
      append({
        source: 'wayside', severity: 'info', kind: 'SW',
        message: `${s.switch_id} ${pv} → ${s.state}`,
      })
    }
  }

  // Signal aspect changes
  const prevSig = new Map(_prev.signals.map((s) => [s.signal_id, s.aspect]))
  for (const s of cur.signals) {
    const pv = prevSig.get(s.signal_id)
    if (pv && pv !== s.aspect) {
      const sev: EventSeverity = s.aspect === 'red' ? 'warn' : 'info'
      append({
        source: 'wayside', severity: sev, kind: 'SIG',
        message: `${s.signal_id} ${pv} → ${s.aspect}`,
      })
    }
  }

  _prev = cur
})
