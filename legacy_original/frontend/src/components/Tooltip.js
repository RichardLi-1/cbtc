import { jsx as _jsx } from "react/jsx-runtime";
import { COLORS } from '../constants/colors';
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
        const s = runtime.signals.find(s => s.signal_id === id);
        const topo = topology.signals.find(s => s.id === id);
        return [
            `Signal  ${id}`,
            `Aspect  ${s?.aspect ?? '—'}`,
            `Edge    ${topo?.edge_id ?? '—'}`,
        ];
    }
    if (kind === 'switch') {
        const s = runtime.switches.find(s => s.switch_id === id);
        return [
            `Switch  ${id}`,
            `State   ${s?.state ?? '—'}`,
        ];
    }
    return [id];
}
export function Tooltip({ hovered, topology, runtime }) {
    const lines = entityDetail(hovered, topology, runtime);
    const x = Math.min(hovered.screenX + 14, window.innerWidth - 200);
    const y = Math.min(hovered.screenY + 14, window.innerHeight - 120);
    return (_jsx("div", { style: {
            position: 'fixed',
            left: x,
            top: y,
            background: COLORS.PANEL_BG,
            border: `1px solid ${COLORS.PANEL_BORDER}`,
            borderRadius: 4,
            padding: '6px 10px',
            pointerEvents: 'none',
            zIndex: 100,
            minWidth: 160,
        }, children: lines.map((l, i) => (_jsx("div", { style: { color: i === 0 ? COLORS.PANEL_TEXT : COLORS.PANEL_TEXT_DIM, fontSize: 11, fontFamily: 'monospace', lineHeight: '1.6' }, children: l }, i))) }));
}
