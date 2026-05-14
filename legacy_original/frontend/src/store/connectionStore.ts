import { create } from 'zustand'

export type EndpointHealth = 'untested' | 'ok' | 'error'

export interface EndpointInfo {
  health: EndpointHealth
  error: string | null
}

export type EndpointKey = 'topology' | 'state' | 'commands'

interface ConnectionStore {
  mockMode: boolean
  endpoints: Record<EndpointKey, EndpointInfo>
  setMockMode: (v: boolean) => void
  report: (ep: EndpointKey, health: EndpointHealth, error?: string | null) => void
  dismissError: (ep: EndpointKey) => void
}

const untested: EndpointInfo = { health: 'untested', error: null }

export const useConnectionStore = create<ConnectionStore>((set) => ({
  mockMode: false,
  endpoints: {
    topology: untested,
    state: untested,
    commands: untested,
  },
  setMockMode: (mockMode) => set({ mockMode }),
  report: (ep, health, error = null) =>
    set((s) => ({ endpoints: { ...s.endpoints, [ep]: { health, error } } })),
  dismissError: (ep) =>
    set((s) => ({
      endpoints: { ...s.endpoints, [ep]: { ...s.endpoints[ep], error: null } },
    })),
}))
