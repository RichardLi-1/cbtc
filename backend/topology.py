"""Static line topology for map clients, built from real GTFS-derived stop coordinates."""

from __future__ import annotations
import json, math
from pathlib import Path

_DATA_DIR = Path(__file__).resolve().parent / "data"
_TRACK_SEP = 22   # pixels between outbound and inbound tracks
_PAD       = 200  # canvas padding


def _build_yus() -> tuple[dict, list[str]]:
    raw   = json.loads((_DATA_DIR / "yus_topology.json").read_text(encoding="utf-8"))
    stops = raw["line"]["stops"]   # [{name, coords:[lon,lat]}, ...]
    n     = len(stops)

    # ── project lon/lat → canvas pixels (equirectangular, aspect-correct) ──
    lons = [s["coords"][0] for s in stops]
    lats = [s["coords"][1] for s in stops]
    lon_min, lon_max = min(lons), max(lons)
    lat_min, lat_max = min(lats), max(lats)
    cos_lat = math.cos(math.radians((lat_min + lat_max) / 2))
    x_span  = (lon_max - lon_min) * cos_lat
    y_span  = lat_max - lat_min
    scale   = min(6000 / x_span, 5000 / y_span)   # fit in ~6000×5000

    def proj(lon: float, lat: float) -> tuple[float, float]:
        return (
            round(_PAD + (lon - lon_min) * cos_lat * scale, 1),
            round(_PAD + (lat_max - lat) * scale,           1),
        )

    pts = [proj(s["coords"][0], s["coords"][1]) for s in stops]

    # ── per-stop perpendicular offset (separates OB and IB tracks) ──
    def _perp(i: int) -> tuple[float, float]:
        a = pts[max(i - 1, 0)]
        b = pts[min(i + 1, n - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1
        return -dy / L * _TRACK_SEP / 2, dx / L * _TRACK_SEP / 2

    offsets = [_perp(i) for i in range(n)]

    # ── nodes ──
    nodes: dict[str, dict] = {}
    for i, s in enumerate(stops):
        ox, oy = offsets[i]
        x,  y  = pts[i]
        nodes[f'ob_{i}'] = {'id': f'ob_{i}', 'x': x + ox, 'y': y + oy, 'label': s['name'], 'is_station': True}
        nodes[f'ib_{i}'] = {'id': f'ib_{i}', 'x': x - ox, 'y': y - oy, 'label': s['name'], 'is_station': True}

    def nd(nid: str) -> dict:
        return nodes[nid]

    # ── edges ──
    def _edge_len(ax, ay, bx, by) -> float:
        return round(math.hypot(bx - ax, by - ay), 2) or 1.0

    ob_edges, ib_edges = [], []
    for i in range(n - 1):
        j = i + 1
        a, b = nd(f'ob_{i}'), nd(f'ob_{j}')
        ob_edges.append({
            'id': f'ob_{i}_{j}', 'from_node': f'ob_{i}', 'to_node': f'ob_{j}',
            'block_id': f'OB_B{i + 1}',
            'points': [{'x': a['x'], 'y': a['y']}, {'x': b['x'], 'y': b['y']}],
            'length': _edge_len(a['x'], a['y'], b['x'], b['y']),
        })
        a, b = nd(f'ib_{j}'), nd(f'ib_{i}')
        ib_edges.append({
            'id': f'ib_{j}_{i}', 'from_node': f'ib_{j}', 'to_node': f'ib_{i}',
            'block_id': f'IB_B{j}',
            'points': [{'x': a['x'], 'y': a['y']}, {'x': b['x'], 'y': b['y']}],
            'length': _edge_len(a['x'], a['y'], b['x'], b['y']),
        })

    # ── crossover edges ─────────────────────────────────────────────────────
    def _xover(eid, fn, tn) -> dict:
        a, b = nd(fn), nd(tn)
        return {
            'id': eid, 'from_node': fn, 'to_node': tn, 'block_id': f'XOVER_{eid.upper()}',
            'points': [{'x': a['x'], 'y': a['y']}, {'x': b['x'], 'y': b['y']}],
            'length': max(_edge_len(a['x'], a['y'], b['x'], b['y']), 10.0),
        }

    # Terminus loops
    xovers = [
        _xover('xover_start', f'ib_0',     f'ob_0'),
        _xover('xover_end',   f'ob_{n-1}', f'ib_{n-1}'),
    ]

    # Mid-line crossovers at real Line 1 pocket/crossover locations (stop indices)
    # 6=Sheppard West, 11=Eglinton West, 14=Spadina, 27=Bloor-Yonge, 32=Eglinton, 35=Sheppard-Yonge
    MID_XOVER_STOPS = [6, 11, 14, 27, 32, 35]
    mid_xovers = []
    for idx in MID_XOVER_STOPS:
        if 0 < idx < n - 1:
            mid_xovers.append(_xover(f'xover_mid_{idx}', f'ob_{idx}', f'ib_{idx}'))

    all_xovers = xovers + mid_xovers
    all_edges  = ob_edges + ib_edges + all_xovers

    # ── signals (one per revenue edge, 8 % from start) ──
    signals = []
    for e in ob_edges + ib_edges:
        p0, p1, t = e['points'][0], e['points'][-1], 0.08
        signals.append({
            'id': f"sig_{e['id']}", 'edge_id': e['id'], 'offset': t,
            'position': {'x': p0['x'] + t*(p1['x']-p0['x']), 'y': p0['y'] + t*(p1['y']-p0['y'])},
            'aspect': 'green', 'block_id': e['block_id'],
        })

    # ── bounds ──
    xs = [v['x'] for v in nodes.values()]
    ys = [v['y'] for v in nodes.values()]
    bounds = {'min_x': min(xs) - _PAD, 'min_y': min(ys) - _PAD,
              'max_x': max(xs) + _PAD, 'max_y': max(ys) + _PAD}

    # ── train route (for position mapping in main.py) ──
    train_route = (
        [f'ob_{i}_{i+1}' for i in range(n - 1)] +
        ['xover_end'] +
        [f'ib_{j}_{j-1}' for j in range(n - 1, 0, -1)] +
        ['xover_start']
    )

    switches = [
        {'id': 'sw_start', 'node_id': f'ob_0',     'normal_edge_id': f'ob_0_1',         'reverse_edge_id': 'xover_start', 'state': 'normal'},
        {'id': 'sw_end',   'node_id': f'ob_{n-1}', 'normal_edge_id': f'ob_{n-2}_{n-1}', 'reverse_edge_id': 'xover_end',   'state': 'normal'},
    ]
    for idx in MID_XOVER_STOPS:
        if 0 < idx < n - 1:
            switches.append({'id': f'sw_mid_{idx}', 'node_id': f'ob_{idx}',
                             'normal_edge_id': f'ob_{idx}_{idx+1}',
                             'reverse_edge_id': f'xover_mid_{idx}', 'state': 'normal'})

    crossovers = [
        {'id': 'xov_start', 'edge1_id': f'ob_0_1',         'edge2_id': f'ib_1_0',         'node_id': f'ob_0'},
        {'id': 'xov_end',   'edge1_id': f'ob_{n-2}_{n-1}', 'edge2_id': f'ib_{n-1}_{n-2}', 'node_id': f'ob_{n-1}'},
        *[{'id': f'xov_mid_{idx}', 'edge1_id': f'ob_{idx}_{idx+1}',
           'edge2_id': f'ib_{idx+1}_{idx}', 'node_id': f'ob_{idx}'}
          for idx in MID_XOVER_STOPS if 0 < idx < n - 1]
    ]

    topology = {
        'nodes':      list(nodes.values()),
        'edges':      all_edges,
        'switches':   switches,
        'crossovers': crossovers,
        'signals':    signals,
        'bounds':     bounds,
    }
    return topology, train_route


YUS_TOPOLOGY, YUS_TRAIN_ROUTE = _build_yus()


def get_topology_document(line_id: str) -> dict:
    key = (line_id or '').strip().upper()
    if key == 'YUS':
        return YUS_TOPOLOGY
    raise ValueError(f'unknown line_id: {line_id!r}')
