import { COLORS } from '../../constants/colors';
import { interpolatePolyline, tangentAtT } from '../../utils/geometry';
const TRAIN_W = 28; // screen px (half-width)
const TRAIN_H = 10; // screen px (half-height)
function trainColor(train) {
    if (train.state === 'dwelling')
        return COLORS.TRAIN_DWELL;
    return COLORS.TRAIN_FILL;
}
export function renderTrainLayer(ctx, vp, topology, runtime, showSafeZones, showLabels) {
    const edgeById = new Map(topology.edges.map(e => [e.id, e]));
    for (const train of runtime.trains) {
        const edge = edgeById.get(train.edge_id);
        if (!edge)
            continue;
        const wp = interpolatePolyline(edge.points, train.offset);
        const [sx, sy] = vp.worldToScreen(wp.x, wp.y);
        if (sx < -60 || sx > vp.width + 60 || sy < -60 || sy > vp.height + 60)
            continue;
        const tan = tangentAtT(edge.points, train.offset);
        const angle = Math.atan2(tan.y, tan.x);
        // ── Safe zone orbs ────────────────────────────────────────────────────
        if (showSafeZones) {
            const frontPx = vp.toPixels(train.safe_zone_front);
            const rearPx = vp.toPixels(train.safe_zone_rear);
            // Front oval — elongated along track, fades from train outward
            if (frontPx > 6) {
                const halfH = Math.max(6, Math.min(14, frontPx * 0.09));
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(angle);
                // ellipse: origin at train, extends forward only (x: 0 → frontPx)
                const gf = ctx.createLinearGradient(0, 0, frontPx, 0);
                gf.addColorStop(0, 'rgba(40, 160, 255, 0.55)');
                gf.addColorStop(0.30, 'rgba(30, 120, 255, 0.28)');
                gf.addColorStop(0.65, 'rgba(10,  80, 220, 0.10)');
                gf.addColorStop(1, 'rgba( 0,  40, 200, 0.00)');
                ctx.beginPath();
                ctx.ellipse(frontPx / 2, 0, frontPx / 2, halfH, 0, 0, Math.PI * 2);
                ctx.fillStyle = gf;
                ctx.fill();
                ctx.restore();
            }
            // Rear oval — amber, same logic in reverse
            if (rearPx > 6) {
                const halfH = Math.max(5, Math.min(11, rearPx * 0.08));
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(angle);
                const gr = ctx.createLinearGradient(0, 0, -rearPx, 0);
                gr.addColorStop(0, 'rgba(255, 110,  0, 0.38)');
                gr.addColorStop(0.35, 'rgba(255,  80,  0, 0.15)');
                gr.addColorStop(1, 'rgba(255,  50,  0, 0.00)');
                ctx.beginPath();
                ctx.ellipse(-rearPx / 2, 0, rearPx / 2, halfH, 0, 0, Math.PI * 2);
                ctx.fillStyle = gr;
                ctx.fill();
                ctx.restore();
            }
        }
        // ── Train body (rotated rect) ─────────────────────────────────────────
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.roundRect(-TRAIN_W, -TRAIN_H, TRAIN_W * 2, TRAIN_H * 2, 3);
        ctx.fillStyle = trainColor(train);
        ctx.fill();
        ctx.strokeStyle = COLORS.TRAIN_BORDER;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Direction arrow
        ctx.beginPath();
        ctx.fillStyle = COLORS.TRAIN_BORDER;
        ctx.moveTo(TRAIN_W - 6, 0);
        ctx.lineTo(TRAIN_W + 4, -4);
        ctx.lineTo(TRAIN_W + 4, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // ── Label ─────────────────────────────────────────────────────────────
        if (showLabels) {
            ctx.font = 'bold 10px monospace';
            ctx.fillStyle = COLORS.TRAIN_ID_LABEL;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(train.label, sx, sy);
            if (vp.camera.zoom > 3) {
                ctx.font = '8px monospace';
                ctx.fillStyle = COLORS.HUD;
                const kmh = (train.speed * 3.6).toFixed(0);
                ctx.fillText(`${kmh} km/h`, sx, sy + TRAIN_H + 10);
            }
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
        }
    }
}
