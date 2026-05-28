import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { COLORS } from '../constants/colors';
export function InfoPopup({ open, onClose }) {
    useEffect(() => {
        if (!open)
            return;
        const onKey = (e) => { if (e.key === 'Escape')
            onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open)
        return null;
    return (_jsx("div", { onClick: onClose, style: {
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
            zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }, children: _jsxs("div", { onClick: (e) => e.stopPropagation(), style: {
                width: 560, maxHeight: '80vh', overflowY: 'auto',
                background: COLORS.PANEL_BG,
                border: `1px solid ${COLORS.PANEL_BORDER}`,
                color: COLORS.PANEL_TEXT,
                fontFamily: 'monospace',
                fontSize: 12,
                lineHeight: 1.55,
                padding: '18px 22px',
                borderRadius: 4,
                boxShadow: '0 8px 28px rgba(0,0,0,0.6)',
            }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }, children: [_jsx("span", { style: { fontSize: 13, letterSpacing: '0.1em', color: COLORS.PANEL_TEXT }, children: "URBALIS 400 \u2014 REFERENCE NOTES" }), _jsx("span", { onClick: onClose, style: { cursor: 'pointer', color: COLORS.PANEL_TEXT_DIM, fontSize: 14 }, title: "Close (Esc)", children: "\u2715" })] }), _jsxs(Section, { title: "THE REAL SYSTEM", children: ["TTC Line 1 (Yonge\u2013University) runs on Alstom ", _jsx("b", { children: "Urbalis 400" }), ", a moving-block CBTC. Each train continuously reports its position to wayside zone controllers over a track-side radio network. A central ATS layer handles regulation and timetable; wayside ATP issues a", _jsx("b", { children: " movement authority" }), " (MA) \u2014 the limit of authority a train may travel to \u2014 and an onboard ATO follows it within the speed envelope. Fixed track circuits remain as a fallback for SIL-4 protection."] }), _jsxs(Section, { title: "WHAT WE MODEL", children: [_jsx(Row, { k: "Topology", v: "Static track graph (edges, switches, stations) loaded from /topology." }), _jsx(Row, { k: "Train state", v: "Owns its own speed/position. Integrates traction & braking each tick." }), _jsx(Row, { k: "Controller", v: "Wayside-style. Pushes setpoints (target speed, direction) via a narrow command API." }), _jsx(Row, { k: "Movement authority", v: "Per-train safe zone: permitted speed + forward/rear extent. Rendered as the green/orange band." }), _jsx(Row, { k: "Driver", v: "Minimal \u2014 emergency brake only. EB overrides controller setpoints until released." })] }), _jsx(Section, { title: "SIMPLIFICATIONS", children: "No radio loss model, no SIL-rated voting, no track-circuit fallback, no interlocking proofs. Block occupancy is derived from train positions directly rather than from axle counters. Headways and braking curves are tuned for legibility, not certification." }), _jsx("div", { style: { marginTop: 14, paddingTop: 10, borderTop: `1px solid ${COLORS.PANEL_BORDER}`, color: COLORS.PANEL_TEXT_DIM, fontSize: 10 }, children: "Recreational simulator. Not affiliated with TTC or Alstom." })] }) }));
}
function Section({ title, children }) {
    return (_jsxs("div", { style: { marginBottom: 14 }, children: [_jsx("div", { style: { color: COLORS.PANEL_TEXT_DIM, fontSize: 10, letterSpacing: '0.12em', marginBottom: 6 }, children: title }), _jsx("div", { children: children })] }));
}
function Row({ k, v }) {
    return (_jsxs("div", { style: { display: 'flex', gap: 10, marginBottom: 3 }, children: [_jsx("span", { style: { color: COLORS.SIGNAL_GREEN, minWidth: 130 }, children: k }), _jsx("span", { style: { color: COLORS.PANEL_TEXT }, children: v })] }));
}
