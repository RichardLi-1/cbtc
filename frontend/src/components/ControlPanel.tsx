import { useRuntimeStore } from '../store/runtimeStore'
import { COLORS } from '../constants/colors'
import { MOCK_MODE } from '../api/client'

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

export function ControlPanel() {
  const { runtime, stale, commandError, showSafeZones, showLabels, clearCommandError, toggleSafeZones, toggleLabels } =
    useRuntimeStore()

  const ts = runtime?.timestamp?.toFixed(1) ?? '—'

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

      {/* Sim clock */}
      <span style={{ color: COLORS.PANEL_TEXT_DIM, fontFamily: 'monospace', fontSize: 11 }}>
        T+{ts}s
      </span>

      {/* Mock badge */}
      {MOCK_MODE && (
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

      <Btn label={showSafeZones ? 'SAFE ZONES ●' : 'SAFE ZONES ○'} active={showSafeZones} onClick={toggleSafeZones} />
      <Btn label={showLabels ? 'LABELS ●' : 'LABELS ○'} active={showLabels} onClick={toggleLabels} />

      {/* Train count */}
      <span style={{ color: COLORS.PANEL_TEXT_DIM, fontFamily: 'monospace', fontSize: 11 }}>
        {runtime?.trains.length ?? 0} trains
      </span>
    </div>
  )
}
