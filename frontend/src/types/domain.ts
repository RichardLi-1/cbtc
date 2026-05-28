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
  station_name?: string | null
  dwell_remaining_sec?: number
  safe_zone_front: number
  safe_zone_rear: number
  atp_slack_m?: number
  authority_eoa_m?: number | null
  fleet?: string
  passengers?: number
  passenger_capacity?: number
  load_pct?: number
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
  ops?: {
    dispatch?: {
      count: number
      last_dispatch_sim_t?: number | null
      next_due_in_s?: number
      blocked?: boolean
      max_trains?: number
    }
    injected_events?: InjectedEventRuntime[]
    event_log?: EventLogRow[]
  }
  /** Monotonic sim clock (seconds since backend sim start). */
  sim_time_s?: number
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

export type EventKind =
  | 'emergency_brake'
  | 'emergency_brake_release'
  | 'door_fault'
  | 'slow_speed'
  | 'signal_fail'
  | 'station_hold'
  | 'operator_note'

export interface InjectedEventRuntime {
  id: string
  kind: string
  target_train_id?: string | null
  target_signal_id?: string | null
  target_switch_id?: string | null
  duration_s: number
  remaining_s: number
  starts_in_s: number
  speed_limit_kph?: number | null
  note?: string
  source?: string
  active: boolean
  created_sim_t?: number
}

export interface EventLogRow {
  severity: 'info' | 'warn' | 'error'
  kind: string
  message: string
  source: string
  sim_t: number
}

/** @deprecated local-only; use ops.injected_events from /state */
export interface InjectedEvent {
  id: string
  kind: EventKind
  target_train_id: string
  duration_s: number
  active: boolean
}

// ── RL training (ML API on :8001, proxied as /ml) ─────────────────────────

export type TrainingStatusKind = 'idle' | 'running' | 'completed' | 'stopped' | 'failed'

export interface TrainingStatus {
  status?: TrainingStatusKind
  running?: boolean
  run_dir?: string
  experiment?: string
  total_timesteps?: number
  completed_timesteps?: number
  last_checkpoint?: string
  persist_checkpoints?: boolean
  error?: string | null
}

export interface TrainingSettings {
  persist_checkpoints: boolean
  resume: boolean
  config: string
}

// ── Dispatch A/B (ML API) ───────────────────────────────────────────────────

export interface DispatchMetrics {
  delay_mean_sec: number
  delay_p95_sec: number
  headway_std_mean_sec: number
  unsafe_action_rate: number
  episodes: number
}

export interface DispatchComparison {
  seed: number
  episodes: number
  policy_path: string
  rule_based: DispatchMetrics
  ppo: DispatchMetrics
  delta_pct: {
    delay_mean_sec_pct_vs_rule?: number | null
    delay_p95_sec_pct_vs_rule?: number | null
    headway_std_mean_sec_pct_vs_rule?: number | null
    unsafe_action_rate_pct_vs_rule?: number | null
  }
}

export interface DispatchPolicyInfo {
  path: string
  exists: boolean
  size_bytes: number
}
