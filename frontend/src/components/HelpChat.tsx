import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { COLORS } from '../constants/colors'
import { askHelp, type HelpMessage } from '../help/ask'
import type { HelpTargetId } from '../help/guide'
import { useEventsStore } from '../store/eventsStore'
import { HelpPointer } from './HelpPointer'

const STARTERS = ['What is the map?', 'What are the dots?', 'How do I hold a train?', 'What is dispatch?']

export function HelpChat() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [point, setPoint] = useState<HelpTargetId | null>(null)
  const [messages, setMessages] = useState<HelpMessage[]>([
    {
      role: 'assistant',
      text: 'Ask what something is. I’ll explain and highlight it on the board.',
    },
  ])
  const listRef = useRef<HTMLDivElement>(null)
  const setPanelOpen = useEventsStore((s) => s.setPanelOpen)
  const setInjectOpen = useEventsStore((s) => s.setInjectOpen)
  const eventsOpen = useEventsStore((s) => s.panelOpen)
  const right = eventsOpen ? 352 : 12

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, open])

  useEffect(() => {
    if (!point) return
    const t = window.setTimeout(() => setPoint(null), 10_000)
    return () => window.clearTimeout(t)
  }, [point])

  function reveal(next: HelpTargetId | null) {
    setPoint(next)
    if (next === 'events' || next === 'inject') {
      setPanelOpen(true)
      if (next === 'inject') setInjectOpen(true)
    }
    if (next === 'dispatch') {
      window.dispatchEvent(new CustomEvent('cbtc-help-point', { detail: next }))
    }
  }

  async function send(text: string) {
    const q = text.trim()
    if (!q || busy) return
    setInput('')
    const history = [...messages, { role: 'user' as const, text: q }]
    setMessages(history)
    setBusy(true)
    try {
      const { reply, point: next } = await askHelp(q, history)
      setMessages([...history, { role: 'assistant', text: reply }])
      reveal(next)
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <>
      <HelpPointer target={point} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Ask about the board"
        style={{
          position: 'fixed',
          top: 7,
          right,
          zIndex: 200,
          background: open ? COLORS.BUTTON_ACTIVE : COLORS.BUTTON_BG,
          color: COLORS.PANEL_TEXT,
          border: `1px solid ${COLORS.PANEL_BORDER}`,
          borderRadius: 3,
          padding: '3px 10px',
          fontSize: 11,
          fontFamily: 'monospace',
          cursor: 'pointer',
          letterSpacing: '0.03em',
        }}
      >
        HELP
      </button>
      {open && (
        <div
          style={{
            position: 'fixed',
            top: 42,
            right,
            width: 300,
            maxWidth: 'calc(100vw - 20px)',
            maxHeight: 'min(420px, calc(100vh - 56px))',
            zIndex: 200,
            background: COLORS.PANEL_BG,
            border: `1px solid ${COLORS.PANEL_BORDER}`,
            borderRadius: 4,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'monospace',
            fontSize: 11,
            color: COLORS.PANEL_TEXT,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              padding: '8px 10px',
              borderBottom: `1px solid ${COLORS.PANEL_BORDER}`,
              display: 'flex',
              alignItems: 'center',
              letterSpacing: '0.08em',
            }}
          >
            <span style={{ flex: 1 }}>GUIDE</span>
            <span
              onClick={() => setOpen(false)}
              style={{ cursor: 'pointer', color: COLORS.PANEL_TEXT_DIM }}
              title="Close"
            >
              ✕
            </span>
          </div>
          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '92%',
                  background: m.role === 'user' ? COLORS.BUTTON_BG : '#0f1c26',
                  border: `1px solid ${COLORS.PANEL_BORDER}`,
                  borderRadius: 3,
                  padding: '6px 8px',
                  lineHeight: 1.45,
                  color: m.role === 'user' ? COLORS.PANEL_TEXT : COLORS.PANEL_TEXT,
                }}
              >
                {m.text}
              </div>
            ))}
            {busy && <div style={{ color: COLORS.PANEL_TEXT_DIM }}>thinking…</div>}
          </div>
          <div style={{ padding: '0 10px 8px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                style={{
                  background: COLORS.BUTTON_BG,
                  color: COLORS.PANEL_TEXT_DIM,
                  border: `1px solid ${COLORS.PANEL_BORDER}`,
                  borderRadius: 2,
                  padding: '2px 6px',
                  fontSize: 10,
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void send(input)
            }}
            style={{ display: 'flex', gap: 6, padding: '0 10px 10px' }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. where are the trains?"
              style={{
                flex: 1,
                background: COLORS.BUTTON_BG,
                color: COLORS.PANEL_TEXT,
                border: `1px solid ${COLORS.PANEL_BORDER}`,
                borderRadius: 3,
                padding: '6px 8px',
                fontFamily: 'monospace',
                fontSize: 11,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              style={{
                background: COLORS.BUTTON_BG,
                color: COLORS.PANEL_TEXT,
                border: `1px solid ${COLORS.PANEL_BORDER}`,
                borderRadius: 3,
                padding: '6px 10px',
                fontFamily: 'monospace',
                fontSize: 11,
                cursor: busy ? 'wait' : 'pointer',
              }}
            >
              ASK
            </button>
          </form>
        </div>
      )}
    </>,
    document.body,
  )
}
