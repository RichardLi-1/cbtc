import { COLORS } from '../../constants/colors';
// Crossover midpoint + tangent for aligning the switch glyph along the diagonal.
function crossoverGeometry(edge) {
    const a = edge.points[0];
    const b = edge.points[edge.points.length - 1];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const L = Math.hypot(vx, vy) || 1;
    return { mx, my, ux: vx / L, uy: vy / L, length: L };
}
export function renderSwitchLayer(ctx, vp, topology, runtime) {
    const swMap = new Map(runtime.switches.map(s => [s.switch_id, s.state]));
    const nodesById = new Map(topology.nodes.map(n => [n.id, n]));
    const edgesById = new Map(topology.edges.map(e => [e.id, e]));
    for (const sw of topology.switches) {
        // Prefer the crossover midpoint; fall back to the node position for
        // simple turnouts that don't have a paired reverse edge.
        const xoverEdge = edgesById.get(sw.reverse_edge_id);
        const isXover = !!xoverEdge && xoverEdge.id.startsWith('xover');
        let wx, wy, angle;
        if (isXover && xoverEdge) {
            const g = crossoverGeometry(xoverEdge);
            wx = g.mx;
            wy = g.my;
            angle = Math.atan2(g.uy, g.ux);
        }
        else {
            const node = nodesById.get(sw.node_id);
            if (!node)
                continue;
            wx = node.x;
            wy = node.y;
            angle = 0;
        }
        const [sx, sy] = vp.worldToScreen(wx, wy);
        if (sx < -30 || sx > vp.width + 30 || sy < -30 || sy > vp.height + 30)
            continue;
        const state = swMap.get(sw.id) ?? sw.state;
        const r = COLORS.SWITCH_RADIUS;
        const color = state === 'reverse' ? COLORS.SWITCH_REVERSE : COLORS.SWITCH_NORMAL;
        // Two tiny point-rails at each end of the crossover — these are the actual
        // turnouts in real track schematics. They visually anchor the diagonal to
        // the through track at both junctions.
        if (isXover && xoverEdge) {
            const p0 = xoverEdge.points[0];
            const p1 = xoverEdge.points[xoverEdge.points.length - 1];
            const [e0x, e0y] = vp.worldToScreen(p0.x, p0.y);
            const [e1x, e1y] = vp.worldToScreen(p1.x, p1.y);
            ctx.fillStyle = state === 'reverse' ? color : 'rgba(255,255,255,0.45)';
            for (const [ex, ey] of [[e0x, e0y], [e1x, e1y]]) {
                ctx.beginPath();
                ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        // Rotated X glyph at the midpoint, aligned to the crossover diagonal.
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        // Dark backing disc so the X reads against the track.
        ctx.beginPath();
        ctx.arc(0, 0, r + 1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fill();
        const activeStroke = color;
        const idleStroke = 'rgba(255, 255, 255, 0.32)';
        ctx.lineCap = 'round';
        ctx.lineWidth = 2;
        // Leg "through" — runs along the crossover direction (local x-axis).
        // This represents the diagonal route between tracks.
        ctx.beginPath();
        ctx.moveTo(-r, 0);
        ctx.lineTo(r, 0);
        ctx.strokeStyle = state === 'reverse' ? activeStroke : idleStroke;
        ctx.stroke();
        // Leg "straight" — perpendicular, representing the through (normal) route.
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(0, r);
        ctx.strokeStyle = state === 'normal' ? activeStroke : idleStroke;
        ctx.stroke();
        ctx.restore();
        // Tiny label (only when zoomed in), placed off-axis so it doesn't sit on the X.
        if (vp.camera.zoom > 4) {
            ctx.save();
            ctx.font = '9px monospace';
            ctx.fillStyle = COLORS.HUD;
            ctx.fillText(sw.id.replace('sw_', ''), sx + r + 4, sy - r - 2);
            ctx.restore();
        }
    }
}
