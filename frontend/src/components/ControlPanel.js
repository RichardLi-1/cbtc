import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import posthog from 'posthog-js';
import { useRuntimeStore } from '../store/runtimeStore';
import { useConnectionStore } from '../store/connectionStore';
import { useUiStore } from '../store/uiStore';
import { COLORS } from '../constants/colors';
import { isMlEnabled } from '../config/ml';
import { useIsMobile } from '../hooks/useIsMobile';
function useWallClock() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return now;
}
function formatClock(d) {
    return d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}
function formatDate(d) {
    return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: '2-digit' });
}
const SERVICE_START_SEC = 6 * 3600; // 06:00 revenue start
function formatSimClock(simT) {
    if (simT == null || !Number.isFinite(simT))
        return '--:--:--';
    const total = Math.max(0, Math.floor(SERVICE_START_SEC + simT));
    const hh = Math.floor(total / 3600) % 24;
    const mm = Math.floor((total % 3600) / 60);
    const ss = total % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}
function Btn({ label, active, danger, onClick }) {
    return (_jsx("button", { onClick: onClick, style: {
            background: active ? COLORS.BUTTON_ACTIVE : COLORS.BUTTON_BG,
            color: danger ? COLORS.ERROR_BANNER : COLORS.PANEL_TEXT,
            border: `1px solid ${COLORS.PANEL_BORDER}`,
            borderRadius: 3,
            padding: '3px 10px',
            fontSize: 11,
            fontFamily: 'monospace',
            cursor: 'pointer',
            letterSpacing: '0.03em',
        }, children: label }));
}
const DOT_COLOR = {
    untested: COLORS.PANEL_TEXT_DIM,
    ok: COLORS.SIGNAL_GREEN,
    error: COLORS.SIGNAL_RED,
};
function EndpointDot({ ep, label }) {
    const info = useConnectionStore((s) => s.endpoints[ep]);
    return (_jsxs("span", { title: info.error ?? (info.health === 'ok' ? `${label} OK` : `${label} not yet tested`), style: {
            color: DOT_COLOR[info.health],
            fontFamily: 'monospace',
            fontSize: 10,
            letterSpacing: '0.04em',
            cursor: info.error ? 'help' : 'default',
        }, children: ["\u25CF ", label] }));
}
export function ControlPanel() {
    const { runtime, stale, commandError, showSafeZones, showLabels, clearCommandError, toggleSafeZones, toggleLabels } = useRuntimeStore();
    const { mockMode } = useConnectionStore();
    const setInfoOpen = useUiStore((s) => s.setInfoOpen);
    const simClock = formatSimClock(runtime?.sim_time_s);
    const now = useWallClock();
    const isMobile = useIsMobile();
    return (_jsxs("div", { style: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 38,
            background: COLORS.PANEL_BG,
            borderBottom: `1px solid ${COLORS.PANEL_BORDER}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 14px',
            zIndex: 50,
            // On phones the bar overflows its width. Scroll it horizontally instead
            // of letting items reflow — async-appearing badges (MOCK/STALE) would
            // otherwise shove the right-aligned buttons sideways (layout shift).
            overflowX: isMobile ? 'auto' : 'hidden',
            overflowY: 'hidden',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none',
        }, children: [_jsx("span", { style: { color: COLORS.PANEL_TEXT, fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.08em', marginRight: 8 }, children: "CBTC DISPATCH" }), _jsx("span", { style: { color: COLORS.PANEL_TEXT, fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.06em' }, children: formatClock(now) }), _jsx("span", { style: { color: COLORS.PANEL_TEXT_DIM, fontFamily: 'monospace', fontSize: 11 }, children: formatDate(now) }), _jsxs("span", { title: "Simulated service time (starts 06:00)", style: { color: COLORS.PANEL_TEXT_DIM, fontFamily: 'monospace', fontSize: 11 }, children: ["SIM ", simClock] }), _jsx(EndpointDot, { ep: "topology", label: "/topology" }), _jsx(EndpointDot, { ep: "state", label: "/state" }), _jsx(EndpointDot, { ep: "commands", label: "/commands" }), isMlEnabled() && _jsx(EndpointDot, { ep: "ml", label: "/ml" }), mockMode && (_jsx("span", { style: { color: COLORS.SIGNAL_YELLOW, fontFamily: 'monospace', fontSize: 10, border: `1px solid ${COLORS.SIGNAL_YELLOW}`, padding: '1px 5px', borderRadius: 2 }, children: "MOCK" })), stale && (_jsx("span", { style: { color: COLORS.STALE_BANNER, fontFamily: 'monospace', fontSize: 11 }, children: "\u26A0 STALE DATA" })), commandError && (_jsxs("span", { onClick: clearCommandError, style: { color: COLORS.ERROR_BANNER, fontFamily: 'monospace', fontSize: 11, cursor: 'pointer', background: '#1a0000', padding: '2px 6px', borderRadius: 2 }, title: "Click to dismiss", children: ["\u2715 ", commandError] })), _jsx("div", { style: { flex: 1 } }), _jsx("a", { href: "https://github.com/RichardLi-1/cbtc", target: "_blank", rel: "noopener noreferrer", title: "View source on GitHub", style: {
                    background: COLORS.BUTTON_BG,
                    color: COLORS.PANEL_TEXT,
                    border: `1px solid ${COLORS.PANEL_BORDER}`,
                    borderRadius: 3,
                    padding: '3px 10px',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    letterSpacing: '0.03em',
                    textDecoration: 'none',
                }, children: "GITHUB" }), _jsx(Btn, { label: "INFO", onClick: () => { setInfoOpen(true); posthog.capture('info_panel_viewed'); } }), _jsx(Btn, { label: showSafeZones ? 'SAFE ZONES ●' : 'SAFE ZONES ○', active: showSafeZones, onClick: toggleSafeZones }), _jsx(Btn, { label: showLabels ? 'LABELS ●' : 'LABELS ○', active: showLabels, onClick: toggleLabels }), _jsxs("span", { style: { color: COLORS.PANEL_TEXT_DIM, fontFamily: 'monospace', fontSize: 11 }, children: [runtime?.trains?.length ?? 0, " trains"] })] }));
}
