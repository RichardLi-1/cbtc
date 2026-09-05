import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import posthog from 'posthog-js'
import { useRuntimeStore } from '../store/runtimeStore'
import { useConnectionStore, type EndpointHealth, type EndpointKey } from '../store/connectionStore'
import { useUiStore } from '../store/uiStore'
import { COLORS } from '../constants/colors'
import { isMlEnabled } from '../config/ml'
import { useIsMobile } from '../hooks/useIsMobile'
import { getHelpChatToggle } from './HelpChat'

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

const SERVICE_START_SEC = 6 * 3600  // 06:00 revenue start

function formatSimClock(simT: number | null | undefined): string {
  if (simT == null || !Number.isFinite(simT)) return '--:--:--'
  const total = Math.max(0, Math.floor(SERVICE_START_SEC + simT))
  const hh = Math.floor(total / 3600) % 24
  const mm = Math.floor((total % 3600) / 60)
  const ss = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`
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
  const { mockMode, endpoints } = useConnectionStore()
  const setInfoOpen = useUiStore((s) => s.setInfoOpen)
  const devMode = useUiStore((s) => s.devMode)
  const statusEps: { ep: EndpointKey; label: string }[] = [
    { ep: 'topology', label: '/topology' },
    { ep: 'state', label: '/state' },
    { ep: 'commands', label: '/commands' },
    ...(isMlEnabled() ? [{ ep: 'ml' as const, label: '/ml' }] : []),
  ]
  const visibleStatus = statusEps.filter(({ ep }) => devMode || endpoints[ep].health === 'error')

  const simClock = formatSimClock(runtime?.sim_time_s)
  const now = useWallClock()
  const isMobile = useIsMobile()

  return (
    <div
      data-help="header"
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
        // On phones the bar overflows its width. Scroll it horizontally instead
        // of letting items reflow — async-appearing badges (MOCK/STALE) would
        // otherwise shove the right-aligned buttons sideways (layout shift).
        overflowX: isMobile ? 'auto' : 'hidden',
        overflowY: 'hidden',
        whiteSpace: 'nowrap',
        scrollbarWidth: 'none',
      }}
    >
      {/* Title */}
      <span style={{ color: COLORS.PANEL_TEXT, fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.08em', marginRight: 8 }}>
        TRAIN TRAFFIC CONTROL
      </span>

      {/* Wall clock */}
      <span style={{ color: COLORS.PANEL_TEXT, fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.06em' }}>
        {formatClock(now)}
      </span>
      <span style={{ color: COLORS.PANEL_TEXT_DIM, fontFamily: 'monospace', fontSize: 11 }}>
        {formatDate(now)}
      </span>

      {/* Sim clock (HH:MM:SS from 06:00 service start) */}
      <span
        title="Simulated service time (starts 06:00)"
        style={{ color: COLORS.PANEL_TEXT_DIM, fontFamily: 'monospace', fontSize: 11 }}
      >
        SIM {simClock}
      </span>

      {visibleStatus.length > 0 && (
        <span data-help="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {devMode && (
            <span style={{ color: COLORS.PANEL_TEXT_DIM, fontFamily: 'monospace', fontSize: 10 }}>DEV</span>
          )}
          {visibleStatus.map(({ ep, label }) => (
            <EndpointDot key={ep} ep={ep} label={label} />
          ))}
        </span>
      )}

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

      <AccessMenu />

      <a
        href="https://github.com/RichardLi-1/cbtc"
        target="_blank"
        rel="noopener noreferrer"
        title="View source on GitHub"
        aria-label="GitHub"
        style={{
          background: COLORS.BUTTON_BG,
          color: COLORS.PANEL_TEXT,
          border: `1px solid ${COLORS.PANEL_BORDER}`,
          borderRadius: 3,
          padding: '3px 6px',
          display: 'inline-flex',
          alignItems: 'center',
          lineHeight: 0,
          textDecoration: 'none',
        }}
      >
        {/* Same mark hi-sg uses (lucide Github) — no image file in that repo. */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </svg>
      </a>

      <HelpBtn />

      <span data-help="info">
        <Btn label="INFO" onClick={() => { setInfoOpen(true); posthog.capture('info_panel_viewed') }} />
      </span>
      <span data-help="safe-zones">
        <Btn label={showSafeZones ? 'SAFE ZONES ●' : 'SAFE ZONES ○'} active={showSafeZones} onClick={toggleSafeZones} />
      </span>
      <span data-help="labels">
        <Btn label={showLabels ? 'LABELS ●' : 'LABELS ○'} active={showLabels} onClick={toggleLabels} />
      </span>
      {/* Train count */}
      <span style={{ color: COLORS.PANEL_TEXT_DIM, fontFamily: 'monospace', fontSize: 11 }}>
        {runtime?.trains?.length ?? 0} trains
      </span>
    </div>
  )
}

function AccessMenu() {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 38, right: 14 })
  const highContrast = useUiStore((s) => s.highContrast)
  const setHighContrast = useUiStore((s) => s.setHighContrast)
  const btn = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !btn.current) return
    const r = btn.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (btn.current?.contains(t) || menu.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div data-help="menu">
      <button
        ref={btn}
        type="button"
        aria-label="Accessibility menu"
        aria-expanded={open}
        aria-haspopup="true"
        title="Accessibility"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: open ? COLORS.BUTTON_ACTIVE : COLORS.BUTTON_BG,
          color: COLORS.PANEL_TEXT,
          border: `1px solid ${COLORS.PANEL_BORDER}`,
          borderRadius: 3,
          padding: '3px 6px',
          display: 'inline-flex',
          alignItems: 'center',
          lineHeight: 0,
          cursor: 'pointer',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      {open && createPortal(
        <div
          ref={menu}
          role="menu"
          style={{
            position: 'fixed',
            top: pos.top,
            right: pos.right,
            zIndex: 200,
            minWidth: 180,
            background: COLORS.PANEL_BG,
            border: `1px solid ${COLORS.PANEL_BORDER}`,
            borderRadius: 3,
            padding: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
          }}
        >
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={highContrast}
            onClick={() => setHighContrast(!highContrast)}
            style={{
              width: '100%',
              textAlign: 'left',
              background: highContrast ? COLORS.BUTTON_ACTIVE : COLORS.BUTTON_BG,
              color: COLORS.PANEL_TEXT,
              border: `1px solid ${COLORS.PANEL_BORDER}`,
              borderRadius: 3,
              padding: '6px 8px',
              fontFamily: 'monospace',
              fontSize: 11,
              cursor: 'pointer',
              letterSpacing: '0.03em',
            }}
          >
            High contrast {highContrast ? '●' : '○'}
          </button>
        </div>,
        document.body,
      )}
    </div>
  )
}

function HelpBtn() {
  const [, rerender] = useState(0)
  const { toggle, isOpen } = getHelpChatToggle()
  const kick = useCallback(() => rerender((n) => n + 1), [])
  useEffect(() => {
    window.addEventListener('click', kick)
    return () => window.removeEventListener('click', kick)
  }, [kick])
  return (
    <Btn label="GUIDE" active={isOpen} onClick={toggle} />
  )
}
