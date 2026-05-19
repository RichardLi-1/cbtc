import { useState, useEffect } from 'react'
import { useRuntimeStore } from '../store/runtimeStore'
import { useConnectionStore, type EndpointHealth, type EndpointKey } from '../store/connectionStore'
import { useUiStore } from '../store/uiStore'
import { COLORS } from '../constants/colors'

function useWallClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function formatClock(d: Date) {
  return d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: '2-digit' })
}

interface BtnProps {
  label: string
  active?: boolean
  danger?: boolean
  onClick: () => void
}

function Btn({ label, active, danger, onClick }: BtnProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? COLORS.BUTTON_ACTIVE : COLORS.BUTTON_BG,
        color: danger ? COLORS.ERROR_BANNER : COLORS.PANEL_TEXT,
        border: `1px solid ${COLORS.PANEL_BORDER}`,
        borderRadius: 3,
        padding: '3px 10px',
        fontSize: 11,
        fontFamily: 'monospace',
        cursor: 'pointer',
        letterSpacing: '0.03em',
      }}
    >
      {label}
    </button>
  )
}

const DOT_COLOR: Record<EndpointHealth, string> = {
  untested: COLORS.PANEL_TEXT_DIM,
  ok: COLORS.SIGNAL_GREEN,
  error: COLORS.SIGNAL_RED,
}

function EndpointDot({ ep, label }: { ep: EndpointKey; label: string }) {
  const info = useConnectionStore((s) => s.endpoints[ep])
  return (
    <span
      title={info.error ?? (info.health === 'ok' ? `${label} OK` : `${label} not yet tested`)}
      style={{
        color: DOT_COLOR[info.health],
        fontFamily: 'monospace',
        fontSize: 10,
        letterSpacing: '0.04em',
        cursor: info.error ? 'help' : 'default',
      }}
    >
      ● {label}
    </span>
  )
}

export function ControlPanel() {
  const { runtime, stale, commandError, showSafeZones, showLabels, clearCommandError, toggleSafeZones, toggleLabels } =
    useRuntimeStore()
  const { mockMode } = useConnectionStore()
  const setInfoOpen = useUiStore((s) => s.setInfoOpen)

  const ts = runtime?.timestamp?.toFixed(1) ?? '—'
  const now = useWallClock()

  return (
    <div
      style={{
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
      }}
    >
      {/* Title */}
      <span style={{ color: COLORS.PANEL_TEXT, fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.08em', marginRight: 8 }}>
        CBTC DISPATCH
      </span>

      {/* Wall clock */}
      <span style={{ color: COLORS.PANEL_TEXT, fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.06em' }}>
        {formatClock(now)}
      </span>
      <span style={{ color: COLORS.PANEL_TEXT_DIM, fontFamily: 'monospace', fontSize: 11 }}>
        {formatDate(now)}
      </span>

      {/* Sim clock */}
      <span style={{ color: COLORS.PANEL_TEXT_DIM, fontFamily: 'monospace', fontSize: 11 }}>
        T+{ts}s
      </span>

      {/* Endpoint health dots */}
      <EndpointDot ep="topology" label="/topology" />
      <EndpointDot ep="state" label="/state" />
      <EndpointDot ep="commands" label="/commands" />

      {/* Mock badge */}
      {mockMode && (
        <span style={{ color: COLORS.SIGNAL_YELLOW, fontFamily: 'monospace', fontSize: 10, border: `1px solid ${COLORS.SIGNAL_YELLOW}`, padding: '1px 5px', borderRadius: 2 }}>
          MOCK
        </span>
      )}

      {/* Stale banner */}
      {stale && (
        <span style={{ color: COLORS.STALE_BANNER, fontFamily: 'monospace', fontSize: 11 }}>
          ⚠ STALE DATA
        </span>
      )}

      {/* Command error */}
      {commandError && (
        <span
          onClick={clearCommandError}
          style={{ color: COLORS.ERROR_BANNER, fontFamily: 'monospace', fontSize: 11, cursor: 'pointer', background: '#1a0000', padding: '2px 6px', borderRadius: 2 }}
          title="Click to dismiss"
        >
          ✕ {commandError}
        </span>
      )}

      <div style={{ flex: 1 }} />

      <Btn label="INFO" onClick={() => setInfoOpen(true)} />
      <Btn label={showSafeZones ? 'SAFE ZONES ●' : 'SAFE ZONES ○'} active={showSafeZones} onClick={toggleSafeZones} />
      <Btn label={showLabels ? 'LABELS ●' : 'LABELS ○'} active={showLabels} onClick={toggleLabels} />

      {/* Train count */}
      <span style={{ color: COLORS.PANEL_TEXT_DIM, fontFamily: 'monospace', fontSize: 11 }}>
        {runtime?.trains?.length ?? 0} trains
      </span>
    </div>
  )
}
