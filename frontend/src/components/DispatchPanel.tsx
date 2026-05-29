import { useCallback, useEffect, useState } from 'react'
import posthog from 'posthog-js'
import { fetchDispatchComparison, fetchDispatchPolicy, runDispatchCompare } from '../api/client'
import { useRuntimeStore } from '../store/runtimeStore'
import type { DispatchComparison } from '../types/domain'
import { COLORS } from '../constants/colors'

function fmt(n: number, digits = 1) {
  return Number.isFinite(n) ? n.toFixed(digits) : '—'
}

function pct(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

type LivePolicy = 'rule' | 'ppo'

export function DispatchPanel() {
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [policyReady, setPolicyReady] = useState<boolean | null>(null)
  const [data, setData] = useState<DispatchComparison | null>(null)
  const [livePolicy, setLivePolicy] = useState<LivePolicy>('rule')
  const dispatchStatus = useRuntimeStore((s) => s.runtime?.ops?.dispatch)

  const refreshPolicy = useCallback(async () => {
    try {
      const info = await fetchDispatchPolicy()
      setPolicyReady(info.exists)
    } catch {
      setPolicyReady(false)
    }
  }, [])

  const runCompare = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await runDispatchCompare({})
      setData(result)
      posthog.capture('dispatch_comparison_run', { episodes: result.episodes, seed: result.seed })
    } catch (err) {
      posthog.captureException(err instanceof Error ? err : new Error(String(err)))
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshPolicy()
    void fetchDispatchComparison()
      .then(setData)
      .catch(() => {
        /* no cached comparison yet */
      })
  }, [refreshPolicy])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
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
        }}
      >
        DISPATCH A/B
      </button>
    )
  }

  const rule = data?.rule_based
  const ppo = data?.ppo
  const delta = data?.delta_pct

  return (
    <div
      style={{
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
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: COLORS.PANEL_TEXT, letterSpacing: '0.06em', flex: 1 }}>
          DISPATCH CONTROL
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{ background: 'none', border: 'none', color: COLORS.PANEL_TEXT_DIM, cursor: 'pointer' }}
        >
          −
        </button>
      </div>

      {/* Live dispatch status — from /state ops.dispatch */}
      <div style={{
        marginBottom: 10, padding: '6px 8px',
        background: '#08121a', border: `1px solid ${COLORS.PANEL_BORDER}`, borderRadius: 3,
      }}>
        <div style={{ color: COLORS.PANEL_TEXT_DIM, fontSize: 9, letterSpacing: '0.12em', marginBottom: 4 }}>
          LIVE
        </div>
        <div style={{ display: 'flex', gap: 14, color: COLORS.PANEL_TEXT, fontSize: 11 }}>
          <span>Dispatched: <b>{dispatchStatus?.count ?? 0}</b></span>
          <span>
            Next:{' '}
            {dispatchStatus?.blocked
              ? <span style={{ color: COLORS.SIGNAL_YELLOW }}>blocked</span>
              : <span>~{Math.max(0, Math.ceil(dispatchStatus?.next_due_in_s ?? 0))}s</span>}
          </span>
          <span>Max: <b>{dispatchStatus?.max_trains ?? '—'}</b></span>
        </div>

        {/* Live policy selector — only 'rule' is wired in the live loop today. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, color: COLORS.PANEL_TEXT_DIM, fontSize: 10 }}>
          <span style={{ letterSpacing: '0.1em' }}>POLICY</span>
          <PolicyChip
            label="Rule-based"
            active={livePolicy === 'rule'}
            onClick={() => { setLivePolicy('rule'); posthog.capture('dispatch_policy_switched', { policy: 'rule' }) }}
          />
          <PolicyChip
            label={`PPO ${policyReady === false ? '(offline)' : '(beta)'}`}
            active={livePolicy === 'ppo'}
            disabled={policyReady === false}
            onClick={() => { setLivePolicy('ppo'); posthog.capture('dispatch_policy_switched', { policy: 'ppo' }) }}
          />
          <span style={{ color: COLORS.PANEL_TEXT_DIM, fontSize: 9 }}>
            {livePolicy === 'ppo' ? 'switch is UI-only — live loop runs the rule policy' : ''}
          </span>
        </div>
      </div>

      <div style={{ color: COLORS.PANEL_TEXT_DIM, marginBottom: 8, lineHeight: 1.4, fontSize: 10 }}>
        <b>A/B compare</b> runs both policies offline on the same seed and reports the deltas below.
        {policyReady === false && (
          <span style={{ color: COLORS.ERROR_BANNER, display: 'block', marginTop: 4 }}>
            ML API or policy missing — run npm run setup && npm run dev
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button
          type="button"
          disabled={loading}
          onClick={() => void runCompare()}
          style={{
            background: COLORS.BUTTON_ACTIVE,
            color: '#fff',
            border: 'none',
            borderRadius: 3,
            padding: '4px 10px',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Running…' : 'Run comparison'}
        </button>
        {data && (
          <span style={{ color: COLORS.PANEL_TEXT_DIM, alignSelf: 'center' }}>
            {data.episodes} ep · seed {data.seed}
          </span>
        )}
      </div>

      {error && <div style={{ color: COLORS.ERROR_BANNER, marginBottom: 8 }}>{error}</div>}

      <table style={{ width: '100%', borderCollapse: 'collapse', color: COLORS.PANEL_TEXT, fontSize: 10 }}>
        <thead>
          <tr style={{ color: COLORS.PANEL_TEXT_DIM, textAlign: 'left' }}>
            <th style={{ padding: '2px 4px' }}>Metric</th>
            <th style={{ padding: '2px 4px' }}>Rule</th>
            <th style={{ padding: '2px 4px' }}>PPO</th>
            <th style={{ padding: '2px 4px' }}>PPO vs rule</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '2px 4px' }}>Mean delay (s)</td>
            <td>{rule ? fmt(rule.delay_mean_sec) : '—'}</td>
            <td>{ppo ? fmt(ppo.delay_mean_sec) : '—'}</td>
            <td style={{ color: (delta?.delay_mean_sec_pct_vs_rule ?? 0) >= 0 ? COLORS.SIGNAL_GREEN : COLORS.SIGNAL_RED }}>
              {pct(delta?.delay_mean_sec_pct_vs_rule)}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '2px 4px' }}>P95 delay (s)</td>
            <td>{rule ? fmt(rule.delay_p95_sec) : '—'}</td>
            <td>{ppo ? fmt(ppo.delay_p95_sec) : '—'}</td>
            <td>{pct(delta?.delay_p95_sec_pct_vs_rule)}</td>
          </tr>
          <tr>
            <td style={{ padding: '2px 4px' }}>Headway σ (s)</td>
            <td>{rule ? fmt(rule.headway_std_mean_sec, 0) : '—'}</td>
            <td>{ppo ? fmt(ppo.headway_std_mean_sec, 0) : '—'}</td>
            <td>{pct(delta?.headway_std_mean_sec_pct_vs_rule)}</td>
          </tr>
          <tr>
            <td style={{ padding: '2px 4px' }}>Shield rate</td>
            <td>{rule ? fmt(rule.unsafe_action_rate * 100, 1) + '%' : '—'}</td>
            <td>{ppo ? fmt(ppo.unsafe_action_rate * 100, 1) + '%' : '—'}</td>
            <td>{pct(delta?.unsafe_action_rate_pct_vs_rule)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function PolicyChip({
  label, active, disabled, onClick,
}: { label: string; active: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
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
      }}
    >
      {label}
    </button>
  )
}
