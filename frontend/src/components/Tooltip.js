import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { COLORS } from '../constants/colors';
// ── Signal light ────────────────────────────────────────────────────────────
const ASPECT_COLORS = {
    green: COLORS.SIGNAL_GREEN,
    yellow: COLORS.SIGNAL_YELLOW,
    flashing_yellow: COLORS.SIGNAL_FLASHING_YELLOW,
    red: COLORS.SIGNAL_RED,
    dark: COLORS.SIGNAL_DARK,
};
// Which lamp slot (0=top/green, 1=mid/yellow, 2=bottom/red) is lit per aspect
const LIT_SLOT = {
    green: 0, flashing_yellow: 1, yellow: 1, red: 2, dark: -1,
};
function SignalLight({ aspect }) {
    const lit = LIT_SLOT[aspect];
    const glow = ASPECT_COLORS[aspect];
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: '#000', borderRadius: 8, padding: '10px 14px' }, children: [[0, 1, 2].map((i) => {
                const isLit = i === lit && lit >= 0;
                return (_jsx("div", { style: {
                        width: 28, height: 28, borderRadius: '50%',
                        background: isLit ? glow : '#2a2a2a',
                        boxShadow: isLit ? `0 0 10px 3px ${glow}88` : 'none',
                        transition: 'background 0.15s, box-shadow 0.15s',
                    } }, i));
            }), _jsx("div", { style: { color: COLORS.PANEL_TEXT_DIM, fontSize: 9, fontFamily: 'monospace', marginTop: 2, letterSpacing: '0.06em' }, children: aspect.replace('_', ' ').toUpperCase() })] }));
}
// ── Text detail ─────────────────────────────────────────────────────────────
function entityDetail(hovered, topology, runtime) {
    const { kind, id } = hovered;
    if (kind === 'train') {
        const t = runtime.trains.find(t => t.train_id === id);
        if (!t)
            return [id];
        return [
            `Train  ${t.label}`,
            `Edge   ${t.edge_id}  @${(t.offset * 100).toFixed(1)}%`,
            `Speed  ${(t.speed * 3.6).toFixed(1)} km/h`,
            `State  ${t.state}`,
            `Fwd    ${t.safe_zone_front.toFixed(0)} m`,
        ];
    }
    if (kind === 'signal') {
        const topo = topology.signals.find(s => s.id === id);
        return [`Signal  ${id}`, `Edge    ${topo?.edge_id ?? '—'}`];
    }
    if (kind === 'switch') {
        const s = runtime.switches.find(s => s.switch_id === id);
        return [`Switch  ${id}`, `State   ${s?.state ?? '—'}`];
    }
    return [id];
}
// ── Tooltip ─────────────────────────────────────────────────────────────────
export function Tooltip({ hovered, topology, runtime }) {
    const lines = entityDetail(hovered, topology, runtime);
    const x = Math.min(hovered.screenX + 14, window.innerWidth - 220);
    const y = Math.min(hovered.screenY + 14, window.innerHeight - 180);
    const isSignal = hovered.kind === 'signal';
    const sigRuntime = isSignal ? runtime.signals.find(s => s.signal_id === hovered.id) : null;
    const aspect = sigRuntime?.aspect ?? 'dark';
    return (_jsxs("div", { style: {
            position: 'fixed', left: x, top: y,
            background: COLORS.PANEL_BG,
            border: `1px solid ${COLORS.PANEL_BORDER}`,
            borderRadius: 4,
            padding: '6px 10px',
            pointerEvents: 'none',
            zIndex: 100,
            minWidth: isSignal ? 100 : 160,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
        }, children: [isSignal && _jsx(SignalLight, { aspect: aspect }), lines.map((l, i) => (_jsx("div", { style: { color: i === 0 ? COLORS.PANEL_TEXT : COLORS.PANEL_TEXT_DIM, fontSize: 11, fontFamily: 'monospace', lineHeight: '1.6' }, children: l }, i)))] }));
}
