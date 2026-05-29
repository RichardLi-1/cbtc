import { create } from 'zustand';
import posthog from 'posthog-js';
import { fetchTrainingStatus, startTraining, stopTraining } from '../api/client';
const PERSIST_KEY = 'cbtc.ml.persist_checkpoints';
const RESUME_KEY = 'cbtc.ml.resume_training';
const CONFIG_KEY = 'cbtc.ml.training_config';
function readBool(key, fallback) {
    try {
        const v = localStorage.getItem(key);
        if (v === null)
            return fallback;
        return v === 'true';
    }
    catch {
        return fallback;
    }
}
function writeBool(key, value) {
    try {
        localStorage.setItem(key, value ? 'true' : 'false');
    }
    catch {
        /* ignore */
    }
}
export const useTrainingStore = create((set, get) => {
    let timer = null;
    return {
        persistCheckpoints: readBool(PERSIST_KEY, true),
        resumeTraining: readBool(RESUME_KEY, false),
        configName: localStorage.getItem(CONFIG_KEY) ?? 'ppo_smoke.yaml',
        status: null,
        error: null,
        polling: false,
        setPersistCheckpoints: (v) => {
            writeBool(PERSIST_KEY, v);
            set({ persistCheckpoints: v });
        },
        setResumeTraining: (v) => {
            writeBool(RESUME_KEY, v);
            set({ resumeTraining: v });
        },
        setConfigName: (v) => {
            try {
                localStorage.setItem(CONFIG_KEY, v);
            }
            catch {
                /* ignore */
            }
            set({ configName: v });
        },
        refreshStatus: async () => {
            try {
                const status = await fetchTrainingStatus();
                set({ status, error: status.error ?? null });
            }
            catch (err) {
                set({ error: String(err) });
            }
        },
        start: async () => {
            const { persistCheckpoints, resumeTraining, configName } = get();
            set({ error: null });
            try {
                const status = await startTraining({
                    config: configName,
                    persist_checkpoints: persistCheckpoints,
                    resume: resumeTraining,
                });
                set({ status });
                posthog.capture('training_started', { config: configName, persist_checkpoints: persistCheckpoints, resume: resumeTraining });
                get().startPolling();
            }
            catch (err) {
                posthog.captureException(err instanceof Error ? err : new Error(String(err)), { config: configName });
                set({ error: String(err) });
            }
        },
        stop: async () => {
            try {
                const status = await stopTraining();
                set({ status });
                posthog.capture('training_stopped');
            }
            catch (err) {
                posthog.captureException(err instanceof Error ? err : new Error(String(err)));
                set({ error: String(err) });
            }
        },
        startPolling: () => {
            if (timer)
                return;
            set({ polling: true });
            const tick = () => {
                void get().refreshStatus();
            };
            tick();
            timer = setInterval(tick, 1500);
        },
        stopPolling: () => {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            set({ polling: false });
        },
    };
});
