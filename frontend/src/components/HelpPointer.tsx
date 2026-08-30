import { useEffect, useState } from 'react'
import { COLORS } from '../constants/colors'
import type { HelpTargetId } from '../help/guide'
import { HELP_TARGETS } from '../help/guide'

interface Box {
  left: number
  top: number
  width: number
  height: number
}

export function HelpPointer({ target }: { target: HelpTargetId | null }) {
  const [box, setBox] = useState<Box | null>(null)

  useEffect(() => {
    if (!target) {
      setBox(null)
      return
    }
    const measure = () => {
      const el = document.querySelector(`[data-help="${target}"]`)
      if (!el) {
        setBox(null)
        return
      }
      const r = el.getBoundingClientRect()
      setBox({ left: r.left, top: r.top, width: r.width, height: r.height })
    }
    measure()
    window.addEventListener('resize', measure)
    const id = window.setInterval(measure, 400)
    return () => {
      window.removeEventListener('resize', measure)
      window.clearInterval(id)
    }
  }, [target])

  if (!target || !box || box.width < 2 || box.height < 2) return null

  const label = HELP_TARGETS.find((t) => t.id === target)?.label ?? target
  const pad = 6
  const left = Math.max(4, box.left - pad)
  const top = Math.max(4, box.top - pad)
  const width = Math.min(window.innerWidth - left - 4, box.width + pad * 2)
  const height = Math.min(window.innerHeight - top - 4, box.height + pad * 2)
  const labelTop = top + height + 8 > window.innerHeight - 28 ? top - 22 : top + height + 8

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 64, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          border: `2px solid ${COLORS.SIGNAL_YELLOW}`,
          borderRadius: 4,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left,
          top: labelTop,
          background: COLORS.SIGNAL_YELLOW,
          color: '#111',
          fontFamily: 'monospace',
          fontSize: 10,
          letterSpacing: '0.08em',
          padding: '2px 6px',
          borderRadius: 2,
        }}
      >
        {label.toUpperCase()}
      </div>
    </div>
  )
}
