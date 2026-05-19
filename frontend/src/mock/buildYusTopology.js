import yusRaw from '../../../backend/data/yus_topology.json';
const TRACK_SEP = 22;
const PAD = 200;
const MID_XOVER_STOPS = [6, 11, 14, 27, 32, 35];
function edgeLen(ax, ay, bx, by) {
    return Math.round(Math.hypot(bx - ax, by - ay) * 100) / 100 || 1;
}
export function buildYusTopology() {
    const stops = yusRaw.line.stops;
    const n = stops.length;
    const lons = stops.map(s => s.coords[0]);
    const lats = stops.map(s => s.coords[1]);
    const lonMin = Math.min(...lons);
    const lonMax = Math.max(...lons);
    const latMin = Math.min(...lats);
    const latMax = Math.max(...lats);
    const cosLat = Math.cos((((latMin + latMax) / 2) * Math.PI) / 180);
    const xSpan = (lonMax - lonMin) * cosLat;
    const ySpan = latMax - latMin;
    const scale = Math.min(6000 / xSpan, 5000 / ySpan);
    const proj = (lon, lat) => [
        Math.round((PAD + (lon - lonMin) * cosLat * scale) * 10) / 10,
        Math.round((PAD + (latMax - lat) * scale) * 10) / 10,
    ];
    const pts = stops.map(s => proj(s.coords[0], s.coords[1]));
    const perp = (i) => {
        const a = pts[Math.max(i - 1, 0)];
        const b = pts[Math.min(i + 1, n - 1)];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const L = Math.hypot(dx, dy) || 1;
        return [(-dy / L) * TRACK_SEP / 2, (dx / L) * TRACK_SEP / 2];
    };
    const offsets = Array.from({ length: n }, (_, i) => perp(i));
    const nodes = {};
    for (let i = 0; i < n; i++) {
        const [ox, oy] = offsets[i];
        const [x, y] = pts[i];
        const label = stops[i].name;
        nodes[`ob_${i}`] = { id: `ob_${i}`, x: x + ox, y: y + oy, label, is_station: true };
        nodes[`ib_${i}`] = { id: `ib_${i}`, x: x - ox, y: y - oy, label, is_station: true };
    }
    const nd = (nid) => nodes[nid];
    const obEdges = [];
    const ibEdges = [];
    for (let i = 0; i < n - 1; i++) {
        const j = i + 1;
        let a = nd(`ob_${i}`);
        let b = nd(`ob_${j}`);
        obEdges.push({
            id: `ob_${i}_${j}`,
            from_node: `ob_${i}`,
            to_node: `ob_${j}`,
            block_id: `OB_B${i + 1}`,
            points: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }],
            length: edgeLen(a.x, a.y, b.x, b.y),
        });
        a = nd(`ib_${j}`);
        b = nd(`ib_${i}`);
        ibEdges.push({
            id: `ib_${j}_${i}`,
            from_node: `ib_${j}`,
            to_node: `ib_${i}`,
            block_id: `IB_B${j}`,
            points: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }],
            length: edgeLen(a.x, a.y, b.x, b.y),
        });
    }
    const xover = (eid, fn, tn) => {
        const a = nd(fn);
        const b = nd(tn);
        return {
            id: eid,
            from_node: fn,
            to_node: tn,
            block_id: `XOVER_${eid.toUpperCase()}`,
            points: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }],
            length: Math.max(edgeLen(a.x, a.y, b.x, b.y), 10),
        };
    };
    const xovers = [
        xover('xover_start', 'ib_0', 'ob_0'),
        xover('xover_end', `ob_${n - 1}`, `ib_${n - 1}`),
        ...MID_XOVER_STOPS.filter(idx => idx > 0 && idx < n - 1).map(idx => xover(`xover_mid_${idx}`, `ob_${idx}`, `ib_${idx}`)),
    ];
    const allEdges = [...obEdges, ...ibEdges, ...xovers];
    const signals = [...obEdges, ...ibEdges].map(e => {
        const p0 = e.points[0];
        const p1 = e.points[e.points.length - 1];
        const t = 0.08;
        return {
            id: `sig_${e.id}`,
            edge_id: e.id,
            offset: t,
            position: {
                x: p0.x + t * (p1.x - p0.x),
                y: p0.y + t * (p1.y - p0.y),
            },
            aspect: 'green',
            block_id: e.block_id,
        };
    });
    const xs = Object.values(nodes).map(v => v.x);
    const ys = Object.values(nodes).map(v => v.y);
    const bounds = {
        min_x: Math.min(...xs) - PAD,
        min_y: Math.min(...ys) - PAD,
        max_x: Math.max(...xs) + PAD,
        max_y: Math.max(...ys) + PAD,
    };
    const trainRoute = [
        ...Array.from({ length: n - 1 }, (_, i) => `ob_${i}_${i + 1}`),
        'xover_end',
        ...Array.from({ length: n - 1 }, (_, k) => {
            const j = n - 1 - k;
            return `ib_${j}_${j - 1}`;
        }),
        'xover_start',
    ];
    const switches = [
        {
            id: 'sw_start',
            node_id: 'ob_0',
            normal_edge_id: 'ob_0_1',
            reverse_edge_id: 'xover_start',
            state: 'normal',
        },
        {
            id: 'sw_end',
            node_id: `ob_${n - 1}`,
            normal_edge_id: `ob_${n - 2}_${n - 1}`,
            reverse_edge_id: 'xover_end',
            state: 'normal',
        },
        ...MID_XOVER_STOPS.filter(idx => idx > 0 && idx < n - 1).map(idx => ({
            id: `sw_mid_${idx}`,
            node_id: `ob_${idx}`,
            normal_edge_id: `ob_${idx}_${idx + 1}`,
            reverse_edge_id: `xover_mid_${idx}`,
            state: 'normal',
        })),
    ];
    const crossovers = [
        { id: 'xov_start', edge1_id: 'ob_0_1', edge2_id: 'ib_1_0', node_id: 'ob_0' },
        {
            id: 'xov_end',
            edge1_id: `ob_${n - 2}_${n - 1}`,
            edge2_id: `ib_${n - 1}_${n - 2}`,
            node_id: `ob_${n - 1}`,
        },
        ...MID_XOVER_STOPS.filter(idx => idx > 0 && idx < n - 1).map(idx => ({
            id: `xov_mid_${idx}`,
            edge1_id: `ob_${idx}_${idx + 1}`,
            edge2_id: `ib_${idx + 1}_${idx}`,
            node_id: `ob_${idx}`,
        })),
    ];
    return {
        topology: {
            nodes: Object.values(nodes),
            edges: allEdges,
            switches,
            crossovers,
            signals,
            bounds,
        },
        trainRoute,
    };
}
