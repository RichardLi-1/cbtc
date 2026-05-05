/**
 * Hidden config panel — toggle with Ctrl+Shift+C.
 * Manages rolling stock profiles, headway targets, and event injection.
 */
import { useState } from 'react'
import { useRuntimeStore } from '../store/runtimeStore'
import { COLORS } from '../constants/colors'
import type { EventKind, RollingStockProfile } from '../types/domain'

const EVENT_KINDS: EventKind[] = ['emergency_brake', 'door_fault', 'slow_speed', 'signal_fail']

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ color: COLORS.PANEL_TEXT_DIM, fontSize: 11, fontFamily: 'monospace', width: 140, flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  )
}

function NumInput({ value, min, max, step, onChange }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={e => onChange(Number(e.target.value))}
      style={{
        width: 70,
        background: COLORS.BUTTON_BG,
        color: COLORS.PANEL_TEXT,
        border: `1px solid ${COLORS.PANEL_BORDER}`,
        borderRadius: 3,
        padding: '2px 5px',
        fontFamily: 'monospace',
        fontSize: 11,
      }}
    />
  )
}

export function ConfigPanel({ open }: { open: boolean }) {
  const { config, runtime, updateConfig } = useRuntimeStore()
  const [newEventKind, setNewEventKind] = useState<EventKind>('emergency_brake')
  const [newEventTrain, setNewEventTrain] = useState('T01')
  const [newEventDur, setNewEventDur] = useState(30)

  if (!open) return null

  const activeProfile: RollingStockProfile | undefined =
    config.profiles.find(p => p.id === config.active_profile)

  function patchProfile(patch: Partial<RollingStockProfile>) {
    if (!activeProfile) return
    updateConfig({
      profiles: config.profiles.map(p =>
        p.id === activeProfile.id ? { ...p, ...patch } : p,
      ),
    })
  }

  function addEvent() {
    const evt = {
      id: `evt_${Date.now()}`,
      kind: newEventKind,
      target_train_id: newEventTrain,
      duration_s: newEventDur,
      active: true,
    }
    updateConfig({ injected_events: [...config.injected_events, evt] })
  }

  function removeEvent(id: string) {
    updateConfig({ injected_events: config.injected_events.filter(e => e.id !== id) })
  }

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 46,
    right: 14,
    width: 340,
    background: COLORS.PANEL_BG,
    border: `1px solid ${COLORS.PANEL_BORDER}`,
    borderRadius: 5,
    padding: '12px 16px',
    zIndex: 200,
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 70px)',
  }

  const section = (title: string) => (
    <div style={{ color: COLORS.PANEL_TEXT, fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.06em', borderBottom: `1px solid ${COLORS.PANEL_BORDER}`, paddingBottom: 4, marginBottom: 10, marginTop: 14 }}>
      {title}
    </div>
  )

  return (
    <div style={panelStyle}>
      <div style={{ color: COLORS.PANEL_TEXT, fontFamily: 'monospace', fontSize: 13, marginBottom: 12 }}>
        ⚙ SIM CONFIG <span style={{ color: COLORS.PANEL_TEXT_DIM, fontSize: 10 }}>(Ctrl+Shift+C)</span>
      </div>

      {section('OPERATIONS')}
      <Row label="Rolling stock %">
        <input
          type="range"
          min={10}
          max={100}
          step={5}
          value={config.rolling_stock_pct}
          onChange={e => updateConfig({ rolling_stock_pct: Number(e.target.value) })}
          style={{ flex: 1 }}
        />
        <span style={{ color: COLORS.PANEL_TEXT, fontFamily: 'monospace', fontSize: 11, width: 32 }}>
          {config.rolling_stock_pct}%
        </span>
      </Row>
      <Row label="Headway target (s)">
        <NumInput value={config.headway_target} min={30} max={600} step={10} onChange={v => updateConfig({ headway_target: v })} />
      </Row>

      {section(`ROLLING STOCK — ${activeProfile?.name ?? '—'}`)}
      {activeProfile && (
        <>
          <Row label="Max speed (m/s)">
            <NumInput value={activeProfile.max_speed} min={5} max={35} step={0.5} onChange={v => patchProfile({ max_speed: v })} />
            <span style={{ color: COLORS.PANEL_TEXT_DIM, fontSize: 10, fontFamily: 'monospace' }}>({(activeProfile.max_speed * 3.6).toFixed(0)} km/h)</span>
          </Row>
          <Row label="Accel (m/s²)">
            <NumInput value={activeProfile.accel} min={0.3} max={3} step={0.1} onChange={v => patchProfile({ accel: v })} />
          </Row>
          <Row label="Decel (m/s²)">
            <NumInput value={activeProfile.decel} min={0.5} max={4} step={0.1} onChange={v => patchProfile({ decel: v })} />
          </Row>
          <Row label="Length (m)">
            <NumInput value={activeProfile.length} min={20} max={200} step={1} onChange={v => patchProfile({ length: v })} />
          </Row>
          <Row label="Mass (t)">
            <NumInput value={activeProfile.mass} min={50} max={500} step={10} onChange={v => patchProfile({ mass: v })} />
          </Row>
        </>
      )}

      {section('EVENT INJECTION')}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <select
          value={newEventKind}
          onChange={e => setNewEventKind(e.target.value as EventKind)}
          style={{ background: COLORS.BUTTON_BG, color: COLORS.PANEL_TEXT, border: `1px solid ${COLORS.PANEL_BORDER}`, borderRadius: 3, fontSize: 11, fontFamily: 'monospace', padding: '2px 4px' }}
        >
          {EVENT_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <select
          value={newEventTrain}
          onChange={e => setNewEventTrain(e.target.value)}
          style={{ background: COLORS.BUTTON_BG, color: COLORS.PANEL_TEXT, border: `1px solid ${COLORS.PANEL_BORDER}`, borderRadius: 3, fontSize: 11, fontFamily: 'monospace', padding: '2px 4px' }}
        >
          {(runtime?.trains ?? []).map(t => <option key={t.train_id} value={t.train_id}>{t.label}</option>)}
        </select>
        <NumInput value={newEventDur} min={5} max={300} step={5} onChange={setNewEventDur} />
        <button
          onClick={addEvent}
          style={{ background: COLORS.BUTTON_ACTIVE, color: '#fff', border: 'none', borderRadius: 3, padding: '2px 10px', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer' }}
        >
          Inject
        </button>
      </div>
      {config.injected_events.length === 0 && (
        <div style={{ color: COLORS.PANEL_TEXT_DIM, fontSize: 10, fontFamily: 'monospace' }}>No active events</div>
      )}
      {config.injected_events.map(evt => (
        <div key={evt.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ color: COLORS.SIGNAL_YELLOW, fontFamily: 'monospace', fontSize: 10 }}>
            [{evt.target_train_id}] {evt.kind} {evt.duration_s}s
          </span>
          <button
            onClick={() => removeEvent(evt.id)}
            style={{ background: 'none', border: 'none', color: COLORS.ERROR_BANNER, fontSize: 13, cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
