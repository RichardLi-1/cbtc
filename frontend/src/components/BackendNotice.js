import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useConnectionStore } from '../store/connectionStore';
import { COLORS } from '../constants/colors';
const HINTS = {
    topology: 'GET /topology — endpoint not implemented in backend (missing route)',
    state: 'GET /state — backend returned an error (likely NameError: lines not initialised outside __main__)',
    commands: 'POST /commands/* — endpoint not implemented in backend (missing route)',
};
export function BackendNotice() {
    const { endpoints, dismissError } = useConnectionStore();
    const [collapsed, setCollapsed] = useState(false);
    const errors = Object.entries(endpoints)
        .filter(([, info]) => info.health === 'error' && info.error !== null);
    if (errors.length === 0)
        return null;
    return (_jsxs("div", { style: {
            position: 'absolute',
            top: 46,
            left: 14,
            zIndex: 100,
            width: 380,
            background: '#0d1a10',
            border: `1px solid #2a4a20`,
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: 11,
            overflow: 'hidden',
        }, children: [_jsxs("div", { onClick: () => setCollapsed(v => !v), style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 10px',
                    cursor: 'pointer',
                    background: '#101e12',
                    borderBottom: collapsed ? 'none' : `1px solid #2a4a20`,
                    userSelect: 'none',
                }, children: [_jsx("span", { style: { color: COLORS.SIGNAL_RED, fontSize: 13, lineHeight: 1 }, children: "\u25A0" }), _jsxs("span", { style: { color: COLORS.PANEL_TEXT, letterSpacing: '0.06em' }, children: ["BACKEND ISSUES (", errors.length, ")"] }), _jsx("span", { style: { color: COLORS.PANEL_TEXT_DIM, marginLeft: 'auto' }, children: collapsed ? '▸' : '▾' })] }), !collapsed && (_jsx("div", { style: { padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }, children: errors.map(([ep, info]) => (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 3 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx("span", { style: { color: COLORS.SIGNAL_RED }, children: "\u2715" }), _jsxs("span", { style: { color: COLORS.PANEL_TEXT, fontWeight: 'bold' }, children: ["/", ep] }), _jsx("span", { onClick: () => dismissError(ep), style: { marginLeft: 'auto', color: COLORS.PANEL_TEXT_DIM, cursor: 'pointer', fontSize: 13, lineHeight: 1 }, title: "Dismiss", children: "\u00D7" })] }), _jsx("div", { style: { color: COLORS.SIGNAL_YELLOW, paddingLeft: 16 }, children: info.error }), _jsx("div", { style: { color: COLORS.PANEL_TEXT_DIM, paddingLeft: 16 }, children: HINTS[ep] })] }, ep))) }))] }));
}
