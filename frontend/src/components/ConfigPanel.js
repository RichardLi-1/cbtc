import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Hidden config panel — toggle with Ctrl+Shift+C.
 * Manages rolling stock profiles, headway targets, and event injection.
 */
import { useEffect, useState } from 'react';
import { useRuntimeStore } from '../store/runtimeStore';
import { useTrainingStore } from '../store/trainingStore';
import { COLORS } from '../constants/colors';
import { cancelEvent, injectEvent } from '../api/client';
import { isMlEnabled } from '../config/ml';
const EVENT_KINDS = ['emergency_brake', 'door_fault', 'slow_speed', 'signal_fail', 'station_hold'];
function Row({ label, children }) {
    return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }, children: [_jsx("span", { style: { color: COLORS.PANEL_TEXT_DIM, fontSize: 11, fontFamily: 'monospace', width: 140, flexShrink: 0 }, children: label }), children] }));
}
function NumInput({ value, min, max, step, onChange }) {
    return (_jsx("input", { type: "number", value: value, min: min, max: max, step: step, onChange: e => onChange(Number(e.target.value)), style: {
            width: 70,
            background: COLORS.BUTTON_BG,
            color: COLORS.PANEL_TEXT,
            border: `1px solid ${COLORS.PANEL_BORDER}`,
            borderRadius: 3,
            padding: '2px 5px',
            fontFamily: 'monospace',
            fontSize: 11,
        } }));
}
const TRAINING_CONFIGS = ['ppo_smoke.yaml', 'ppo_baseline.yaml', 'rule_based_smoke.yaml'];
export function ConfigPanel({ open }) {
    const { config, runtime, updateConfig } = useRuntimeStore();
    const { persistCheckpoints, resumeTraining, configName, status: trainingStatus, error: trainingError, setPersistCheckpoints, setResumeTraining, setConfigName, start: startTraining, stop: stopTraining, startPolling: startTrainingPoll, stopPolling: stopTrainingPoll, refreshStatus, } = useTrainingStore();
    const [newEventKind, setNewEventKind] = useState('emergency_brake');
    const [newEventTrain, setNewEventTrain] = useState('T01');
    const [newEventSignal, setNewEventSignal] = useState('');
    const [newEventDur, setNewEventDur] = useState(30);
    const [newEventDelay, setNewEventDelay] = useState(0);
    const [newEventTsr, setNewEventTsr] = useState(25);
    const [injectError, setInjectError] = useState(null);
    const activeIncidents = runtime?.ops?.injected_events ?? [];
    useEffect(() => {
        if (!open) {
            stopTrainingPoll();
            return;
        }
        void refreshStatus();
        startTrainingPoll();
        return () => stopTrainingPoll();
    }, [open, refreshStatus, startTrainingPoll, stopTrainingPoll]);
    if (!open)
        return null;
    const trainingRunning = Boolean(trainingStatus?.running);
    const done = trainingStatus?.completed_timesteps ?? 0;
    const total = trainingStatus?.total_timesteps ?? 0;
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    const activeProfile = config.profiles.find(p => p.id === config.active_profile);
    function patchProfile(patch) {
        if (!activeProfile)
            return;
        updateConfig({
            profiles: config.profiles.map(p => p.id === activeProfile.id ? { ...p, ...patch } : p),
        });
    }
    async function addEvent() {
        setInjectError(null);
        try {
            await injectEvent({
                kind: newEventKind,
                target_train_id: newEventKind === 'signal_fail' ? undefined : newEventTrain,
                target_signal_id: newEventKind === 'signal_fail' ? newEventSignal : undefined,
                speed_limit_kph: newEventKind === 'slow_speed' ? newEventTsr : undefined,
                duration_s: newEventDur,
                starts_in_s: newEventDelay,
            });
        }
        catch (err) {
            setInjectError(String(err));
        }
    }
    async function removeEvent(id) {
        setInjectError(null);
        try {
            await cancelEvent(id);
        }
        catch (err) {
            setInjectError(String(err));
        }
    }
    const panelStyle = {
        position: 'absolute',
        top: 46,
        right: 14,
        width: 340,
        background: COLORS.PANEL_BG,
        border: `1px solid ${COLORS.PANEL_BORDER}`,
        borderRadius: 5,
        padding: '12px 16px',
        zIndex: 200,
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 70px)',
    };
    const section = (title) => (_jsx("div", { style: { color: COLORS.PANEL_TEXT, fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.06em', borderBottom: `1px solid ${COLORS.PANEL_BORDER}`, paddingBottom: 4, marginBottom: 10, marginTop: 14 }, children: title }));
    return (_jsxs("div", { style: panelStyle, children: [_jsxs("div", { style: { color: COLORS.PANEL_TEXT, fontFamily: 'monospace', fontSize: 13, marginBottom: 12 }, children: ["\u2699 SIM CONFIG ", _jsx("span", { style: { color: COLORS.PANEL_TEXT_DIM, fontSize: 10 }, children: "(Ctrl+Shift+C)" })] }), isMlEnabled() && section('RL TRAINING'), isMlEnabled() && (_jsxs(_Fragment, { children: [_jsx(Row, { label: "Experiment", children: _jsx("select", { value: configName, onChange: e => setConfigName(e.target.value), disabled: trainingRunning, style: {
                                flex: 1,
                                background: COLORS.BUTTON_BG,
                                color: COLORS.PANEL_TEXT,
                                border: `1px solid ${COLORS.PANEL_BORDER}`,
                                borderRadius: 3,
                                fontSize: 11,
                                fontFamily: 'monospace',
                                padding: '2px 4px',
                            }, children: TRAINING_CONFIGS.map(c => (_jsx("option", { value: c, children: c }, c))) }) }), _jsx(Row, { label: "Save checkpoints", children: _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 6, color: COLORS.PANEL_TEXT, fontSize: 11, fontFamily: 'monospace' }, children: [_jsx("input", { type: "checkbox", checked: persistCheckpoints, onChange: e => setPersistCheckpoints(e.target.checked), disabled: trainingRunning }), "persist across runs"] }) }), _jsx(Row, { label: "Resume", children: _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 6, color: COLORS.PANEL_TEXT, fontSize: 11, fontFamily: 'monospace' }, children: [_jsx("input", { type: "checkbox", checked: resumeTraining, onChange: e => setResumeTraining(e.target.checked), disabled: trainingRunning }), "continue from last checkpoint"] }) }), _jsxs("div", { style: { display: 'flex', gap: 8, marginBottom: 8 }, children: [_jsx("button", { onClick: () => void startTraining(), disabled: trainingRunning, style: {
                                    background: COLORS.BUTTON_ACTIVE,
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 3,
                                    padding: '4px 12px',
                                    fontSize: 11,
                                    fontFamily: 'monospace',
                                    cursor: trainingRunning ? 'default' : 'pointer',
                                    opacity: trainingRunning ? 0.5 : 1,
                                }, children: "Start" }), _jsx("button", { onClick: () => void stopTraining(), disabled: !trainingRunning, style: {
                                    background: COLORS.BUTTON_BG,
                                    color: COLORS.PANEL_TEXT,
                                    border: `1px solid ${COLORS.PANEL_BORDER}`,
                                    borderRadius: 3,
                                    padding: '4px 12px',
                                    fontSize: 11,
                                    fontFamily: 'monospace',
                                    cursor: !trainingRunning ? 'default' : 'pointer',
                                    opacity: !trainingRunning ? 0.5 : 1,
                                }, children: "Stop" })] }), _jsxs("div", { style: { color: COLORS.PANEL_TEXT_DIM, fontSize: 10, fontFamily: 'monospace', marginBottom: 8 }, children: [trainingRunning ? 'running' : (trainingStatus?.status ?? 'idle'), total > 0 ? ` — ${done.toLocaleString()} / ${total.toLocaleString()} (${pct}%)` : '', trainingStatus?.last_checkpoint ? ` — ${trainingStatus.last_checkpoint}` : ''] }), trainingError && (_jsx("div", { style: { color: COLORS.ERROR_BANNER, fontSize: 10, fontFamily: 'monospace', marginBottom: 8 }, children: trainingError })), _jsxs("div", { style: { color: COLORS.PANEL_TEXT_DIM, fontSize: 9, fontFamily: 'monospace', marginBottom: 4 }, children: ["Run ", _jsx("code", { style: { fontSize: 9 }, children: "npm run dev" }), " (ML on :8001). Checkpoints \u2192 runs/<name>/latest/. Copy policy.zip to ml/models/deployed/ for everyone."] })] })), section('OPERATIONS'), _jsxs(Row, { label: "Rolling stock %", children: [_jsx("input", { type: "range", min: 10, max: 100, step: 5, value: config.rolling_stock_pct, onChange: e => updateConfig({ rolling_stock_pct: Number(e.target.value) }), style: { flex: 1 } }), _jsxs("span", { style: { color: COLORS.PANEL_TEXT, fontFamily: 'monospace', fontSize: 11, width: 32 }, children: [config.rolling_stock_pct, "%"] })] }), _jsx(Row, { label: "Headway target (s)", children: _jsx(NumInput, { value: config.headway_target, min: 30, max: 600, step: 10, onChange: v => updateConfig({ headway_target: v }) }) }), section(`ROLLING STOCK — ${activeProfile?.name ?? '—'}`), activeProfile && (_jsxs(_Fragment, { children: [_jsxs(Row, { label: "Max speed (m/s)", children: [_jsx(NumInput, { value: activeProfile.max_speed, min: 5, max: 35, step: 0.5, onChange: v => patchProfile({ max_speed: v }) }), _jsxs("span", { style: { color: COLORS.PANEL_TEXT_DIM, fontSize: 10, fontFamily: 'monospace' }, children: ["(", (activeProfile.max_speed * 3.6).toFixed(0), " km/h)"] })] }), _jsx(Row, { label: "Accel (m/s\u00B2)", children: _jsx(NumInput, { value: activeProfile.accel, min: 0.3, max: 3, step: 0.1, onChange: v => patchProfile({ accel: v }) }) }), _jsx(Row, { label: "Decel (m/s\u00B2)", children: _jsx(NumInput, { value: activeProfile.decel, min: 0.5, max: 4, step: 0.1, onChange: v => patchProfile({ decel: v }) }) }), _jsx(Row, { label: "Length (m)", children: _jsx(NumInput, { value: activeProfile.length, min: 20, max: 200, step: 1, onChange: v => patchProfile({ length: v }) }) }), _jsx(Row, { label: "Mass (t)", children: _jsx(NumInput, { value: activeProfile.mass, min: 50, max: 500, step: 10, onChange: v => patchProfile({ mass: v }) }) })] })), section('EVENT INJECTION'), _jsxs("div", { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }, children: [_jsx("select", { value: newEventKind, onChange: e => setNewEventKind(e.target.value), style: { background: COLORS.BUTTON_BG, color: COLORS.PANEL_TEXT, border: `1px solid ${COLORS.PANEL_BORDER}`, borderRadius: 3, fontSize: 11, fontFamily: 'monospace', padding: '2px 4px' }, children: EVENT_KINDS.map(k => _jsx("option", { value: k, children: k }, k)) }), _jsx("select", { value: newEventTrain, onChange: e => setNewEventTrain(e.target.value), style: { background: COLORS.BUTTON_BG, color: COLORS.PANEL_TEXT, border: `1px solid ${COLORS.PANEL_BORDER}`, borderRadius: 3, fontSize: 11, fontFamily: 'monospace', padding: '2px 4px' }, children: (runtime?.trains ?? []).map(t => _jsx("option", { value: t.train_id, children: t.label }, t.train_id)) }), newEventKind === 'signal_fail' ? (_jsxs("select", { value: newEventSignal, onChange: e => setNewEventSignal(e.target.value), style: { background: COLORS.BUTTON_BG, color: COLORS.PANEL_TEXT, border: `1px solid ${COLORS.PANEL_BORDER}`, borderRadius: 3, fontSize: 11, fontFamily: 'monospace', padding: '2px 4px', maxWidth: 120 }, children: [_jsx("option", { value: "", children: "signal" }), (runtime?.signals ?? []).map(s => _jsx("option", { value: s.signal_id, children: s.signal_id }, s.signal_id))] })) : null, _jsx(NumInput, { value: newEventDur, min: 5, max: 300, step: 5, onChange: setNewEventDur }), _jsx(NumInput, { value: newEventDelay, min: 0, max: 120, step: 5, onChange: setNewEventDelay }), newEventKind === 'slow_speed' && (_jsx(NumInput, { value: newEventTsr, min: 5, max: 80, step: 5, onChange: setNewEventTsr })), _jsx("button", { onClick: () => void addEvent(), style: { background: COLORS.BUTTON_ACTIVE, color: '#fff', border: 'none', borderRadius: 3, padding: '2px 10px', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer' }, children: "Inject" })] }), injectError && (_jsx("div", { style: { color: COLORS.ERROR_BANNER, fontSize: 10, fontFamily: 'monospace', marginBottom: 6 }, children: injectError })), activeIncidents.length === 0 && (_jsx("div", { style: { color: COLORS.PANEL_TEXT_DIM, fontSize: 10, fontFamily: 'monospace' }, children: "No active events" })), activeIncidents.map(evt => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }, children: [_jsxs("span", { style: { color: COLORS.SIGNAL_YELLOW, fontFamily: 'monospace', fontSize: 10 }, children: [evt.active ? '●' : '○', " ", evt.target_train_id ?? evt.target_signal_id ?? '—', " ", evt.kind, evt.active ? ` ${evt.remaining_s.toFixed(0)}s` : ` in ${evt.starts_in_s.toFixed(0)}s`] }), _jsx("button", { onClick: () => void removeEvent(evt.id), style: { background: 'none', border: 'none', color: COLORS.ERROR_BANNER, fontSize: 13, cursor: 'pointer', lineHeight: 1 }, children: "\u00D7" })] }, evt.id)))] }));
}
