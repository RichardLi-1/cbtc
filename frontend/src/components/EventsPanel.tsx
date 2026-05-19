import { useState, useMemo } from 'react'
import { useEventsStore, type EventSeverity, type EventSource, type SimEvent } from '../store/eventsStore'
import { useRuntimeStore } from '../store/runtimeStore'
import { useTopologyStore } from '../store/topologyStore'
import { COLORS } from '../constants/colors'

const SEV_COLOR: Record<EventSeverity, string> = {
  info: COLORS.PANEL_TEXT,
  warn: COLORS.SIGNAL_YELLOW,
  error: COLORS.SIGNAL_RED,
}

const SRC_COLOR: Record<EventSource, string> = {
  system: COLORS.PANEL_TEXT_DIM,
  wayside: '#4fc3f7',
  driver: '#ce93d8',
  manual: '#ffb74d',
}

function fmtSimT(t: number | null) {
  if (t == null) return '——————'
  return `T+${t.toFixed(1)}s`.padEnd(10, ' ')
}

const PANEL_WIDTH = 340
const HEADER_H = 38

export function EventsPanel() {
  const { events, paused, panelOpen, injectOpen, togglePaused, clear, setPanelOpen, setInjectOpen } = useEventsStore()

  if (!panelOpen) {
    return (
      <div
        onClick={() => setPanelOpen(true)}
        style={{
          position: 'absolute', top: HEADER_H + 8, right: 8, zIndex: 60,
          background: COLORS.PANEL_BG, border: `1px solid ${COLORS.PANEL_BORDER}`,
          color: COLORS.PANEL_TEXT, fontFamily: 'monospace', fontSize: 11,
          padding: '4px 8px', cursor: 'pointer', borderRadius: 3, letterSpacing: '0.08em',
        }}
        title="Open events panel"
      >
        EVENTS ◀ {events.length > 0 && <span style={{ color: COLORS.PANEL_TEXT_DIM }}>({events.length})</span>}
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'absolute', top: HEADER_H, right: 0, bottom: 0, width: PANEL_WIDTH, zIndex: 60,
        background: COLORS.PANEL_BG, borderLeft: `1px solid ${COLORS.PANEL_BORDER}`,
        display: 'flex', flexDirection: 'column',
        fontFamily: 'monospace', fontSize: 11, color: COLORS.PANEL_TEXT,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '8px 10px', borderBottom: `1px solid ${COLORS.PANEL_BORDER}`,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ letterSpacing: '0.1em', flex: 1 }}>EVENTS</span>
        <span style={{ color: COLORS.PANEL_TEXT_DIM, fontSize: 10 }}>{events.length}</span>
        <MiniBtn label={paused ? 'RESUME' : 'PAUSE'} onClick={togglePaused} active={paused} />
        <MiniBtn label="CLEAR" onClick={clear} />
        <MiniBtn label="✕" onClick={() => setPanelOpen(false)} title="Hide panel" />
      </div>

      {/* Inject toggle */}
      <div
        onClick={() => setInjectOpen(!injectOpen)}
        style={{
          padding: '6px 10px', borderBottom: `1px solid ${COLORS.PANEL_BORDER}`,
          cursor: 'pointer', color: COLORS.PANEL_TEXT_DIM, fontSize: 10, letterSpacing: '0.1em',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span>{injectOpen ? '▾' : '▸'} INJECT EVENT</span>
        <span style={{ color: COLORS.PANEL_TEXT_DIM }}>{injectOpen ? '' : 'expand'}</span>
      </div>

      {injectOpen && <InjectPane />}

      {/* Event list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {events.length === 0 && (
          <div style={{ padding: 14, color: COLORS.PANEL_TEXT_DIM, fontSize: 11 }}>
            no events yet — system idle.
          </div>
        )}
        {events.map((e) => <EventRow key={e.id} e={e} />)}
      </div>
    </div>
  )
}

function EventRow({ e }: { e: SimEvent }) {
  return (
    <div style={{
      padding: '4px 10px', borderBottom: `1px solid #0d1620`,
      display: 'grid', gridTemplateColumns: '64px 38px 36px 1fr', gap: 6, alignItems: 'baseline',
      fontSize: 11, lineHeight: 1.35,
    }}>
      <span style={{ color: COLORS.PANEL_TEXT_DIM, fontSize: 10 }}>{fmtSimT(e.simT)}</span>
      <span style={{ color: SRC_COLOR[e.source], fontSize: 10, letterSpacing: '0.05em' }}>{e.source.toUpperCase()}</span>
      <span style={{ color: SEV_COLOR[e.severity], fontSize: 10 }}>{e.kind}</span>
      <span style={{ color: SEV_COLOR[e.severity] }}>{e.message}</span>
    </div>
  )
}

// ── Inject pane ────────────────────────────────────────────────────────────

type InjectKind = 'eb_apply' | 'eb_release' | 'switch_fail' | 'speed_restrict' | 'station_hold' | 'note'

const KIND_LABEL: Record<InjectKind, string> = {
  eb_apply:       'Emergency brake — apply',
  eb_release:     'Emergency brake — release',
  switch_fail:    'Switch failure',
  speed_restrict: 'Temporary speed restriction',
  station_hold:   'Hold at station',
  note:           'Operator note',
}

const KIND_DEFAULTS: Record<InjectKind, { kind: string; severity: EventSeverity; source: 'driver' | 'manual' | 'wayside' }> = {
  eb_apply:       { kind: 'EB',     severity: 'error', source: 'driver'  },
  eb_release:     { kind: 'EB',     severity: 'info',  source: 'driver'  },
  switch_fail:    { kind: 'SW',     severity: 'error', source: 'wayside' },
  speed_restrict: { kind: 'TSR',    severity: 'warn',  source: 'wayside' },
  station_hold:   { kind: 'HOLD',   severity: 'warn',  source: 'wayside' },
  note:           { kind: 'NOTE',   severity: 'info',  source: 'manual'  },
}

function InjectPane() {
  const { runtime, sendSwitchCommand } = useRuntimeStore()
  const topology = useTopologyStore((s) => s.topology)
  const append = useEventsStore((s) => s.append)

  const [kind, setKind] = useState<InjectKind>('speed_restrict')
  const [target, setTarget] = useState<string>('')
  const [value, setValue] = useState<string>('')
  const [note, setNote] = useState<string>('')

  const targetOptions = useMemo(() => {
    if (kind === 'eb_apply' || kind === 'eb_release' || kind === 'station_hold') {
      return runtime?.trains.map((t) => t.train_id) ?? []
    }
    if (kind === 'switch_fail') {
      return topology?.switches.map((s) => s.id) ?? []
    }
    if (kind === 'speed_restrict') {
      return topology?.edges.map((e) => e.id) ?? []
    }
    return []
  }, [kind, runtime, topology])

  const targetLabel: Record<InjectKind, string> = {
    eb_apply: 'Train', eb_release: 'Train', station_hold: 'Train',
    switch_fail: 'Switch', speed_restrict: 'Edge', note: '',
  }

  const needsValue = kind === 'speed_restrict'

  function submit() {
    const meta = KIND_DEFAULTS[kind]
    const parts: string[] = [KIND_LABEL[kind]]
    if (target) parts.push(target)
    if (needsValue && value) parts.push(`${value} km/h`)
    if (note.trim()) parts.push(`— ${note.trim()}`)
    const message = parts.join(' ')

    append({ source: meta.source, severity: meta.severity, kind: meta.kind, message })

    // Side effect: switch_fail flips the switch via existing command path
    if (kind === 'switch_fail' && target) {
      const cur = runtime?.switches.find((s) => s.switch_id === target)?.state
      const next = cur === 'normal' ? 'reverse' : 'normal'
      sendSwitchCommand(target, next)
    }

    setNote('')
    setValue('')
  }

  return (
    <div style={{
      padding: '8px 10px', borderBottom: `1px solid ${COLORS.PANEL_BORDER}`,
      background: '#08121a', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <Row label="Type">
        <select
          value={kind}
          onChange={(e) => { setKind(e.target.value as InjectKind); setTarget(''); setValue('') }}
          style={selectStyle}
        >
          {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Row>

      {targetLabel[kind] && (
        <Row label={targetLabel[kind]}>
          <select value={target} onChange={(e) => setTarget(e.target.value)} style={selectStyle}>
            <option value="">— select —</option>
            {targetOptions.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </Row>
      )}

      {needsValue && (
        <Row label="Limit">
          <input
            type="number" min={0} max={120} placeholder="km/h"
            value={value} onChange={(e) => setValue(e.target.value)}
            style={inputStyle}
          />
        </Row>
      )}

      <Row label="Note">
        <input
          type="text" placeholder="optional"
          value={note} onChange={(e) => setNote(e.target.value)}
          style={inputStyle}
        />
      </Row>

      <button onClick={submit} style={{
        marginTop: 4, background: COLORS.BUTTON_ACTIVE, color: '#fff',
        border: 'none', borderRadius: 3, padding: '5px 10px',
        fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer',
      }}>
        INJECT ▸
      </button>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  flex: 1, background: COLORS.BUTTON_BG, color: COLORS.PANEL_TEXT,
  border: `1px solid ${COLORS.PANEL_BORDER}`, borderRadius: 2,
  padding: '3px 5px', fontFamily: 'monospace', fontSize: 11,
}

const inputStyle: React.CSSProperties = {
  ...selectStyle,
  padding: '3px 6px',
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: COLORS.PANEL_TEXT_DIM, fontSize: 10, width: 50, letterSpacing: '0.06em' }}>{label}</span>
      {children}
    </div>
  )
}

function MiniBtn({ label, onClick, active, title }: { label: string; onClick: () => void; active?: boolean; title?: string }) {
  return (
    <button
      onClick={onClick} title={title}
      style={{
        background: active ? COLORS.BUTTON_ACTIVE : COLORS.BUTTON_BG,
        color: COLORS.PANEL_TEXT, border: `1px solid ${COLORS.PANEL_BORDER}`,
        borderRadius: 2, padding: '2px 6px', fontFamily: 'monospace', fontSize: 10,
        letterSpacing: '0.06em', cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}
