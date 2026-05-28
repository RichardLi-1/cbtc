import { create } from 'zustand';
import { fetchState, commandSwitch, commandSignal } from '../api/client';
const POLL_INTERVAL_MS = 200;
const DEFAULT_PROFILE = {
    id: 'toronto_rocket',
    name: 'Toronto Rocket (TR)',
    max_speed: 22,
    accel: 1.3,
    decel: 1.5,
    length: 138,
    mass: 240,
};
const DEFAULT_CONFIG = {
    rolling_stock_pct: 100,
    active_profile: 'toronto_rocket',
    profiles: [DEFAULT_PROFILE],
    headway_target: 120,
    injected_events: [],
};
export const useRuntimeStore = create((set) => {
    let _pollTimer = null;
    let _staleTimer = null;
    const STALE_AFTER_MS = 2000;
    function resetStaleTimer() {
        if (_staleTimer)
            clearTimeout(_staleTimer);
        _staleTimer = setTimeout(() => set({ stale: true }), STALE_AFTER_MS);
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
            if (_pollTimer)
                return;
            const poll = async () => {
                try {
                    const runtime = await fetchState();
                    set({ runtime, stale: false });
                    resetStaleTimer();
                }
                catch {
                    // stale timer will fire if this keeps failing
                }
            };
            poll();
            _pollTimer = setInterval(poll, POLL_INTERVAL_MS);
        },
        stopPolling: () => {
            if (_pollTimer) {
                clearInterval(_pollTimer);
                _pollTimer = null;
            }
            if (_staleTimer) {
                clearTimeout(_staleTimer);
                _staleTimer = null;
            }
        },
        setHovered: (hovered) => set({ hovered }),
        clearCommandError: () => set({ commandError: null }),
        sendSwitchCommand: async (id, state) => {
            try {
                await commandSwitch(id, state);
                set({ commandError: null });
            }
            catch (err) {
                set({ commandError: `Switch ${id}: ${String(err)}` });
            }
        },
        sendSignalCommand: async (id, aspect) => {
            try {
                await commandSignal(id, aspect);
                set({ commandError: null });
            }
            catch (err) {
                set({ commandError: `Signal ${id}: ${String(err)}` });
            }
        },
        toggleSafeZones: () => set(s => ({ showSafeZones: !s.showSafeZones })),
        toggleLabels: () => set(s => ({ showLabels: !s.showLabels })),
        updateConfig: (patch) => set(s => ({ config: { ...s.config, ...patch } })),
    };
});
