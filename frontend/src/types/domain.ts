// ── Primitives ────────────────────────────────────────────────────────────

export interface Vec2 { x: number; y: number }
export interface Bounds { minX: number; minY: number; maxX: number; maxY: number }

// ── Topology (static, from GET /topology) ────────────────────────────────

export interface TopologyNode {
  id: string
  x: number
  y: number
  label: string
  is_station: boolean
}

export interface TopologyEdge {
  id: string
  from_node: string
  to_node: string
  block_id: string
  points: Vec2[]
  length: number
}

export type SwitchState = 'normal' | 'reverse'

export interface TopologySwitch {
  id: string
  node_id: string
  normal_edge_id: string
  reverse_edge_id: string
  state: SwitchState
}

export interface TopologyCrossover {
  id: string
  edge1_id: string
  edge2_id: string
  node_id: string
}

export type SignalAspect = 'red' | 'yellow' | 'green' | 'flashing_yellow' | 'dark'

export interface TopologySignal {
  id: string
  edge_id: string
  offset: number
  position: Vec2
  aspect: SignalAspect
  block_id: string
}

export interface Topology {
  nodes: TopologyNode[]
  edges: TopologyEdge[]
  switches: TopologySwitch[]
  crossovers: TopologyCrossover[]
  signals: TopologySignal[]
  bounds: { min_x: number; min_y: number; max_x: number; max_y: number }
}

// ── Runtime state (dynamic, from GET /state) ──────────────────────────────

export type BlockOccupancy = 'clear' | 'occupied' | 'unknown'
export type TrainState = 'running' | 'arriving' | 'dwelling'

export interface TrainPosition {
  train_id: string
  label: string
  edge_id: string
  offset: number
  /** Metres per second (mock and GET /state). */
  speed: number
  state: TrainState
  safe_zone_front: number
  safe_zone_rear: number
  atp_slack_m?: number
  authority_eoa_m?: number | null
}

export interface BlockRuntime {
  block_id: string
  occupancy: BlockOccupancy
}

export interface SwitchRuntime {
  switch_id: string
  state: SwitchState
}

export interface SignalRuntime {
  signal_id: string
  aspect: SignalAspect
}

export interface RuntimeState {
  trains: TrainPosition[]
  blocks: BlockRuntime[]
  switches: SwitchRuntime[]
  signals: SignalRuntime[]
  timestamp: number
}

// ── Interaction ───────────────────────────────────────────────────────────

export type EntityKind = 'switch' | 'signal' | 'train' | 'block'

export interface HoveredEntity {
  kind: EntityKind
  id: string
  screenX: number
  screenY: number
}

// ── Config (hidden panel) ─────────────────────────────────────────────────

export interface RollingStockProfile {
  id: string
  name: string
  max_speed: number     // m/s
  accel: number         // m/s²
  decel: number         // m/s²
  length: number        // m
  mass: number          // tonnes
}

export interface SimConfig {
  rolling_stock_pct: number           // % of fleet at max capacity
  active_profile: string              // profile id
  profiles: RollingStockProfile[]
  headway_target: number              // s
  injected_events: InjectedEvent[]
}

export type EventKind = 'emergency_brake' | 'door_fault' | 'slow_speed' | 'signal_fail'

export interface InjectedEvent {
  id: string
  kind: EventKind
  target_train_id: string
  duration_s: number
  active: boolean
}
