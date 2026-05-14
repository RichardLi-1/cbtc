import { COLORS } from '../../constants/colors';
import { polylineBounds } from '../../utils/geometry';
export function renderTrackLayer(ctx, vp, topology) {
    for (const edge of topology.edges) {
        const bounds = polylineBounds(edge.points);
        if (!vp.isVisible(bounds))
            continue;
        const isCrossover = edge.id.startsWith('xover');
        ctx.beginPath();
        ctx.strokeStyle = isCrossover ? COLORS.TRACK_CROSSOVER : COLORS.TRACK_CLEAR;
        ctx.lineWidth = isCrossover ? COLORS.TRACK_CROSSOVER_WIDTH : COLORS.TRACK_WIDTH;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const screenPts = edge.points.map(p => vp.worldToScreen(p.x, p.y));
        ctx.moveTo(screenPts[0][0], screenPts[0][1]);
        for (let i = 1; i < screenPts.length; i++) {
            ctx.lineTo(screenPts[i][0], screenPts[i][1]);
        }
        ctx.stroke();
    }
    // Station tick marks at NB nodes
    if (vp.camera.zoom > 1) {
        for (const node of topology.nodes) {
            if (!node.is_station)
                continue;
            const [sx, sy] = vp.worldToScreen(node.x, node.y);
            if (sx < -10 || sx > vp.width + 10)
                continue;
            ctx.beginPath();
            ctx.strokeStyle = COLORS.STATION_LABEL;
            ctx.lineWidth = 1;
            ctx.moveTo(sx, sy - 8);
            ctx.lineTo(sx, sy + 8);
            ctx.stroke();
        }
    }
}
