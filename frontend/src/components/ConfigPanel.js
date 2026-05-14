import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Hidden config panel — toggle with Ctrl+Shift+C.
 * Manages rolling stock profiles, headway targets, and event injection.
 */
import { useState } from 'react';
import { useRuntimeStore } from '../store/runtimeStore';
import { COLORS } from '../constants/colors';
const EVENT_KINDS = ['emergency_brake', 'door_fault', 'slow_speed', 'signal_fail'];
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
export function ConfigPanel({ open }) {
    const { config, runtime, updateConfig } = useRuntimeStore();
    const [newEventKind, setNewEventKind] = useState('emergency_brake');
    const [newEventTrain, setNewEventTrain] = useState('T01');
    const [newEventDur, setNewEventDur] = useState(30);
    if (!open)
        return null;
    const activeProfile = config.profiles.find(p => p.id === config.active_profile);
    function patchProfile(patch) {
        if (!activeProfile)
            return;
        updateConfig({
            profiles: config.profiles.map(p => p.id === activeProfile.id ? { ...p, ...patch } : p),
        });
    }
    function addEvent() {
        const evt = {
            id: `evt_${Date.now()}`,
            kind: newEventKind,
            target_train_id: newEventTrain,
            duration_s: newEventDur,
            active: true,
        };
        updateConfig({ injected_events: [...config.injected_events, evt] });
    }
    function removeEvent(id) {
        updateConfig({ injected_events: config.injected_events.filter(e => e.id !== id) });
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
    return (_jsxs("div", { style: panelStyle, children: [_jsxs("div", { style: { color: COLORS.PANEL_TEXT, fontFamily: 'monospace', fontSize: 13, marginBottom: 12 }, children: ["\u2699 SIM CONFIG ", _jsx("span", { style: { color: COLORS.PANEL_TEXT_DIM, fontSize: 10 }, children: "(Ctrl+Shift+C)" })] }), section('OPERATIONS'), _jsxs(Row, { label: "Rolling stock %", children: [_jsx("input", { type: "range", min: 10, max: 100, step: 5, value: config.rolling_stock_pct, onChange: e => updateConfig({ rolling_stock_pct: Number(e.target.value) }), style: { flex: 1 } }), _jsxs("span", { style: { color: COLORS.PANEL_TEXT, fontFamily: 'monospace', fontSize: 11, width: 32 }, children: [config.rolling_stock_pct, "%"] })] }), _jsx(Row, { label: "Headway target (s)", children: _jsx(NumInput, { value: config.headway_target, min: 30, max: 600, step: 10, onChange: v => updateConfig({ headway_target: v }) }) }), section(`ROLLING STOCK — ${activeProfile?.name ?? '—'}`), activeProfile && (_jsxs(_Fragment, { children: [_jsxs(Row, { label: "Max speed (m/s)", children: [_jsx(NumInput, { value: activeProfile.max_speed, min: 5, max: 35, step: 0.5, onChange: v => patchProfile({ max_speed: v }) }), _jsxs("span", { style: { color: COLORS.PANEL_TEXT_DIM, fontSize: 10, fontFamily: 'monospace' }, children: ["(", (activeProfile.max_speed * 3.6).toFixed(0), " km/h)"] })] }), _jsx(Row, { label: "Accel (m/s\u00B2)", children: _jsx(NumInput, { value: activeProfile.accel, min: 0.3, max: 3, step: 0.1, onChange: v => patchProfile({ accel: v }) }) }), _jsx(Row, { label: "Decel (m/s\u00B2)", children: _jsx(NumInput, { value: activeProfile.decel, min: 0.5, max: 4, step: 0.1, onChange: v => patchProfile({ decel: v }) }) }), _jsx(Row, { label: "Length (m)", children: _jsx(NumInput, { value: activeProfile.length, min: 20, max: 200, step: 1, onChange: v => patchProfile({ length: v }) }) }), _jsx(Row, { label: "Mass (t)", children: _jsx(NumInput, { value: activeProfile.mass, min: 50, max: 500, step: 10, onChange: v => patchProfile({ mass: v }) }) })] })), section('EVENT INJECTION'), _jsxs("div", { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }, children: [_jsx("select", { value: newEventKind, onChange: e => setNewEventKind(e.target.value), style: { background: COLORS.BUTTON_BG, color: COLORS.PANEL_TEXT, border: `1px solid ${COLORS.PANEL_BORDER}`, borderRadius: 3, fontSize: 11, fontFamily: 'monospace', padding: '2px 4px' }, children: EVENT_KINDS.map(k => _jsx("option", { value: k, children: k }, k)) }), _jsx("select", { value: newEventTrain, onChange: e => setNewEventTrain(e.target.value), style: { background: COLORS.BUTTON_BG, color: COLORS.PANEL_TEXT, border: `1px solid ${COLORS.PANEL_BORDER}`, borderRadius: 3, fontSize: 11, fontFamily: 'monospace', padding: '2px 4px' }, children: (runtime?.trains ?? []).map(t => _jsx("option", { value: t.train_id, children: t.label }, t.train_id)) }), _jsx(NumInput, { value: newEventDur, min: 5, max: 300, step: 5, onChange: setNewEventDur }), _jsx("button", { onClick: addEvent, style: { background: COLORS.BUTTON_ACTIVE, color: '#fff', border: 'none', borderRadius: 3, padding: '2px 10px', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer' }, children: "Inject" })] }), config.injected_events.length === 0 && (_jsx("div", { style: { color: COLORS.PANEL_TEXT_DIM, fontSize: 10, fontFamily: 'monospace' }, children: "No active events" })), config.injected_events.map(evt => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }, children: [_jsxs("span", { style: { color: COLORS.SIGNAL_YELLOW, fontFamily: 'monospace', fontSize: 10 }, children: ["[", evt.target_train_id, "] ", evt.kind, " ", evt.duration_s, "s"] }), _jsx("button", { onClick: () => removeEvent(evt.id), style: { background: 'none', border: 'none', color: COLORS.ERROR_BANNER, fontSize: 13, cursor: 'pointer', lineHeight: 1 }, children: "\u00D7" })] }, evt.id)))] }));
}
