import { COLORS } from '../../constants/colors';
const OB_LABEL_OFFSET = -28; // screen px above outbound track
// Pair each ob_<i> with its matching ib_<i> sibling so we can draw a single
// platform that straddles both tracks instead of a separate marker per leg.
function siblingNode(node, topology) {
    if (!node.id.startsWith('ob_'))
        return null;
    const ib = topology.nodes.find((n) => n.id === node.id.replace(/^ob_/, 'ib_'));
    return ib ?? null;
}
export function renderLabelLayer(ctx, vp, topology, showLabels = true) {
    const seen = new Set();
    const fontPx = Math.max(10, Math.min(15, vp.camera.zoom * 2.8));
    for (const node of topology.nodes) {
        if (!node.is_station || !node.label || seen.has(node.label))
            continue;
        if (!node.id.startsWith('ob_'))
            continue;
        const sib = siblingNode(node, topology);
        // World-space station "center" is the midpoint of the ob/ib pair so the
        // platform straddles both tracks like a real cut-and-cover station.
        const cx = sib ? (node.x + sib.x) / 2 : node.x;
        const cy = sib ? (node.y + sib.y) / 2 : node.y;
        const [scx, scy] = vp.worldToScreen(cx, cy);
        if (scx < -80 || scx > vp.width + 80 || scy < -80 || scy > vp.height + 80)
            continue;
        // Platform orientation = direction along the track at this stop.
        let dx = 1, dy = 0;
        const obIdx = parseInt(node.id.replace('ob_', ''), 10);
        const nextOb = topology.nodes.find((n) => n.id === `ob_${obIdx + 1}`)
            ?? topology.nodes.find((n) => n.id === `ob_${obIdx - 1}`);
        if (nextOb) {
            const vx = nextOb.x - node.x;
            const vy = nextOb.y - node.y;
            const L = Math.hypot(vx, vy) || 1;
            dx = vx / L;
            dy = vy / L;
        }
        const angle = Math.atan2(dy, dx);
        // Platform dimensions in screen px — scales gently with zoom.
        const halfLenPx = Math.max(14, Math.min(34, vp.camera.zoom * 6));
        const halfWidPx = Math.max(5, Math.min(11, vp.camera.zoom * 2));
        ctx.save();
        ctx.translate(scx, scy);
        ctx.rotate(angle);
        // Filled platform
        ctx.fillStyle = COLORS.STATION_LABEL_BG ?? '#1c2532';
        ctx.fillRect(-halfLenPx, -halfWidPx, halfLenPx * 2, halfWidPx * 2);
        // Border ring (lighter so it reads against the track)
        ctx.strokeStyle = COLORS.STATION_MARKER_BORDER ?? '#7fb1d9';
        ctx.lineWidth = 1.25;
        ctx.strokeRect(-halfLenPx, -halfWidPx, halfLenPx * 2, halfWidPx * 2);
        ctx.restore();
        seen.add(node.label);
        if (!showLabels)
            continue;
        // Label above the platform (screen-aligned text)
        ctx.font = `bold ${fontPx}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const label = node.label;
        const textW = ctx.measureText(label).width;
        const padX = 5;
        const lh = Math.ceil(fontPx + 5);
        const lw = Math.ceil(textW + padX * 2);
        const lx = Math.round(scx - lw / 2);
        const ly = Math.round(scy + OB_LABEL_OFFSET - lh + 2);
        ctx.fillStyle = COLORS.STATION_LABEL_BG ?? 'rgba(8, 14, 22, 0.85)';
        ctx.fillRect(lx, ly, lw, lh);
        ctx.strokeStyle = COLORS.STATION_MARKER_BORDER ?? '#7fb1d9';
        ctx.lineWidth = 1;
        ctx.strokeRect(lx, ly, lw, lh);
        ctx.fillStyle = COLORS.STATION_LABEL ?? '#cde6ff';
        ctx.fillText(label, scx, scy + OB_LABEL_OFFSET);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
}
