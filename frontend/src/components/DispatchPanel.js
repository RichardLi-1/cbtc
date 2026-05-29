import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import posthog from 'posthog-js';
import { fetchDispatchComparison, fetchDispatchPolicy, fetchLiveDispatchPolicy, runDispatchCompare, setLiveDispatchPolicy, } from '../api/client';
import { useRuntimeStore } from '../store/runtimeStore';
import { COLORS } from '../constants/colors';
function fmt(n, digits = 1) {
    return Number.isFinite(n) ? n.toFixed(digits) : '—';
}
function pct(n) {
    if (n == null || !Number.isFinite(n))
        return '—';
    const sign = n >= 0 ? '+' : '';
    return `${sign}${n.toFixed(1)}%`;
}
// Start collapsed on phone-sized screens: the panel is bottom-anchored and
// grows upward as async data arrives, so leaving it open on mobile both covers
// the canvas and registers as cumulative layout shift. Resolved once at module
// load to keep the first paint stable.
const START_COLLAPSED_MOBILE = typeof window !== 'undefined' && window.matchMedia('(max-width: 719px)').matches;
export function DispatchPanel() {
    const [open, setOpen] = useState(!START_COLLAPSED_MOBILE);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [policyReady, setPolicyReady] = useState(null);
    const [data, setData] = useState(null);
    const [livePolicy, setLivePolicy] = useState('rule');
    const [policySwitchError, setPolicySwitchError] = useState(null);
    const dispatchStatus = useRuntimeStore((s) => s.runtime?.ops?.dispatch);
    const applyLivePolicy = useCallback(async (mode) => {
        setPolicySwitchError(null);
        try {
            await setLiveDispatchPolicy(mode);
            setLivePolicy(mode);
            posthog.capture('dispatch_policy_switched', { policy: mode, live: true });
        }
        catch (err) {
            setPolicySwitchError(String(err));
        }
    }, []);
    const refreshPolicy = useCallback(async () => {
        try {
            const info = await fetchDispatchPolicy();
            setPolicyReady(info.exists);
        }
        catch {
            setPolicyReady(false);
        }
    }, []);
    const runCompare = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await runDispatchCompare({});
            setData(result);
            posthog.capture('dispatch_comparison_run', { episodes: result.episodes, seed: result.seed });
        }
        catch (err) {
            posthog.captureException(err instanceof Error ? err : new Error(String(err)));
            setError(String(err));
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void refreshPolicy();
        void fetchLiveDispatchPolicy()
            .then((s) => setLivePolicy(s.policy_mode === 'ppo' ? 'ppo' : 'rule'))
            .catch(() => { });
        void fetchDispatchComparison()
            .then(setData)
            .catch(() => {
            /* no cached comparison yet */
        });
    }, [refreshPolicy]);
    useEffect(() => {
        const mode = dispatchStatus?.policy_mode;
        if (mode === 'rule' || mode === 'ppo')
            setLivePolicy(mode);
    }, [dispatchStatus?.policy_mode]);
    if (!open) {
        return (_jsx("button", { type: "button", onClick: () => setOpen(true), style: {
                position: 'absolute',
                bottom: 12,
                left: 12,
                zIndex: 60,
                background: COLORS.PANEL_BG,
                border: `1px solid ${COLORS.PANEL_BORDER}`,
                color: COLORS.PANEL_TEXT,
                fontFamily: 'monospace',
                fontSize: 10,
                padding: '4px 8px',
                borderRadius: 3,
                cursor: 'pointer',
            }, children: "DISPATCH A/B" }));
    }
    const rule = data?.rule_based;
    const ppo = data?.ppo;
    const delta = data?.delta_pct;
    return (_jsxs("div", { style: {
            position: 'absolute',
            bottom: 12,
            left: 12,
            width: 420,
            maxWidth: 'calc(100vw - 24px)',
            background: COLORS.PANEL_BG,
            border: `1px solid ${COLORS.PANEL_BORDER}`,
            borderRadius: 5,
            padding: '10px 12px',
            zIndex: 60,
            fontFamily: 'monospace',
            fontSize: 10,
        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', marginBottom: 8 }, children: [_jsx("span", { style: { color: COLORS.PANEL_TEXT, letterSpacing: '0.06em', flex: 1 }, children: "DISPATCH CONTROL" }), _jsx("button", { type: "button", onClick: () => setOpen(false), style: { background: 'none', border: 'none', color: COLORS.PANEL_TEXT_DIM, cursor: 'pointer' }, children: "\u2212" })] }), _jsxs("div", { style: {
                    marginBottom: 10, padding: '6px 8px',
                    background: '#08121a', border: `1px solid ${COLORS.PANEL_BORDER}`, borderRadius: 3,
                }, children: [_jsx("div", { style: { color: COLORS.PANEL_TEXT_DIM, fontSize: 9, letterSpacing: '0.12em', marginBottom: 4 }, children: "LIVE" }), _jsxs("div", { style: { display: 'flex', gap: 14, color: COLORS.PANEL_TEXT, fontSize: 11 }, children: [_jsxs("span", { children: ["Dispatched: ", _jsx("b", { children: dispatchStatus?.count ?? 0 })] }), _jsxs("span", { children: ["Next:", ' ', dispatchStatus?.blocked
                                        ? _jsx("span", { style: { color: COLORS.SIGNAL_YELLOW }, children: "blocked" })
                                        : _jsxs("span", { children: ["~", Math.max(0, Math.ceil(dispatchStatus?.next_due_in_s ?? 0)), "s"] })] }), _jsxs("span", { children: ["Max: ", _jsx("b", { children: dispatchStatus?.max_trains ?? '—' })] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, color: COLORS.PANEL_TEXT_DIM, fontSize: 10, flexWrap: 'wrap' }, children: [_jsx("span", { style: { letterSpacing: '0.1em' }, children: "LIVE POLICY" }), _jsx(PolicyChip, { label: "Rule-based", active: livePolicy === 'rule', onClick: () => void applyLivePolicy('rule') }), _jsx(PolicyChip, { label: `PPO ${policyReady === false ? '(offline)' : ''}`, active: livePolicy === 'ppo', disabled: policyReady === false, onClick: () => void applyLivePolicy('ppo') }), dispatchStatus?.effective_headway_sec != null && (_jsxs("span", { style: { fontSize: 9 }, children: ["headway ", Math.round(dispatchStatus.effective_headway_sec), "s", dispatchStatus.shield_intervened ? ' · shield' : ''] }))] }), policySwitchError && (_jsx("div", { style: { color: COLORS.ERROR_BANNER, fontSize: 9, marginTop: 4 }, children: policySwitchError })), dispatchStatus?.ml_error && livePolicy === 'ppo' && (_jsxs("div", { style: { color: COLORS.SIGNAL_YELLOW, fontSize: 9, marginTop: 4 }, children: ["ML fallback: ", dispatchStatus.ml_error] }))] }), _jsxs("div", { style: { color: COLORS.PANEL_TEXT_DIM, marginBottom: 8, lineHeight: 1.4, fontSize: 10 }, children: [_jsx("b", { children: "A/B compare" }), " runs both policies offline on the same seed and reports the deltas below.", policyReady === false && (_jsx("span", { style: { color: COLORS.ERROR_BANNER, display: 'block', marginTop: 4 }, children: "ML API or policy missing \u2014 run npm run setup && npm run dev" }))] }), _jsxs("div", { style: { display: 'flex', gap: 8, marginBottom: 10 }, children: [_jsx("button", { type: "button", disabled: loading, onClick: () => void runCompare(), style: {
                            background: COLORS.BUTTON_ACTIVE,
                            color: '#fff',
                            border: 'none',
                            borderRadius: 3,
                            padding: '4px 10px',
                            cursor: loading ? 'default' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                        }, children: loading ? 'Running…' : 'Run comparison' }), data && (_jsxs("span", { style: { color: COLORS.PANEL_TEXT_DIM, alignSelf: 'center' }, children: [data.episodes, " ep \u00B7 seed ", data.seed] }))] }), error && _jsx("div", { style: { color: COLORS.ERROR_BANNER, marginBottom: 8 }, children: error }), _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', color: COLORS.PANEL_TEXT, fontSize: 10 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { color: COLORS.PANEL_TEXT_DIM, textAlign: 'left' }, children: [_jsx("th", { style: { padding: '2px 4px' }, children: "Metric" }), _jsx("th", { style: { padding: '2px 4px' }, children: "Rule" }), _jsx("th", { style: { padding: '2px 4px' }, children: "PPO" }), _jsx("th", { style: { padding: '2px 4px' }, children: "PPO vs rule" })] }) }), _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("td", { style: { padding: '2px 4px' }, children: "Mean delay (s)" }), _jsx("td", { children: rule ? fmt(rule.delay_mean_sec) : '—' }), _jsx("td", { children: ppo ? fmt(ppo.delay_mean_sec) : '—' }), _jsx("td", { style: { color: (delta?.delay_mean_sec_pct_vs_rule ?? 0) >= 0 ? COLORS.SIGNAL_GREEN : COLORS.SIGNAL_RED }, children: pct(delta?.delay_mean_sec_pct_vs_rule) })] }), _jsxs("tr", { children: [_jsx("td", { style: { padding: '2px 4px' }, children: "P95 delay (s)" }), _jsx("td", { children: rule ? fmt(rule.delay_p95_sec) : '—' }), _jsx("td", { children: ppo ? fmt(ppo.delay_p95_sec) : '—' }), _jsx("td", { children: pct(delta?.delay_p95_sec_pct_vs_rule) })] }), _jsxs("tr", { children: [_jsx("td", { style: { padding: '2px 4px' }, children: "Headway \u03C3 (s)" }), _jsx("td", { children: rule ? fmt(rule.headway_std_mean_sec, 0) : '—' }), _jsx("td", { children: ppo ? fmt(ppo.headway_std_mean_sec, 0) : '—' }), _jsx("td", { children: pct(delta?.headway_std_mean_sec_pct_vs_rule) })] }), _jsxs("tr", { children: [_jsx("td", { style: { padding: '2px 4px' }, children: "Shield rate" }), _jsx("td", { children: rule ? fmt(rule.unsafe_action_rate * 100, 1) + '%' : '—' }), _jsx("td", { children: ppo ? fmt(ppo.unsafe_action_rate * 100, 1) + '%' : '—' }), _jsx("td", { children: pct(delta?.unsafe_action_rate_pct_vs_rule) })] })] })] })] }));
}
function PolicyChip({ label, active, disabled, onClick, }) {
    return (_jsx("button", { type: "button", onClick: disabled ? undefined : onClick, disabled: disabled, style: {
            background: active ? COLORS.BUTTON_ACTIVE : COLORS.BUTTON_BG,
            color: disabled ? COLORS.PANEL_TEXT_DIM : COLORS.PANEL_TEXT,
            border: `1px solid ${active ? COLORS.BUTTON_ACTIVE : COLORS.PANEL_BORDER}`,
            borderRadius: 2,
            padding: '2px 8px',
            fontFamily: 'monospace',
            fontSize: 10,
            letterSpacing: '0.04em',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
        }, children: label }));
}
