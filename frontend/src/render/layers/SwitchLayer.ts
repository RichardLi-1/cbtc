import type { Topology, RuntimeState, TopologyEdge } from '../../types/domain'
import type { Viewport } from '../Viewport'
import { COLORS } from '../../constants/colors'

// Crossover midpoint + tangent for aligning the switch glyph along the diagonal.
function crossoverGeometry(edge: TopologyEdge) {
  const a = edge.points[0]
  const b = edge.points[edge.points.length - 1]
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const vx = b.x - a.x
  const vy = b.y - a.y
  const L = Math.hypot(vx, vy) || 1
  return { mx, my, ux: vx / L, uy: vy / L, length: L }
}

export function renderSwitchLayer(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  topology: Topology,
  runtime: RuntimeState,
): void {
  const swMap = new Map(runtime.switches.map(s => [s.switch_id, s.state]))
  const nodesById = new Map(topology.nodes.map(n => [n.id, n]))
  const edgesById = new Map(topology.edges.map(e => [e.id, e]))

  for (const sw of topology.switches) {
    // Prefer the crossover midpoint; fall back to the node position for
    // simple turnouts that don't have a paired reverse edge.
    const xoverEdge = edgesById.get(sw.reverse_edge_id)
    const isXover = !!xoverEdge && xoverEdge.id.startsWith('xover')

    let wx: number, wy: number
    if (isXover && xoverEdge) {
      const g = crossoverGeometry(xoverEdge)
      wx = g.mx
      wy = g.my
    } else {
      const node = nodesById.get(sw.node_id)
      if (!node) continue
      wx = node.x
      wy = node.y
    }

    const [sx, sy] = vp.worldToScreen(wx, wy)
    if (sx < -30 || sx > vp.width + 30 || sy < -30 || sy > vp.height + 30) continue

    const state = swMap.get(sw.id) ?? sw.state
    const r = COLORS.SWITCH_RADIUS
    const color = state === 'reverse' ? COLORS.SWITCH_REVERSE : COLORS.SWITCH_NORMAL

    // Two tiny point-rails at each end of the crossover — these are the actual
    // turnouts in real track schematics. They anchor the diagonal to the
    // through tracks at both junctions.
    if (isXover && xoverEdge) {
      const p0 = xoverEdge.points[0]
      const p1 = xoverEdge.points[xoverEdge.points.length - 1]
      const [e0x, e0y] = vp.worldToScreen(p0.x, p0.y)
      const [e1x, e1y] = vp.worldToScreen(p1.x, p1.y)
      ctx.fillStyle = state === 'reverse' ? color : 'rgba(255,255,255,0.45)'
      for (const [ex, ey] of [[e0x, e0y], [e1x, e1y]] as const) {
        ctx.beginPath()
        ctx.arc(ex, ey, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Dark backing disc so the X reads against the track.
    ctx.beginPath()
    ctx.arc(sx, sy, r + 1, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
    ctx.fill()

    // True 45° X glyph — screen-aligned so it always reads as an X
    // regardless of the crossover direction.
    const activeStroke = color
    const idleStroke   = 'rgba(255, 255, 255, 0.35)'
    ctx.lineCap = 'round'
    ctx.lineWidth = 2

    // Leg A: ↘  (normal route)
    ctx.beginPath()
    ctx.moveTo(sx - r, sy - r)
    ctx.lineTo(sx + r, sy + r)
    ctx.strokeStyle = state === 'normal' ? activeStroke : idleStroke
    ctx.stroke()

    // Leg B: ↙  (reverse route)
    ctx.beginPath()
    ctx.moveTo(sx + r, sy - r)
    ctx.lineTo(sx - r, sy + r)
    ctx.strokeStyle = state === 'reverse' ? activeStroke : idleStroke
    ctx.stroke()

    // Tiny label only when zoomed in close.
    if (vp.camera.zoom > 4) {
      ctx.font = '9px monospace'
      ctx.fillStyle = COLORS.HUD
      ctx.fillText(sw.id.replace('sw_', ''), sx + r + 4, sy - r - 2)
    }
  }
}
