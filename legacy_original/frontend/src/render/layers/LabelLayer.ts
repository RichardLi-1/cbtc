import type { Topology } from '../../types/domain'
import type { Viewport } from '../Viewport'
import { COLORS } from '../../constants/colors'

const NB_Y_LABEL_OFFSET = -18   // screen px above track

export function renderLabelLayer(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  topology: Topology,
): void {
  const seen = new Set<string>()

  ctx.font = `${Math.max(9, Math.min(13, vp.camera.zoom * 2.5))}px monospace`
  ctx.fillStyle = COLORS.STATION_LABEL
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'

  for (const node of topology.nodes) {
    if (!node.is_station || !node.label || seen.has(node.label)) continue
    const [sx, sy] = vp.worldToScreen(node.x, node.y)
    if (sx < -60 || sx > vp.width + 60) continue

    // Only label on NB track to avoid duplication
    if (node.id.startsWith('nb_')) {
      ctx.fillText(node.label, sx, sy + NB_Y_LABEL_OFFSET)
      seen.add(node.label)
    }
  }

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}
