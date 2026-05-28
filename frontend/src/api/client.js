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
export async function injectEvent(body) {
    if (MOCK_MODE)
        return { ok: true, event: { id: `mock_${Date.now()}` } };
    return apiFetch('/events/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}
export async function cancelEvent(eventId) {
    if (MOCK_MODE)
        return;
    await apiFetch(`/events/${eventId}`, { method: 'DELETE' });
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
// ── ML training API (requires: python -m rlcbtc.cli.serve_training) ────────
export async function fetchTrainingStatus() {
    if (MOCK_MODE)
        return { status: 'idle', running: false };
    return withRetry(() => apiFetch('/ml/training/status'));
}
export async function startTraining(settings) {
    if (MOCK_MODE) {
        return { status: 'running', running: true, completed_timesteps: 0, total_timesteps: 2048 };
    }
    return apiFetch('/ml/training/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
    });
}
export async function stopTraining() {
    if (MOCK_MODE)
        return { status: 'stopped', running: false };
    return apiFetch('/ml/training/stop', { method: 'POST' });
}
export async function fetchDispatchPolicy() {
    if (MOCK_MODE) {
        return { path: 'mock', exists: false, size_bytes: 0 };
    }
    return apiFetch('/ml/dispatch/policy');
}
export async function fetchDispatchComparison() {
    if (MOCK_MODE)
        throw new Error('mock mode');
    return apiFetch('/ml/dispatch/comparison');
}
export async function runDispatchCompare(body) {
    if (MOCK_MODE) {
        return {
            seed: 42,
            episodes: 5,
            policy_path: 'mock',
            rule_based: {
                delay_mean_sec: 36,
                delay_p95_sec: 78,
                headway_std_mean_sec: 1933,
                unsafe_action_rate: 0.19,
                episodes: 5,
            },
            ppo: {
                delay_mean_sec: 32,
                delay_p95_sec: 70,
                headway_std_mean_sec: 1800,
                unsafe_action_rate: 0.15,
                episodes: 5,
            },
            delta_pct: { delay_mean_sec_pct_vs_rule: 11.1 },
        };
    }
    return apiFetch('/ml/dispatch/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
    });
}
