import { COLORS } from '../../constants/colors';
export function renderSwitchLayer(ctx, vp, topology, runtime) {
    const swMap = new Map(runtime.switches.map(s => [s.switch_id, s.state]));
    const nodesById = new Map(topology.nodes.map(n => [n.id, n]));
    for (const sw of topology.switches) {
        const node = nodesById.get(sw.node_id);
        if (!node)
            continue;
        const [sx, sy] = vp.worldToScreen(node.x, node.y);
        if (sx < -20 || sx > vp.width + 20 || sy < -20 || sy > vp.height + 20)
            continue;
        const state = swMap.get(sw.id) ?? sw.state;
        const r = COLORS.SWITCH_RADIUS;
        ctx.beginPath();
        if (state === 'reverse') {
            // Diamond for reverse
            ctx.moveTo(sx, sy - r);
            ctx.lineTo(sx + r, sy);
            ctx.lineTo(sx, sy + r);
            ctx.lineTo(sx - r, sy);
            ctx.closePath();
            ctx.fillStyle = COLORS.SWITCH_REVERSE;
        }
        else {
            // Circle for normal
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.SWITCH_NORMAL;
        }
        ctx.fill();
        ctx.strokeStyle = COLORS.PANEL_BORDER;
        ctx.lineWidth = 1;
        ctx.stroke();
        // Small label at higher zoom
        if (vp.camera.zoom > 3) {
            ctx.font = '9px monospace';
            ctx.fillStyle = COLORS.HUD;
            ctx.fillText(sw.id.replace('sw_', ''), sx + r + 3, sy + 4);
        }
    }
}
