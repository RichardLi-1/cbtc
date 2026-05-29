import { COLORS } from '../../constants/colors';
// Unit vector along an edge (world coords).
function edgeUnit(edge) {
    const a = edge.points[0];
    const b = edge.points[edge.points.length - 1];
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const L = Math.hypot(vx, vy) || 1;
    return { ux: vx / L, uy: vy / L };
}
export function renderSwitchLayer(ctx, vp, topology, runtime) {
    const swMap = new Map(runtime.switches.map(s => [s.switch_id, s.state]));
    const nodesById = new Map(topology.nodes.map(n => [n.id, n]));
    const edgesById = new Map(topology.edges.map(e => [e.id, e]));
    for (const sw of topology.switches) {
        const xoverEdge = edgesById.get(sw.reverse_edge_id);
        const isXover = !!xoverEdge && xoverEdge.id.startsWith('xover');
        const state = swMap.get(sw.id) ?? sw.state;
        const color = state === 'reverse' ? COLORS.SWITCH_REVERSE : COLORS.SWITCH_NORMAL;
        const activeStroke = color;
        const idleStroke = 'rgba(255, 255, 255, 0.35)';
        if (isXover && xoverEdge) {
            // Crossover: draw a true X that spans the actual gap between the two
            // parallel tracks. Leg 1 follows the crossover edge itself; Leg 2 is
            // the mirror diagonal across the track-perpendicular bisector — together
            // they form the symbolic X used in track schematics.
            const p0 = xoverEdge.points[0];
            const p1 = xoverEdge.points[xoverEdge.points.length - 1];
            // Track direction comes from the through (normal) edge at this switch.
            // Fall back to the crossover's own perpendicular if the normal edge
            // isn't available, which still yields a visually correct X.
            const normalEdge = edgesById.get(sw.normal_edge_id);
            let trackUx, trackUy;
            if (normalEdge) {
                ({ ux: trackUx, uy: trackUy } = edgeUnit(normalEdge));
            }
            else {
                const { ux, uy } = edgeUnit(xoverEdge);
                trackUx = -uy;
                trackUy = ux;
            }
            // Decompose p1-p0 into track-parallel and perpendicular components, then
            // reflect each endpoint across the perpendicular bisector to get the
            // mirror diagonal.
            const dx = p1.x - p0.x;
            const dy = p1.y - p0.y;
            const para = dx * trackUx + dy * trackUy;
            const p0mx = p0.x + para * trackUx;
            const p0my = p0.y + para * trackUy;
            const p1mx = p1.x - para * trackUx;
            const p1my = p1.y - para * trackUy;
            const [e0x, e0y] = vp.worldToScreen(p0.x, p0.y);
            const [e1x, e1y] = vp.worldToScreen(p1.x, p1.y);
            const [m0x, m0y] = vp.worldToScreen(p0mx, p0my);
            const [m1x, m1y] = vp.worldToScreen(p1mx, p1my);
            const cx = (e0x + e1x) / 2;
            const cy = (e0y + e1y) / 2;
            if (cx < -30 || cx > vp.width + 30 || cy < -30 || cy > vp.height + 30)
                continue;
            // Point-rails at the actual junctions with the through tracks.
            ctx.fillStyle = state === 'reverse' ? color : 'rgba(255,255,255,0.45)';
            for (const [ex, ey] of [[e0x, e0y], [e1x, e1y]]) {
                ctx.beginPath();
                ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.lineCap = 'round';
            ctx.lineWidth = 2;
            // Reverse leg — the actual crossover diagonal.
            ctx.beginPath();
            ctx.moveTo(e0x, e0y);
            ctx.lineTo(e1x, e1y);
            ctx.strokeStyle = state === 'reverse' ? activeStroke : idleStroke;
            ctx.stroke();
            // Normal leg — the mirror diagonal.
            ctx.beginPath();
            ctx.moveTo(m0x, m0y);
            ctx.lineTo(m1x, m1y);
            ctx.strokeStyle = state === 'normal' ? activeStroke : idleStroke;
            ctx.stroke();
            if (vp.camera.zoom > 4) {
                const xmax = Math.max(e0x, e1x, m0x, m1x);
                const ymin = Math.min(e0y, e1y, m0y, m1y);
                ctx.font = '9px monospace';
                ctx.fillStyle = COLORS.HUD;
                ctx.fillText(sw.id.replace('sw_', ''), xmax + 4, ymin - 2);
            }
            continue;
        }
        // Simple turnout (no paired crossover edge): fixed-size screen-aligned X
        // at the node position.
        const node = nodesById.get(sw.node_id);
        if (!node)
            continue;
        const [sx, sy] = vp.worldToScreen(node.x, node.y);
        if (sx < -30 || sx > vp.width + 30 || sy < -30 || sy > vp.height + 30)
            continue;
        const r = COLORS.SWITCH_RADIUS;
        ctx.beginPath();
        ctx.arc(sx, sy, r + 1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fill();
        ctx.lineCap = 'round';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx - r, sy - r);
        ctx.lineTo(sx + r, sy + r);
        ctx.strokeStyle = state === 'normal' ? activeStroke : idleStroke;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx + r, sy - r);
        ctx.lineTo(sx - r, sy + r);
        ctx.strokeStyle = state === 'reverse' ? activeStroke : idleStroke;
        ctx.stroke();
        if (vp.camera.zoom > 4) {
            ctx.font = '9px monospace';
            ctx.fillStyle = COLORS.HUD;
            ctx.fillText(sw.id.replace('sw_', ''), sx + r + 4, sy - r - 2);
        }
    }
}
