import json
import time

from fastapi import FastAPI
import train
import topology

app = FastAPI()

# ── Route helpers for position → edge mapping ──────────────────────────────

_TRAIN_ROUTE = topology.YUS_TRAIN_ROUTE
_EDGES       = {e['id']: e for e in topology.YUS_TOPOLOGY['edges']}
_ROUTE_LEN   = sum(_EDGES[eid]['length'] for eid in _TRAIN_ROUTE)


def _pos_to_edge(position: float) -> tuple[str, float]:
    dist = position % _ROUTE_LEN
    acc = 0.0
    for eid in _TRAIN_ROUTE:
        length = _EDGES[eid]['length']
        if acc + length >= dist:
            return eid, min(1.0, (dist - acc) / length)
        acc += length
    return _TRAIN_ROUTE[0], 0.0


# ── Routes ─────────────────────────────────────────────────────────────────

@app.get("/topology")
def get_topology():
    return topology.get_topology_document('YUS')


@app.get("/state")
def get_state():
    raw = json.loads(train.getState())

    trains_out = []
    for line_data in raw:
        for t in line_data['trains']:
            eid, offset = _pos_to_edge(t['position'])
            v_mps = t['speed'] / 3.6
            brake_dist = (v_mps ** 2) / (2.0 * 1.5)
            trains_out.append({
                'train_id': f"T{t['run_number']:02d}",
                'label':    f"T{t['run_number']:02d}",
                'edge_id':  eid,
                'offset':   offset,
                'speed':    t['speed'],
                'state':    'running',
                'safe_zone_front': 10.0 + brake_dist,
                'safe_zone_rear':  138.0,
            })

    occupied = {_EDGES[t['edge_id']]['block_id'] for t in trains_out if t['edge_id'] in _EDGES}

    blocks = [
        {'block_id': bid, 'occupancy': 'occupied' if bid in occupied else 'clear'}
        for bid in {e['block_id'] for e in topology.YUS_TOPOLOGY['edges']}
    ]

    switches = [{'switch_id': sw['id'], 'state': sw['state']} for sw in topology.YUS_TOPOLOGY['switches']]

    signals = []
    for sig in topology.YUS_TOPOLOGY['signals']:
        eid = sig['edge_id']
        idx = _TRAIN_ROUTE.index(eid) if eid in _TRAIN_ROUTE else -1
        next_bid = _EDGES[_TRAIN_ROUTE[(idx + 1) % len(_TRAIN_ROUTE)]]['block_id'] if idx >= 0 else ''
        own_bid  = _EDGES.get(eid, {}).get('block_id', '')
        aspect = 'red' if own_bid in occupied else ('yellow' if next_bid in occupied else 'green')
        signals.append({'signal_id': sig['id'], 'aspect': aspect})

    return {
        'trains':    trains_out,
        'blocks':    blocks,
        'switches':  switches,
        'signals':   signals,
        'timestamp': time.time(),
    }
