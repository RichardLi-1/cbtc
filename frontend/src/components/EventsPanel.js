import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { useEventsStore } from '../store/eventsStore';
import { useRuntimeStore } from '../store/runtimeStore';
import { useTopologyStore } from '../store/topologyStore';
import { injectEvent } from '../api/client';
import { COLORS } from '../constants/colors';
const SEV_COLOR = {
    info: COLORS.PANEL_TEXT,
    warn: COLORS.SIGNAL_YELLOW,
    error: COLORS.SIGNAL_RED,
};
const SRC_COLOR = {
    system: COLORS.PANEL_TEXT_DIM,
    wayside: '#4fc3f7',
    driver: '#ce93d8',
    manual: '#ffb74d',
};
const SERVICE_START_SEC = 6 * 3600;
function fmtSimT(t) {
    if (t == null || !Number.isFinite(t))
        return '--:--:--';
    const total = Math.max(0, Math.floor(SERVICE_START_SEC + t));
    const hh = Math.floor(total / 3600) % 24;
    const mm = Math.floor((total % 3600) / 60);
    const ss = total % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}
const PANEL_WIDTH = 340;
const HEADER_H = 38;
export function EventsPanel() {
    const { events, paused, panelOpen, injectOpen, togglePaused, clear, setPanelOpen, setInjectOpen } = useEventsStore();
    const runtime = useRuntimeStore((s) => s.runtime);
    const dispatch = runtime?.ops?.dispatch;
    if (!panelOpen) {
        return (_jsxs("div", { onClick: () => setPanelOpen(true), style: {
                position: 'absolute', top: HEADER_H + 8, right: 8, zIndex: 60,
                background: COLORS.PANEL_BG, border: `1px solid ${COLORS.PANEL_BORDER}`,
                color: COLORS.PANEL_TEXT, fontFamily: 'monospace', fontSize: 11,
                padding: '4px 8px', cursor: 'pointer', borderRadius: 3, letterSpacing: '0.08em',
            }, title: "Open events panel", children: ["EVENTS \u25C0 ", events.length > 0 && _jsxs("span", { style: { color: COLORS.PANEL_TEXT_DIM }, children: ["(", events.length, ")"] })] }));
    }
    return (_jsxs("div", { style: {
            position: 'absolute', top: HEADER_H, right: 0, bottom: 0, width: PANEL_WIDTH, zIndex: 60,
            background: COLORS.PANEL_BG, borderLeft: `1px solid ${COLORS.PANEL_BORDER}`,
            display: 'flex', flexDirection: 'column',
            fontFamily: 'monospace', fontSize: 11, color: COLORS.PANEL_TEXT,
        }, children: [_jsxs("div", { style: {
                    padding: '8px 10px', borderBottom: `1px solid ${COLORS.PANEL_BORDER}`,
                    display: 'flex', alignItems: 'center', gap: 6,
                }, children: [_jsx("span", { style: { letterSpacing: '0.1em', flex: 1 }, children: "EVENTS" }), _jsx("span", { style: { color: COLORS.PANEL_TEXT_DIM, fontSize: 10 }, children: events.length }), _jsx(MiniBtn, { label: paused ? 'RESUME' : 'PAUSE', onClick: togglePaused, active: paused }), _jsx(MiniBtn, { label: "CLEAR", onClick: clear }), _jsx(MiniBtn, { label: "\u2715", onClick: () => setPanelOpen(false), title: "Hide panel" })] }), dispatch && (_jsxs("div", { style: { padding: '6px 10px', borderBottom: `1px solid ${COLORS.PANEL_BORDER}`, color: COLORS.PANEL_TEXT_DIM, fontSize: 10 }, children: ["DISP count=", dispatch.count, dispatch.next_due_in_s != null ? ` · next ~${Math.ceil(dispatch.next_due_in_s)}s` : '', dispatch.blocked ? ' · BLOCKED' : ''] })), _jsxs("div", { onClick: () => setInjectOpen(!injectOpen), style: {
                    padding: '6px 10px', borderBottom: `1px solid ${COLORS.PANEL_BORDER}`,
                    cursor: 'pointer', color: COLORS.PANEL_TEXT_DIM, fontSize: 10, letterSpacing: '0.1em',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }, children: [_jsxs("span", { children: [injectOpen ? '▾' : '▸', " INJECT EVENT"] }), _jsx("span", { style: { color: COLORS.PANEL_TEXT_DIM }, children: injectOpen ? '' : 'expand' })] }), injectOpen && _jsx(InjectPane, {}), _jsxs("div", { style: { flex: 1, overflowY: 'auto' }, children: [events.length === 0 && (_jsx("div", { style: { padding: 14, color: COLORS.PANEL_TEXT_DIM, fontSize: 11 }, children: "no events yet \u2014 system idle." })), events.map((e) => _jsx(EventRow, { e: e }, e.id))] })] }));
}
function EventRow({ e }) {
    const planned = e.kind === 'PLAN';
    return (_jsxs("div", { style: {
            padding: '4px 10px', borderBottom: `1px solid #0d1620`,
            display: 'grid', gridTemplateColumns: '64px 38px 36px 1fr', gap: 6, alignItems: 'baseline',
            fontSize: 11, lineHeight: 1.35,
            opacity: planned ? 0.85 : 1,
            fontStyle: planned ? 'italic' : 'normal',
        }, children: [_jsx("span", { style: { color: COLORS.PANEL_TEXT_DIM, fontSize: 10 }, children: fmtSimT(e.simT) }), _jsx("span", { style: { color: SRC_COLOR[e.source], fontSize: 10, letterSpacing: '0.05em' }, children: e.source.toUpperCase() }), _jsx("span", { style: { color: planned ? COLORS.PANEL_TEXT_DIM : SEV_COLOR[e.severity], fontSize: 10 }, children: planned ? 'PLAN' : e.kind }), _jsx("span", { style: { color: planned ? COLORS.PANEL_TEXT_DIM : SEV_COLOR[e.severity] }, children: e.message })] }));
}
const KIND_LABEL = {
    eb_apply: 'Emergency brake — apply',
    eb_release: 'Emergency brake — release',
    switch_fail: 'Switch failure',
    speed_restrict: 'Temporary speed restriction',
    station_hold: 'Hold at station',
    note: 'Operator note',
};
const KIND_DEFAULTS = {
    eb_apply: { kind: 'EB', severity: 'error', source: 'driver' },
    eb_release: { kind: 'EB', severity: 'info', source: 'driver' },
    switch_fail: { kind: 'SW', severity: 'error', source: 'wayside' },
    speed_restrict: { kind: 'TSR', severity: 'warn', source: 'wayside' },
    station_hold: { kind: 'HOLD', severity: 'warn', source: 'wayside' },
    note: { kind: 'NOTE', severity: 'info', source: 'manual' },
};
function InjectPane() {
    const { runtime, sendSwitchCommand } = useRuntimeStore();
    const topology = useTopologyStore((s) => s.topology);
    const append = useEventsStore((s) => s.append);
    const [kind, setKind] = useState('speed_restrict');
    const [target, setTarget] = useState('');
    const [value, setValue] = useState('');
    const [note, setNote] = useState('');
    const targetOptions = useMemo(() => {
        if (kind === 'eb_apply' || kind === 'eb_release' || kind === 'station_hold') {
            return runtime?.trains.map((t) => t.train_id) ?? [];
        }
        if (kind === 'switch_fail') {
            return topology?.switches.map((s) => s.id) ?? [];
        }
        if (kind === 'speed_restrict') {
            return runtime?.trains.map((t) => t.train_id) ?? [];
        }
        if (kind === 'note') {
            return [];
        }
        return [];
    }, [kind, runtime, topology]);
    const targetLabel = {
        eb_apply: 'Train', eb_release: 'Train', station_hold: 'Train',
        switch_fail: 'Switch', speed_restrict: 'Train', note: '',
    };
    const needsValue = kind === 'speed_restrict';
    async function submit() {
        const meta = KIND_DEFAULTS[kind];
        const parts = [KIND_LABEL[kind]];
        if (target)
            parts.push(target);
        if (needsValue && value)
            parts.push(`${value} km/h`);
        if (note.trim())
            parts.push(`— ${note.trim()}`);
        try {
            if (kind === 'note') {
                await injectEvent({ kind: 'operator_note', note: note.trim() || parts.join(' ') });
            }
            else if (kind === 'eb_apply' && target) {
                await injectEvent({ kind: 'emergency_brake', target_train_id: target, duration_s: 30 });
            }
            else if (kind === 'eb_release' && target) {
                await injectEvent({ kind: 'emergency_brake_release', target_train_id: target, duration_s: 5 });
            }
            else if (kind === 'speed_restrict' && target && value) {
                await injectEvent({
                    kind: 'slow_speed',
                    target_train_id: target,
                    speed_limit_kph: Number(value),
                    duration_s: 120,
                    note: note.trim(),
                });
            }
            else if (kind === 'station_hold' && target) {
                await injectEvent({ kind: 'station_hold', target_train_id: target, duration_s: 60, note: note.trim() });
            }
            else if (kind === 'switch_fail' && target) {
                const sw = topology?.switches.find((x) => x.id === target);
                const sigOnEdge = topology?.signals.find((s) => s.edge_id === sw?.normal_edge_id);
                if (sigOnEdge) {
                    await injectEvent({
                        kind: 'signal_fail',
                        target_signal_id: sigOnEdge.id,
                        duration_s: 45,
                        note: note.trim() || `switch ${target} failed`,
                    });
                }
                else {
                    const cur = runtime?.switches.find((s) => s.switch_id === target)?.state;
                    const next = cur === 'normal' ? 'reverse' : 'normal';
                    sendSwitchCommand(target, next);
                    await injectEvent({ kind: 'operator_note', note: note.trim() || `switch ${target} failed (no signal mapped)` });
                }
            }
            else {
                append({ source: meta.source, severity: 'warn', kind: 'CMD', message: 'select a target' });
                return;
            }
        }
        catch {
            append({ source: 'system', severity: 'error', kind: 'CMD', message: 'inject failed — is backend up?' });
            return;
        }
        setNote('');
        setValue('');
    }
    return (_jsxs("div", { style: {
            padding: '8px 10px', borderBottom: `1px solid ${COLORS.PANEL_BORDER}`,
            background: '#08121a', display: 'flex', flexDirection: 'column', gap: 6,
        }, children: [_jsx(Row, { label: "Type", children: _jsx("select", { value: kind, onChange: (e) => { setKind(e.target.value); setTarget(''); setValue(''); }, style: selectStyle, children: Object.entries(KIND_LABEL).map(([k, v]) => _jsx("option", { value: k, children: v }, k)) }) }), targetLabel[kind] && (_jsx(Row, { label: targetLabel[kind], children: _jsxs("select", { value: target, onChange: (e) => setTarget(e.target.value), style: selectStyle, children: [_jsx("option", { value: "", children: "\u2014 select \u2014" }), targetOptions.map((id) => _jsx("option", { value: id, children: id }, id))] }) })), needsValue && (_jsx(Row, { label: "Limit", children: _jsx("input", { type: "number", min: 0, max: 120, placeholder: "km/h", value: value, onChange: (e) => setValue(e.target.value), style: inputStyle }) })), _jsx(Row, { label: "Note", children: _jsx("input", { type: "text", placeholder: "optional", value: note, onChange: (e) => setNote(e.target.value), style: inputStyle }) }), _jsx("button", { onClick: submit, style: {
                    marginTop: 4, background: COLORS.BUTTON_ACTIVE, color: '#fff',
                    border: 'none', borderRadius: 3, padding: '5px 10px',
                    fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer',
                }, children: "INJECT \u25B8" })] }));
}
const selectStyle = {
    flex: 1, background: COLORS.BUTTON_BG, color: COLORS.PANEL_TEXT,
    border: `1px solid ${COLORS.PANEL_BORDER}`, borderRadius: 2,
    padding: '3px 5px', fontFamily: 'monospace', fontSize: 11,
};
const inputStyle = {
    ...selectStyle,
    padding: '3px 6px',
};
function Row({ label, children }) {
    return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { color: COLORS.PANEL_TEXT_DIM, fontSize: 10, width: 50, letterSpacing: '0.06em' }, children: label }), children] }));
}
function MiniBtn({ label, onClick, active, title }) {
    return (_jsx("button", { onClick: onClick, title: title, style: {
            background: active ? COLORS.BUTTON_ACTIVE : COLORS.BUTTON_BG,
            color: COLORS.PANEL_TEXT, border: `1px solid ${COLORS.PANEL_BORDER}`,
            borderRadius: 2, padding: '2px 6px', fontFamily: 'monospace', fontSize: 10,
            letterSpacing: '0.06em', cursor: 'pointer',
        }, children: label }));
}
