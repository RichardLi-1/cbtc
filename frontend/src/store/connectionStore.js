import { create } from 'zustand';
const untested = { health: 'untested', error: null };
export const useConnectionStore = create((set) => ({
    mockMode: false,
    endpoints: {
        topology: untested,
        state: untested,
        commands: untested,
    },
    setMockMode: (mockMode) => set({ mockMode }),
    report: (ep, health, error = null) => set((s) => ({ endpoints: { ...s.endpoints, [ep]: { health, error } } })),
    dismissError: (ep) => set((s) => ({
        endpoints: { ...s.endpoints, [ep]: { ...s.endpoints[ep], error: null } },
    })),
}));
