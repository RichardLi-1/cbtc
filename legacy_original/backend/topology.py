"""Static line topology for map clients (separate from live /state)."""

from __future__ import annotations

_NB_Y = 20
_SB_Y = 80
_STATION_X = [0, 600, 1200, 1800, 2400, 3000, 3600]
_STATION_NAMES = ['Finch', 'York Mills', 'Lawrence', 'Eglinton', 'Davisville', 'St. Clair', 'Summerhill']


def _nb_edge(i: int) -> dict:
    x0, x1 = _STATION_X[i], _STATION_X[i + 1]
    return {
        'id': f'nb_{i}{i + 1}',
        'from_node': f'nb_{i}', 'to_node': f'nb_{i + 1}',
        'block_id': f'NB_B{i + 1}',
        'points': [{'x': x0, 'y': _NB_Y}, {'x': x1, 'y': _NB_Y}],
        'length': x1 - x0,
    }


def _sb_edge(i: int) -> dict:
    x0, x1 = _STATION_X[i], _STATION_X[i - 1]
    return {
        'id': f'sb_{i}{i - 1}',
        'from_node': f'sb_{i}', 'to_node': f'sb_{i - 1}',
        'block_id': f'SB_B{i}',
        'points': [{'x': x0, 'y': _SB_Y}, {'x': x1, 'y': _SB_Y}],
        'length': abs(x1 - x0),
    }


_nb_edges  = [_nb_edge(i) for i in range(6)]
_sb_edges  = [_sb_edge(i) for i in [6, 5, 4, 3, 2, 1]]
_xovers    = [
    {
        'id': 'xover_north', 'from_node': 'nb_6', 'to_node': 'sb_6',
        'block_id': 'XOVER_N',
        'points': [{'x': 3600, 'y': _NB_Y}, {'x': 3660, 'y': (_NB_Y + _SB_Y) / 2}, {'x': 3600, 'y': _SB_Y}],
        'length': 130,
    },
    {
        'id': 'xover_south', 'from_node': 'sb_0', 'to_node': 'nb_0',
        'block_id': 'XOVER_S',
        'points': [{'x': 0, 'y': _SB_Y}, {'x': -60, 'y': (_NB_Y + _SB_Y) / 2}, {'x': 0, 'y': _NB_Y}],
        'length': 130,
    },
    {
        'id': 'xover_mid_nb_sb', 'from_node': 'nb_3', 'to_node': 'sb_3',
        'block_id': 'XOVER_MID',
        'points': [{'x': 1800, 'y': _NB_Y}, {'x': 1800, 'y': _SB_Y}],
        'length': _SB_Y - _NB_Y,
    },
]
_all_edges = _nb_edges + _sb_edges + _xovers


def _make_signals() -> list:
    sigs = []
    for e in _nb_edges + _sb_edges:
        p0, p1, t = e['points'][0], e['points'][-1], 0.08
        sigs.append({
            'id': f"sig_{e['id']}",
            'edge_id': e['id'],
            'offset': t,
            'position': {'x': p0['x'] + t * (p1['x'] - p0['x']), 'y': p0['y'] + t * (p1['y'] - p0['y'])},
            'aspect': 'green',
            'block_id': e['block_id'],
        })
    return sigs


YUS_TOPOLOGY: dict = {
    'nodes': [
        *[{'id': f'nb_{i}', 'x': _STATION_X[i], 'y': _NB_Y, 'label': _STATION_NAMES[i], 'is_station': True} for i in range(7)],
        *[{'id': f'sb_{i}', 'x': _STATION_X[i], 'y': _SB_Y, 'label': _STATION_NAMES[i], 'is_station': True} for i in range(7)],
    ],
    'edges': _all_edges,
    'switches': [
        {'id': 'sw_north',  'node_id': 'nb_6', 'normal_edge_id': 'xover_north',     'reverse_edge_id': 'xover_north',     'state': 'normal'},
        {'id': 'sw_south',  'node_id': 'sb_0', 'normal_edge_id': 'xover_south',     'reverse_edge_id': 'xover_south',     'state': 'normal'},
        {'id': 'sw_mid_nb', 'node_id': 'nb_3', 'normal_edge_id': 'nb_34',           'reverse_edge_id': 'xover_mid_nb_sb', 'state': 'normal'},
        {'id': 'sw_mid_sb', 'node_id': 'sb_3', 'normal_edge_id': 'sb_32',           'reverse_edge_id': 'xover_mid_nb_sb', 'state': 'normal'},
    ],
    'crossovers': [
        {'id': 'xov_north', 'edge1_id': 'nb_56', 'edge2_id': 'sb_65', 'node_id': 'nb_6'},
        {'id': 'xov_south', 'edge1_id': 'sb_10', 'edge2_id': 'nb_01', 'node_id': 'sb_0'},
        {'id': 'xov_mid',   'edge1_id': 'nb_34', 'edge2_id': 'sb_32', 'node_id': 'nb_3'},
    ],
    'signals': _make_signals(),
    'bounds': {'min_x': -80, 'min_y': 0, 'max_x': 3700, 'max_y': 100},
}


def get_topology_document(line_id: str) -> dict:
    key = (line_id or '').strip().upper()
    if key == 'YUS':
        return YUS_TOPOLOGY
    raise ValueError(f'unknown line_id: {line_id!r}')
