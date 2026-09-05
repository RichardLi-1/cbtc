import type { Topology, RuntimeState, TrainPosition } from '../../types/domain'
import type { Viewport } from '../Viewport'
import { COLORS } from '../../constants/colors'
import { interpolatePolyline, tangentAtT } from '../../utils/geometry'
import { safeZonePalette, slackTier } from '../../utils/safeZone'

const TRAIN_W = 16   // screen px (half-width)
const TRAIN_H = 4    // screen px (half-height)

function trainColor(train: TrainPosition): string {
  if (train.state === 'dwelling') return COLORS.TRAIN_DWELL
  return COLORS.TRAIN_FILL
}

export function renderTrainLayer(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  topology: Topology,
  runtime: RuntimeState,
  showSafeZones: boolean,
  showLabels: boolean,
): void {
  const edgeById = new Map(topology.edges.map(e => [e.id, e]))

  for (const train of runtime.trains) {
    const edge = edgeById.get(train.edge_id)
    if (!edge) continue

    const wp = interpolatePolyline(edge.points, train.offset)
    const [sx, sy] = vp.worldToScreen(wp.x, wp.y)
    if (sx < -60 || sx > vp.width + 60 || sy < -60 || sy > vp.height + 60) continue

    const tan = tangentAtT(edge.points, train.offset)
    const angle = Math.atan2(tan.y, tan.x)

    // ── Safe zone orbs ────────────────────────────────────────────────────
    const tier = slackTier(train.atp_slack_m)
    if (showSafeZones) {
      const frontPx = vp.toPixels(train.safe_zone_front)
      const rearPx  = vp.toPixels(train.safe_zone_rear)

      // Front oval — elongated along track, fades from train outward.
      // Color shifts amber/red when ATP slack tightens.
      if (frontPx > 6) {
        const halfH = Math.max(6, Math.min(14, frontPx * 0.09))
        const pal = safeZonePalette(train.atp_slack_m)
        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(angle)
        const gf = ctx.createLinearGradient(0, 0, frontPx, 0)
        gf.addColorStop(0,    pal.core)
        gf.addColorStop(0.30, pal.mid)
        gf.addColorStop(0.65, pal.edge)
        gf.addColorStop(1,    pal.ring)
        ctx.beginPath()
        ctx.ellipse(frontPx / 2, 0, frontPx / 2, halfH, 0, 0, Math.PI * 2)
        ctx.fillStyle = gf
        ctx.fill()

        // Danger: outline the orb so a red MA violation pops at a glance.
        if (tier === 'danger') {
          const pulse = 0.55 + 0.35 * Math.sin(performance.now() / 140)
          ctx.beginPath()
          ctx.ellipse(frontPx / 2, 0, frontPx / 2, halfH, 0, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255, 50, 50, ${pulse.toFixed(3)})`
          ctx.lineWidth = 1.25
          ctx.stroke()
        }
        ctx.restore()
      }

      // Rear oval — amber, same logic in reverse
      if (rearPx > 6) {
        const halfH = Math.max(5, Math.min(11, rearPx * 0.08))
        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(angle)
        const gr = ctx.createLinearGradient(0, 0, -rearPx, 0)
        gr.addColorStop(0,    'rgba(255, 110,  0, 0.38)')
        gr.addColorStop(0.35, 'rgba(255,  80,  0, 0.15)')
        gr.addColorStop(1,    'rgba(255,  50,  0, 0.00)')
        ctx.beginPath()
        ctx.ellipse(-rearPx / 2, 0, rearPx / 2, halfH, 0, 0, Math.PI * 2)
        ctx.fillStyle = gr
        ctx.fill()
        ctx.restore()
      }
    }

    // ── Train body (rotated rect) ─────────────────────────────────────────
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(angle)

    ctx.beginPath()
    ctx.roundRect(-TRAIN_W, -TRAIN_H, TRAIN_W * 2, TRAIN_H * 2, 3)
    ctx.fillStyle = trainColor(train)
    ctx.fill()
    ctx.strokeStyle = COLORS.TRAIN_BORDER
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Direction arrow
    ctx.beginPath()
    ctx.fillStyle = COLORS.TRAIN_BORDER
    ctx.moveTo(TRAIN_W - 6, 0)
    ctx.lineTo(TRAIN_W + 4, -4)
    ctx.lineTo(TRAIN_W + 4, 4)
    ctx.closePath()
    ctx.fill()

    ctx.restore()

    // ── Dispatch override badge ───────────────────────────────────────────
    // Shows when Transit Control has issued a service-regulation move.
    const badge = train.dispatch_hold
      ? { text: 'HOLD', color: '#ffb74d' }
      : train.dispatch_express
        ? { text: 'EXP', color: '#4fc3f7' }
        : (train.dispatch_skip_remaining ?? 0) > 0
          ? { text: `SKIP×${train.dispatch_skip_remaining}`, color: '#ce93d8' }
          : null
    // Left of travel — IB and OB run opposite ways, so names sit outside the pair.
    const leftX = -Math.sin(angle)
    const leftY = Math.cos(angle)
    const nameOff = TRAIN_H + 14
    const nx = sx + leftX * nameOff
    const ny = sy + leftY * nameOff

    if (badge) {
      ctx.font = 'bold 9px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const padX = 4
      const w = ctx.measureText(badge.text).width + padX * 2
      const bx = nx + leftX * 14
      const by = ny + leftY * 14
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.beginPath()
      ctx.roundRect(bx - w / 2, by - 7, w, 14, 3)
      ctx.fill()
      ctx.strokeStyle = badge.color
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.fillStyle = badge.color
      ctx.fillText(badge.text, bx, by)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
    }

    // ── Label (beside the car, not on the rail) ───────────────────────────
    if (showLabels) {
      ctx.font = 'bold 10px monospace'
      ctx.fillStyle = COLORS.TRAIN_ID_LABEL
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(train.label, nx, ny)

      if (vp.camera.zoom > 3) {
        ctx.font = '8px monospace'
        ctx.fillStyle = COLORS.HUD
        const kmh = (train.speed * 3.6).toFixed(0)
        ctx.fillText(`${kmh} km/h`, nx + leftX * 12, ny + leftY * 12)

        if (tier !== 'nominal' && train.atp_slack_m != null) {
          ctx.fillStyle = tier === 'danger' ? '#ff5252' : '#ffb74d'
          ctx.fillText(`Δ ${train.atp_slack_m.toFixed(0)} m`, nx + leftX * 22, ny + leftY * 22)
        }
      }
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
    }
  }
}
