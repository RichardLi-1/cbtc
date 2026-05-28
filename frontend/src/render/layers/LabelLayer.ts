import type { Topology } from '../../types/domain'
import type { Viewport } from '../Viewport'
import { COLORS } from '../../constants/colors'

const OB_LABEL_OFFSET = -24   // screen px above outbound track

export function renderLabelLayer(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  topology: Topology,
): void {
  const seen = new Set<string>()

  const fontPx = Math.max(10, Math.min(15, vp.camera.zoom * 2.8))
  ctx.font = `bold ${fontPx}px monospace`
  ctx.fillStyle = COLORS.STATION_LABEL
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'

  for (const node of topology.nodes) {
    if (!node.is_station || !node.label || seen.has(node.label)) continue
    const [sx, sy] = vp.worldToScreen(node.x, node.y)
    if (sx < -60 || sx > vp.width + 60) continue

    // Only label on outbound track to avoid duplication
    if (node.id.startsWith('ob_')) {
      // Draw a station marker so stations are visually distinct from signals.
      ctx.beginPath()
      ctx.arc(sx, sy, 10, 0, Math.PI * 2)
      ctx.fillStyle = COLORS.STATION_MARKER_HALO
      ctx.fill()

      ctx.beginPath()
      ctx.arc(sx, sy, 6, 0, Math.PI * 2)
      ctx.fillStyle = COLORS.STATION_MARKER_FILL
      ctx.fill()
      ctx.strokeStyle = COLORS.STATION_MARKER_BORDER
      ctx.lineWidth = 1.5
      ctx.stroke()

      const label = node.label
      const textW = ctx.measureText(label).width
      const padX = 5
      const h = Math.ceil(fontPx + 5)
      const w = Math.ceil(textW + padX * 2)
      const x = Math.round(sx - w / 2)
      const y = Math.round(sy + OB_LABEL_OFFSET - h + 2)

      ctx.fillStyle = COLORS.STATION_LABEL_BG
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = COLORS.STATION_MARKER_BORDER
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, w, h)

      ctx.fillStyle = COLORS.STATION_LABEL
      ctx.fillText(node.label, sx, sy + OB_LABEL_OFFSET)
      seen.add(node.label)
    }
  }

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}
