import type { Topology, RuntimeState } from '../../types/domain'
import type { Viewport } from '../Viewport'
import { COLORS } from '../../constants/colors'
import { polylineBounds } from '../../utils/geometry'

const OVERLAY_WIDTH = 16   // world metres, ±8 from track centre

export function renderBlockLayer(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  topology: Topology,
  runtime: RuntimeState,
): void {
  const blockMap = new Map(runtime.blocks.map(b => [b.block_id, b.occupancy]))

  for (const edge of topology.edges) {
    if (edge.id.startsWith('xover')) continue

    const occ = blockMap.get(edge.block_id) ?? 'unknown'
    if (occ === 'clear') continue

    const bounds = polylineBounds(edge.points)
    if (!vp.isVisible(bounds)) continue

    ctx.fillStyle = COLORS.BLOCK_OCCUPIED_FILL

    // Draw a thickened strip along the polyline using a screen-space expand
    const pts = edge.points.map(p => vp.worldToScreen(p.x, p.y))
    const halfW = vp.toPixels(OVERLAY_WIDTH / 2)

    if (pts.length === 2) {
      // fast path: single segment → axis-aligned rect
      const [ax, ay] = pts[0]
      const [bx, by] = pts[1]
      if (Math.abs(ay - by) < 1) {
        // horizontal
        const minX = Math.min(ax, bx)
        const maxX = Math.max(ax, bx)
        ctx.fillRect(minX, ay - halfW, maxX - minX, halfW * 2)
      } else {
        // vertical
        const minY = Math.min(ay, by)
        const maxY = Math.max(ay, by)
        ctx.fillRect(ax - halfW, minY, halfW * 2, maxY - minY)
      }
    } else {
      // general path along polyline
      ctx.beginPath()
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
      ctx.lineWidth = halfW * 2
      ctx.strokeStyle = COLORS.BLOCK_OCCUPIED_FILL
      ctx.stroke()
    }
  }
}
