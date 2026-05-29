/**
 * Hidden config panel — toggle with Ctrl+Shift+C.
 * Manages rolling stock profiles, headway targets, and event injection.
 */
import { useEffect, useState } from 'react'
import { useRuntimeStore } from '../store/runtimeStore'
import { useTrainingStore } from '../store/trainingStore'
import { COLORS } from '../constants/colors'
import { cancelEvent, injectEvent } from '../api/client'
import { isMlEnabled } from '../config/ml'
import type { EventKind, RollingStockProfile } from '../types/domain'

const EVENT_KINDS: EventKind[] = ['emergency_brake', 'door_fault', 'slow_speed', 'signal_fail', 'station_hold']

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

const TRAINING_CONFIGS = ['ppo_smoke.yaml', 'ppo_baseline.yaml', 'rule_based_smoke.yaml']

export function ConfigPanel({ open }: { open: boolean }) {
  const { config, runtime, updateConfig } = useRuntimeStore()
  const {
    persistCheckpoints,
    resumeTraining,
    configName,
    status: trainingStatus,
    error: trainingError,
    setPersistCheckpoints,
    setResumeTraining,
    setConfigName,
    start: startTraining,
    stop: stopTraining,
    startPolling: startTrainingPoll,
    stopPolling: stopTrainingPoll,
    refreshStatus,
  } = useTrainingStore()
  const [newEventKind, setNewEventKind] = useState<EventKind>('emergency_brake')
  const [newEventTrain, setNewEventTrain] = useState('T01')
  const [newEventSignal, setNewEventSignal] = useState('')
  const [newEventDur, setNewEventDur] = useState(30)
  const [newEventDelay, setNewEventDelay] = useState(0)
  const [newEventTsr, setNewEventTsr] = useState(25)
  const [injectError, setInjectError] = useState<string | null>(null)

  const activeIncidents = runtime?.ops?.injected_events ?? []

  useEffect(() => {
    if (!open) {
      stopTrainingPoll()
      return
    }
    void refreshStatus()
    startTrainingPoll()
    return () => stopTrainingPoll()
  }, [open, refreshStatus, startTrainingPoll, stopTrainingPoll])

  if (!open) return null

  const trainingRunning = Boolean(trainingStatus?.running)
  const done = trainingStatus?.completed_timesteps ?? 0
  const total = trainingStatus?.total_timesteps ?? 0
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0

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

  async function addEvent() {
    setInjectError(null)
    try {
      await injectEvent({
        kind: newEventKind,
        target_train_id: newEventKind === 'signal_fail' ? undefined : newEventTrain,
        target_signal_id: newEventKind === 'signal_fail' ? newEventSignal : undefined,
        speed_limit_kph: newEventKind === 'slow_speed' ? newEventTsr : undefined,
        duration_s: newEventDur,
        starts_in_s: newEventDelay,
      })
    } catch (err) {
      setInjectError(String(err))
    }
  }

  async function removeEvent(id: string) {
    setInjectError(null)
    try {
      await cancelEvent(id)
    } catch (err) {
      setInjectError(String(err))
    }
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

      {isMlEnabled() && section('RL TRAINING')}
      {isMlEnabled() && (
      <>
      <Row label="Experiment">
        <select
          value={configName}
          onChange={e => setConfigName(e.target.value)}
          disabled={trainingRunning}
          style={{
            flex: 1,
            background: COLORS.BUTTON_BG,
            color: COLORS.PANEL_TEXT,
            border: `1px solid ${COLORS.PANEL_BORDER}`,
            borderRadius: 3,
            fontSize: 11,
            fontFamily: 'monospace',
            padding: '2px 4px',
          }}
        >
          {TRAINING_CONFIGS.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Row>
      <Row label="Save checkpoints">
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: COLORS.PANEL_TEXT, fontSize: 11, fontFamily: 'monospace' }}>
          <input
            type="checkbox"
            checked={persistCheckpoints}
            onChange={e => setPersistCheckpoints(e.target.checked)}
            disabled={trainingRunning}
          />
          persist across runs
        </label>
      </Row>
      <Row label="Resume">
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: COLORS.PANEL_TEXT, fontSize: 11, fontFamily: 'monospace' }}>
          <input
            type="checkbox"
            checked={resumeTraining}
            onChange={e => setResumeTraining(e.target.checked)}
            disabled={trainingRunning}
          />
          continue from last checkpoint
        </label>
      </Row>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => void startTraining()}
          disabled={trainingRunning}
          style={{
            background: COLORS.BUTTON_ACTIVE,
            color: '#fff',
            border: 'none',
            borderRadius: 3,
            padding: '4px 12px',
            fontSize: 11,
            fontFamily: 'monospace',
            cursor: trainingRunning ? 'default' : 'pointer',
            opacity: trainingRunning ? 0.5 : 1,
          }}
        >
          Start
        </button>
        <button
          onClick={() => void stopTraining()}
          disabled={!trainingRunning}
          style={{
            background: COLORS.BUTTON_BG,
            color: COLORS.PANEL_TEXT,
            border: `1px solid ${COLORS.PANEL_BORDER}`,
            borderRadius: 3,
            padding: '4px 12px',
            fontSize: 11,
            fontFamily: 'monospace',
            cursor: !trainingRunning ? 'default' : 'pointer',
            opacity: !trainingRunning ? 0.5 : 1,
          }}
        >
          Stop
        </button>
      </div>
      <div style={{ color: COLORS.PANEL_TEXT_DIM, fontSize: 10, fontFamily: 'monospace', marginBottom: 8 }}>
        {trainingRunning ? 'running' : (trainingStatus?.status ?? 'idle')}
        {total > 0 ? ` — ${done.toLocaleString()} / ${total.toLocaleString()} (${pct}%)` : ''}
        {trainingStatus?.last_checkpoint ? ` — ${trainingStatus.last_checkpoint}` : ''}
      </div>
      {trainingError && (
        <div style={{ color: COLORS.ERROR_BANNER, fontSize: 10, fontFamily: 'monospace', marginBottom: 8 }}>
          {trainingError}
        </div>
      )}
      <div style={{ color: COLORS.PANEL_TEXT_DIM, fontSize: 9, fontFamily: 'monospace', marginBottom: 4 }}>
        Run <code style={{ fontSize: 9 }}>npm run dev</code> (ML on :8001). Checkpoints → runs/&lt;name&gt;/latest/. Copy policy.zip to ml/models/deployed/ for everyone.
      </div>
      </>
      )}

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
        {newEventKind === 'signal_fail' ? (
          <select
            value={newEventSignal}
            onChange={e => setNewEventSignal(e.target.value)}
            style={{ background: COLORS.BUTTON_BG, color: COLORS.PANEL_TEXT, border: `1px solid ${COLORS.PANEL_BORDER}`, borderRadius: 3, fontSize: 11, fontFamily: 'monospace', padding: '2px 4px', maxWidth: 120 }}
          >
            <option value="">signal</option>
            {(runtime?.signals ?? []).map(s => <option key={s.signal_id} value={s.signal_id}>{s.signal_id}</option>)}
          </select>
        ) : null}
        <NumInput value={newEventDur} min={5} max={300} step={5} onChange={setNewEventDur} />
        <NumInput value={newEventDelay} min={0} max={120} step={5} onChange={setNewEventDelay} />
        {newEventKind === 'slow_speed' && (
          <NumInput value={newEventTsr} min={5} max={80} step={5} onChange={setNewEventTsr} />
        )}
        <button
          onClick={() => void addEvent()}
          style={{ background: COLORS.BUTTON_ACTIVE, color: '#fff', border: 'none', borderRadius: 3, padding: '2px 10px', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer' }}
        >
          Inject
        </button>
      </div>
      {injectError && (
        <div style={{ color: COLORS.ERROR_BANNER, fontSize: 10, fontFamily: 'monospace', marginBottom: 6 }}>{injectError}</div>
      )}
      {activeIncidents.length === 0 && (
        <div style={{ color: COLORS.PANEL_TEXT_DIM, fontSize: 10, fontFamily: 'monospace' }}>No active events</div>
      )}
      {activeIncidents.map(evt => (
        <div key={evt.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ color: COLORS.SIGNAL_YELLOW, fontFamily: 'monospace', fontSize: 10 }}>
            {evt.active ? '●' : '○'} {evt.target_train_id ?? evt.target_signal_id ?? '—'} {evt.kind}
            {evt.active ? ` ${evt.remaining_s.toFixed(0)}s` : ` in ${evt.starts_in_s.toFixed(0)}s`}
          </span>
          <button
            onClick={() => void removeEvent(evt.id)}
            style={{ background: 'none', border: 'none', color: COLORS.ERROR_BANNER, fontSize: 13, cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
