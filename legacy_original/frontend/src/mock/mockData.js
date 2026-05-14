const NB_Y = 20;
const SB_Y = 80;
const STATION_X = [0, 600, 1200, 1800, 2400, 3000, 3600];
const STATION_NAMES = ['Finch', 'York Mills', 'Lawrence', 'Eglinton', 'Davisville', 'St. Clair', 'Summerhill'];
function nbEdge(i) {
    const [x0, x1] = [STATION_X[i], STATION_X[i + 1]];
    return {
        id: `nb_${i}${i + 1}`,
        from_node: `nb_${i}`,
        to_node: `nb_${i + 1}`,
        block_id: `NB_B${i + 1}`,
        points: [{ x: x0, y: NB_Y }, { x: x1, y: NB_Y }],
        length: x1 - x0,
    };
}
function sbEdge(i) {
    const [x0, x1] = [STATION_X[i], STATION_X[i - 1]];
    return {
        id: `sb_${i}${i - 1}`,
        from_node: `sb_${i}`,
        to_node: `sb_${i - 1}`,
        block_id: `SB_B${i}`,
        points: [{ x: x0, y: SB_Y }, { x: x1, y: SB_Y }],
        length: Math.abs(x1 - x0),
    };
}
const nbEdges = [0, 1, 2, 3, 4, 5].map(nbEdge);
const sbEdges = [6, 5, 4, 3, 2, 1].map(sbEdge);
const crossovers = [
    {
        id: 'xover_north',
        from_node: 'nb_6',
        to_node: 'sb_6',
        block_id: 'XOVER_N',
        points: [
            { x: 3600, y: NB_Y },
            { x: 3660, y: (NB_Y + SB_Y) / 2 },
            { x: 3600, y: SB_Y },
        ],
        length: 130,
    },
    {
        id: 'xover_south',
        from_node: 'sb_0',
        to_node: 'nb_0',
        block_id: 'XOVER_S',
        points: [
            { x: 0, y: SB_Y },
            { x: -60, y: (NB_Y + SB_Y) / 2 },
            { x: 0, y: NB_Y },
        ],
        length: 130,
    },
    {
        id: 'xover_mid_nb_sb',
        from_node: 'nb_3',
        to_node: 'sb_3',
        block_id: 'XOVER_MID',
        points: [{ x: 1800, y: NB_Y }, { x: 1800, y: SB_Y }],
        length: SB_Y - NB_Y,
    },
];
const allEdges = [...nbEdges, ...sbEdges, ...crossovers];
function makeSignals() {
    const sigs = [];
    for (const e of [...nbEdges, ...sbEdges]) {
        const p0 = e.points[0];
        const p1 = e.points[e.points.length - 1];
        const t = 0.08;
        sigs.push({
            id: `sig_${e.id}`,
            edge_id: e.id,
            offset: t,
            position: { x: p0.x + t * (p1.x - p0.x), y: p0.y + t * (p1.y - p0.y) },
            aspect: 'green',
            block_id: e.block_id,
        });
    }
    return sigs;
}
export const MOCK_TOPOLOGY = {
    nodes: [
        ...STATION_NAMES.map((label, i) => ({
            id: `nb_${i}`, x: STATION_X[i], y: NB_Y, label, is_station: true,
        })),
        ...STATION_NAMES.map((label, i) => ({
            id: `sb_${i}`, x: STATION_X[i], y: SB_Y, label, is_station: true,
        })),
    ],
    edges: allEdges,
    switches: [
        { id: 'sw_north', node_id: 'nb_6', normal_edge_id: 'xover_north', reverse_edge_id: 'xover_north', state: 'normal' },
        { id: 'sw_south', node_id: 'sb_0', normal_edge_id: 'xover_south', reverse_edge_id: 'xover_south', state: 'normal' },
        { id: 'sw_mid_nb', node_id: 'nb_3', normal_edge_id: 'nb_34', reverse_edge_id: 'xover_mid_nb_sb', state: 'normal' },
        { id: 'sw_mid_sb', node_id: 'sb_3', normal_edge_id: 'sb_32', reverse_edge_id: 'xover_mid_nb_sb', state: 'normal' },
    ],
    crossovers: [
        { id: 'xov_north', edge1_id: 'nb_56', edge2_id: 'sb_65', node_id: 'nb_6' },
        { id: 'xov_south', edge1_id: 'sb_10', edge2_id: 'nb_01', node_id: 'sb_0' },
        { id: 'xov_mid', edge1_id: 'nb_34', edge2_id: 'sb_32', node_id: 'nb_3' },
    ],
    signals: makeSignals(),
    bounds: { min_x: -80, min_y: 0, max_x: 3700, max_y: 100 },
};
// ── Animated mock runtime ──────────────────────────────────────────────────
const TRAIN_ROUTE = [
    'nb_01', 'nb_12', 'nb_23', 'nb_34', 'nb_45', 'nb_56',
    'xover_north',
    'sb_65', 'sb_54', 'sb_43', 'sb_32', 'sb_21', 'sb_10',
    'xover_south',
];
const EDGE_LENGTHS = {};
for (const e of allEdges)
    EDGE_LENGTHS[e.id] = e.length;
