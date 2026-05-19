import { useState } from 'react'
import { useConnectionStore, type EndpointKey } from '../store/connectionStore'
import { COLORS } from '../constants/colors'

const HINTS: Record<EndpointKey, string> = {
  topology: 'Start backend: cd backend && ./venv/bin/uvicorn main:app --reload --port 8000 (or ./dev.sh from repo root).',
  state:    'Same as /topology — ensure Vite dev server is running so /state proxies to :8000.',
  commands: 'POST /commands/switch/{id} and /commands/signal/{id} — backend must be up; click only affects sim when connected.',
}

export function BackendNotice() {
  const { endpoints, dismissError } = useConnectionStore()
  const [collapsed, setCollapsed] = useState(false)

  const errors = (Object.entries(endpoints) as [EndpointKey, typeof endpoints[EndpointKey]][])
    .filter(([, info]) => info.health === 'error' && info.error !== null)

  if (errors.length === 0) return null

  return (
    <div
      style={{
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
      }}
    >
      {/* Header */}
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 10px',
          cursor: 'pointer',
          background: '#101e12',
          borderBottom: collapsed ? 'none' : `1px solid #2a4a20`,
          userSelect: 'none',
        }}
      >
        <span style={{ color: COLORS.SIGNAL_RED, fontSize: 13, lineHeight: 1 }}>■</span>
        <span style={{ color: COLORS.PANEL_TEXT, letterSpacing: '0.06em' }}>
          BACKEND ISSUES ({errors.length})
        </span>
        <span style={{ color: COLORS.PANEL_TEXT_DIM, marginLeft: 'auto' }}>
          {collapsed ? '▸' : '▾'}
        </span>
      </div>

      {/* Error list */}
      {!collapsed && (
        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {errors.map(([ep, info]) => (
            <div key={ep} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: COLORS.SIGNAL_RED }}>✕</span>
                <span style={{ color: COLORS.PANEL_TEXT, fontWeight: 'bold' }}>/{ep}</span>
                <span
                  onClick={() => dismissError(ep)}
                  style={{ marginLeft: 'auto', color: COLORS.PANEL_TEXT_DIM, cursor: 'pointer', fontSize: 13, lineHeight: 1 }}
                  title="Dismiss"
                >
                  ×
                </span>
              </div>
              <div style={{ color: COLORS.SIGNAL_YELLOW, paddingLeft: 16 }}>
                {info.error}
              </div>
              <div style={{ color: COLORS.PANEL_TEXT_DIM, paddingLeft: 16 }}>
                {HINTS[ep]}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
