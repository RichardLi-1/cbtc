import type { Topology, RuntimeState, SwitchState, SignalAspect } from '../types/domain'
import { MOCK_TOPOLOGY, tickMockRuntime } from '../mock/mockData'

const BASE = ''   // proxied by Vite dev server
const TIMEOUT_MS = 4000
const RETRY_DELAYS = [500, 1000, 2000]   // ms between retries

// Set to true to skip real API calls entirely
export let MOCK_MODE = false

export function enableMockMode() { MOCK_MODE = true }
export function disableMockMode() { MOCK_MODE = false }

// ── Fetch helpers ──────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE}${path}`, { ...opts, signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown
  for (let i = 0; i <= RETRY_DELAYS.length; i++) {
    try {
      return await fn()
    } catch (err) {
      last = err
      if (i < RETRY_DELAYS.length) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[i]))
      }
    }
  }
  throw last
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function fetchTopology(): Promise<Topology> {
  if (MOCK_MODE) return MOCK_TOPOLOGY
  try {
    return await withRetry(() => apiFetch<Topology>('/topology'))
  } catch {
    console.warn('[api] /topology failed, falling back to mock')
    enableMockMode()
    return MOCK_TOPOLOGY
  }
}

let _lastMockTick = performance.now()

export async function fetchState(): Promise<RuntimeState> {
  if (MOCK_MODE) {
    const now = performance.now()
    const dt = now - _lastMockTick
    _lastMockTick = now
    return tickMockRuntime(dt)
  }
  return withRetry(() => apiFetch<RuntimeState>('/state'))
}

export async function commandSwitch(switchId: string, state: SwitchState): Promise<void> {
  if (MOCK_MODE) return
  await apiFetch(`/commands/switch/${switchId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  })
}

export async function commandSignal(signalId: string, aspect: SignalAspect): Promise<void> {
  if (MOCK_MODE) return
  await apiFetch(`/commands/signal/${signalId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aspect }),
  })
}