const TOTAL_ROUTE_LEN = TRAIN_ROUTE.reduce((s, eid) => s + (EDGE_LENGTHS[eid] ?? 600), 0);
const MOCK_TRAINS_INIT = [
    { train_id: 'T01', label: 'T01', routeDist: 0, speed: 18 },
    { train_id: 'T02', label: 'T02', routeDist: TOTAL_ROUTE_LEN * 0.25, speed: 18 },
    { train_id: 'T03', label: 'T03', routeDist: TOTAL_ROUTE_LEN * 0.50, speed: 18 },
    { train_id: 'T04', label: 'T04', routeDist: TOTAL_ROUTE_LEN * 0.75, speed: 18 },
];
let _mockTrains = MOCK_TRAINS_INIT.map(t => ({ ...t }));
let _mockT = 0;
function routeDistToEdgeOffset(dist) {
    let acc = 0;
    for (const eid of TRAIN_ROUTE) {
        const len = EDGE_LENGTHS[eid] ?? 600;
        if (acc + len >= dist) {
            return { edge_id: eid, offset: Math.min(1, (dist - acc) / len) };
        }
        acc += len;
    }
    return { edge_id: TRAIN_ROUTE[0], offset: 0 };
}
export function tickMockRuntime(dtMs) {
    const dt = dtMs / 1000;
    _mockT += dt;
    for (const t of _mockTrains) {
        t.routeDist = (t.routeDist + t.speed * dt) % TOTAL_ROUTE_LEN;
    }
    const trains = _mockTrains.map(t => {
        const { edge_id, offset } = routeDistToEdgeOffset(t.routeDist);
        return {
            train_id: t.train_id,
            label: t.label,
            edge_id,
            offset,
            speed: t.speed,
            state: 'running',
            safe_zone_front: 350,
            safe_zone_rear: 138,
        };
    });
    // Block occupancy
    const occupiedBlocks = new Set(trains.map(t => {
        const edge = allEdges.find(e => e.id === t.edge_id);
        return edge?.block_id ?? '';
    }));
    const allBlockIds = [...new Set(allEdges.map(e => e.block_id))];
    const blocks = allBlockIds.map(bid => ({
        block_id: bid,
        occupancy: (occupiedBlocks.has(bid) ? 'occupied' : 'clear'),
    }));
    // Signal aspects derived from occupancy
    const signals = makeSignals().map(sig => {
        const edgeIdx = TRAIN_ROUTE.indexOf(sig.edge_id);
        const nextEdgeId = TRAIN_ROUTE[(edgeIdx + 1) % TRAIN_ROUTE.length];
        const nextBlock = allEdges.find(e => e.id === nextEdgeId)?.block_id ?? '';
        const ownBlock = allEdges.find(e => e.id === sig.edge_id)?.block_id ?? '';
        let aspect = 'green';
        if (occupiedBlocks.has(ownBlock))
            aspect = 'red';
        else if (occupiedBlocks.has(nextBlock))
            aspect = 'yellow';
        return { signal_id: sig.id, aspect };
    });
    return {
        trains,
        blocks,
        switches: MOCK_TOPOLOGY.switches.map(sw => ({ switch_id: sw.id, state: sw.state })),
        signals,
        timestamp: _mockT,
    };
}
