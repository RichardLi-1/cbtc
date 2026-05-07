import type { Topology, RuntimeState, SignalAspect } from '../../types/domain'
import type { Viewport } from '../Viewport'
import { COLORS } from '../../constants/colors'
import { interpolatePolyline } from '../../utils/geometry'

function aspectColor(aspect: SignalAspect): string {
  switch (aspect) {
    case 'green': return COLORS.SIGNAL_GREEN
    case 'yellow': return COLORS.SIGNAL_YELLOW
    case 'red': return COLORS.SIGNAL_RED
    case 'flashing_yellow': return COLORS.SIGNAL_FLASHING_YELLOW
    case 'dark': return COLORS.SIGNAL_DARK
  }
}

export function renderSignalLayer(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  topology: Topology,
  runtime: RuntimeState,
  flashPhase: boolean,
): void {
  const sigMap = new Map(runtime.signals.map(s => [s.signal_id, s.aspect]))
  const edgeById = new Map(topology.edges.map(e => [e.id, e]))
  const r = COLORS.SIGNAL_RADIUS

  for (const sig of topology.signals) {
    const edge = edgeById.get(sig.edge_id)
    if (!edge) continue

    const wp = interpolatePolyline(edge.points, sig.offset)
    const [sx, sy] = vp.worldToScreen(wp.x, wp.y)
    if (sx < -20 || sx > vp.width + 20 || sy < -20 || sy > vp.height + 20) continue

    const aspect = sigMap.get(sig.id) ?? 'dark'

    // Flashing yellow: blink every other frame tick
    const visible = aspect === 'flashing_yellow' ? flashPhase : true

    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.fillStyle = visible ? aspectColor(aspect) : COLORS.SIGNAL_DARK
    ctx.fill()
    ctx.strokeStyle = COLORS.SIGNAL_BORDER
    ctx.lineWidth = 1
    ctx.stroke()
  }
}
