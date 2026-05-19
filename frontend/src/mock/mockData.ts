/**
 * Mock topology + runtime state for UI-only development.
 * Matches the exact shape returned by GET /topology and GET /state.
 */
import type { RuntimeState } from '../types/domain'
import { buildYusTopology } from './buildYusTopology'

const { topology: MOCK_TOPOLOGY, trainRoute: TRAIN_ROUTE } = buildYusTopology()
export { MOCK_TOPOLOGY }

const allEdges = MOCK_TOPOLOGY.edges

const EDGE_LENGTHS: Record<string, number> = {}
for (const e of allEdges) EDGE_LENGTHS[e.id] = e.length

const TOTAL_ROUTE_LEN = TRAIN_ROUTE.reduce((s, eid) => s + (EDGE_LENGTHS[eid] ?? 600), 0)

interface MockTrainState {
  train_id: string
  label: string
  routeDist: number
  speed: number
}

const MOCK_TRAINS_INIT: MockTrainState[] = [
  { train_id: 'T01', label: 'T01', routeDist: 0, speed: 18 },
  { train_id: 'T02', label: 'T02', routeDist: TOTAL_ROUTE_LEN * 0.25, speed: 18 },
  { train_id: 'T03', label: 'T03', routeDist: TOTAL_ROUTE_LEN * 0.50, speed: 18 },
  { train_id: 'T04', label: 'T04', routeDist: TOTAL_ROUTE_LEN * 0.75, speed: 18 },
]

let _mockTrains = MOCK_TRAINS_INIT.map(t => ({ ...t }))
let _mockT = 0

function routeDistToEdgeOffset(dist: number): { edge_id: string; offset: number } {
  let acc = 0
  for (const eid of TRAIN_ROUTE) {
    const len = EDGE_LENGTHS[eid] ?? 600
    if (acc + len >= dist) {
      return { edge_id: eid, offset: Math.min(1, (dist - acc) / len) }
    }
    acc += len
  }
  return { edge_id: TRAIN_ROUTE[0], offset: 0 }
}

export function tickMockRuntime(dtMs: number): RuntimeState {
  const dt = dtMs / 1000
  _mockT += dt

  for (const t of _mockTrains) {
    t.routeDist = (t.routeDist + t.speed * dt) % TOTAL_ROUTE_LEN
  }

  const trains = _mockTrains.map(t => {
    const { edge_id, offset } = routeDistToEdgeOffset(t.routeDist)
    return {
      train_id: t.train_id,
      label: t.label,
      edge_id,
      offset,
      speed: t.speed,
      state: 'running' as const,
      safe_zone_front: 350,
      safe_zone_rear: 138,
      atp_slack_m: 50,
      authority_eoa_m: null,
    }
  })

  const occupiedBlocks = new Set(
    trains.map(t => allEdges.find(e => e.id === t.edge_id)?.block_id ?? ''),
  )

  const allBlockIds = [...new Set(allEdges.map(e => e.block_id))]
  const blocks = allBlockIds.map(bid => ({
    block_id: bid,
    occupancy: (occupiedBlocks.has(bid) ? 'occupied' : 'clear') as 'occupied' | 'clear',
  }))

  const signals = MOCK_TOPOLOGY.signals.map(sig => {
    const edgeIdx = TRAIN_ROUTE.indexOf(sig.edge_id)
    const nextEdgeId = TRAIN_ROUTE[(edgeIdx + 1) % TRAIN_ROUTE.length]
    const nextBlock = allEdges.find(e => e.id === nextEdgeId)?.block_id ?? ''
    const ownBlock = allEdges.find(e => e.id === sig.edge_id)?.block_id ?? ''
    let aspect: RuntimeState['signals'][0]['aspect'] = 'green'
    if (occupiedBlocks.has(ownBlock)) aspect = 'red'
    else if (occupiedBlocks.has(nextBlock)) aspect = 'yellow'
    return { signal_id: sig.id, aspect }
  })

  return {
    trains,
    blocks,
    switches: MOCK_TOPOLOGY.switches.map(sw => ({ switch_id: sw.id, state: sw.state })),
    signals,
    timestamp: _mockT,
  }
}
