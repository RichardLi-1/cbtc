import { useEffect } from 'react'
import { COLORS } from '../constants/colors'

interface Props {
  open: boolean
  onClose: () => void
}

export function InfoPopup({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
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
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <span style={{ fontSize: 13, letterSpacing: '0.1em', color: COLORS.PANEL_TEXT }}>
            URBALIS 400 — REFERENCE NOTES
          </span>
          <span
            onClick={onClose}
            style={{ cursor: 'pointer', color: COLORS.PANEL_TEXT_DIM, fontSize: 14 }}
            title="Close (Esc)"
          >✕</span>
        </div>

        <Section title="THE REAL SYSTEM">
          TTC Line 1 (Yonge–University) runs on Alstom <b>Urbalis 400</b>, a
          moving-block CBTC. Each train continuously reports its position to
          wayside zone controllers over a track-side radio network. A central
          ATS layer handles regulation and timetable; wayside ATP issues a
          <b> movement authority</b> (MA) — the limit of authority a train may
          travel to — and an onboard ATO follows it within the speed envelope.
          Fixed track circuits remain as a fallback for SIL-4 protection.
        </Section>

        <Section title="WHAT WE MODEL">
          <Row k="Topology" v="Static track graph (edges, switches, stations) loaded from /topology." />
          <Row k="Train state" v="Owns its own speed/position. Integrates traction & braking each tick." />
          <Row k="Controller" v="Wayside-style. Pushes setpoints (target speed, direction) via a narrow command API." />
          <Row k="Movement authority" v="Per-train safe zone: permitted speed + forward/rear extent. Rendered as the green/orange band." />
          <Row k="Driver" v="Minimal — emergency brake only. EB overrides controller setpoints until released." />
        </Section>

        <Section title="SIMPLIFICATIONS">
          No radio loss model, no SIL-rated voting, no track-circuit fallback,
          no interlocking proofs. Block occupancy is derived from train
          positions directly rather than from axle counters. Headways and
          braking curves are tuned for legibility, not certification.
        </Section>

        <div style={{ marginTop: 14, paddingTop: 10, borderTop: `1px solid ${COLORS.PANEL_BORDER}`, color: COLORS.PANEL_TEXT_DIM, fontSize: 10 }}>
          Recreational simulator. Not affiliated with TTC or Alstom.
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: COLORS.PANEL_TEXT_DIM, fontSize: 10, letterSpacing: '0.12em', marginBottom: 6 }}>
        {title}
      </div>
      <div>{children}</div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 3 }}>
      <span style={{ color: COLORS.SIGNAL_GREEN, minWidth: 130 }}>{k}</span>
      <span style={{ color: COLORS.PANEL_TEXT }}>{v}</span>
    </div>
  )
}
