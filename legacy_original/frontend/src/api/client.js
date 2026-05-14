import { MOCK_TOPOLOGY, tickMockRuntime } from '../mock/mockData';
import { useConnectionStore } from '../store/connectionStore';
const BASE = ''; // proxied by Vite dev server
const TIMEOUT_MS = 4000;
const RETRY_DELAYS = [500, 1000, 2000]; // ms between retries
// Set to true to skip real API calls entirely
export let MOCK_MODE = false;
export function enableMockMode() {
    MOCK_MODE = true;
    useConnectionStore.getState().setMockMode(true);
}
export function disableMockMode() {
    MOCK_MODE = false;
    useConnectionStore.getState().setMockMode(false);
}
// ── Fetch helpers ──────────────────────────────────────────────────────────
async function apiFetch(path, opts) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(`${BASE}${path}`, { ...opts, signal: ctrl.signal });
        if (!res.ok)
            throw new Error(`HTTP ${res.status} ${res.statusText}`);
        return (await res.json());
    }
    finally {
        clearTimeout(timer);
    }
}
async function withRetry(fn) {
    let last;
    for (let i = 0; i <= RETRY_DELAYS.length; i++) {
        try {
            return await fn();
        }
        catch (err) {
            last = err;
            if (i < RETRY_DELAYS.length) {
                await new Promise(r => setTimeout(r, RETRY_DELAYS[i]));
            }
        }
    }
    throw last;
}
// ── Public API ─────────────────────────────────────────────────────────────
export async function fetchTopology() {
    if (MOCK_MODE)
        return MOCK_TOPOLOGY;
    try {
        const result = await withRetry(() => apiFetch('/topology'));
        useConnectionStore.getState().report('topology', 'ok');
        return result;
    }
    catch (err) {
        useConnectionStore.getState().report('topology', 'error', String(err));
        console.warn('[api] /topology failed, falling back to mock');
        enableMockMode();
        return MOCK_TOPOLOGY;
    }
}
let _lastMockTick = performance.now();
export async function fetchState() {
    if (MOCK_MODE) {
        const now = performance.now();
        const dt = now - _lastMockTick;
        _lastMockTick = now;
        return tickMockRuntime(dt);
    }
    try {
        const result = await withRetry(() => apiFetch('/state'));
        useConnectionStore.getState().report('state', 'ok');
        return result;
    }
    catch (err) {
        useConnectionStore.getState().report('state', 'error', String(err));
        throw err;
    }
}
export async function commandSwitch(switchId, state) {
    if (MOCK_MODE)
        return;
    try {
        await apiFetch(`/commands/switch/${switchId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state }),
        });
        useConnectionStore.getState().report('commands', 'ok');
    }
    catch (err) {
        useConnectionStore.getState().report('commands', 'error', String(err));
        throw err;
    }
}
export async function commandSignal(signalId, aspect) {
    if (MOCK_MODE)
        return;
    try {
        await apiFetch(`/commands/signal/${signalId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aspect }),
        });
        useConnectionStore.getState().report('commands', 'ok');
    }
    catch (err) {
        useConnectionStore.getState().report('commands', 'error', String(err));
        throw err;
    }
}
