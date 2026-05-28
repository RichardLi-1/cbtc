import type { Topology, RuntimeState } from '../../types/domain'
import type { Viewport } from '../Viewport'
import { COLORS } from '../../constants/colors'

export function renderSwitchLayer(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  topology: Topology,
  runtime: RuntimeState,
): void {
  const swMap = new Map(runtime.switches.map(s => [s.switch_id, s.state]))
  const nodesById = new Map(topology.nodes.map(n => [n.id, n]))

  for (const sw of topology.switches) {
    const node = nodesById.get(sw.node_id)
    if (!node) continue
    const [sx, sy] = vp.worldToScreen(node.x, node.y)
    if (sx < -20 || sx > vp.width + 20 || sy < -20 || sy > vp.height + 20) continue

    const state = swMap.get(sw.id) ?? sw.state
    const r = COLORS.SWITCH_RADIUS
    const color = state === 'reverse' ? COLORS.SWITCH_REVERSE : COLORS.SWITCH_NORMAL

    // Dark backing disc so the X reads against the track and block fill.
    ctx.beginPath()
    ctx.arc(sx, sy, r + 1, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.fill()

    // X glyph — two crossing strokes. The active leg (matching switch state)
    // is drawn in the state color; the inactive leg is dim.
    const activeStroke = color
    const idleStroke   = 'rgba(255, 255, 255, 0.35)'
    ctx.lineCap = 'round'
    ctx.lineWidth = 2

    // Leg A: top-left ↘ bottom-right  (normal route)
    ctx.beginPath()
    ctx.moveTo(sx - r, sy - r)
    ctx.lineTo(sx + r, sy + r)
    ctx.strokeStyle = state === 'normal' ? activeStroke : idleStroke
    ctx.stroke()

    // Leg B: top-right ↙ bottom-left  (reverse route)
    ctx.beginPath()
    ctx.moveTo(sx + r, sy - r)
    ctx.lineTo(sx - r, sy + r)
    ctx.strokeStyle = state === 'reverse' ? activeStroke : idleStroke
    ctx.stroke()

    // Small label at higher zoom
    if (vp.camera.zoom > 3) {
      ctx.font = '9px monospace'
      ctx.fillStyle = COLORS.HUD
      ctx.fillText(sw.id.replace('sw_', ''), sx + r + 3, sy + 4)
    }
  }
}
