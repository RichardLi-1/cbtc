const DEFAULT = {
  BACKGROUND: '#080d12',
  GRID: '#0f1a24',

  // Track
  TRACK_CLEAR: '#2a7a4a',
  TRACK_OCCUPIED: '#c0392b',
  TRACK_UNKNOWN: '#3a4a50',
  TRACK_CROSSOVER: '#1e5a78',
  TRACK_WIDTH: 2,
  TRACK_CROSSOVER_WIDTH: 1.5,

  // Block overlays
  BLOCK_OCCUPIED_FILL: 'rgba(192, 57, 43, 0.25)',
  BLOCK_CLEAR_FILL: 'rgba(0,0,0,0)',

  // Signals
  SIGNAL_GREEN: '#00e676',
  SIGNAL_YELLOW: '#ffd600',
  SIGNAL_RED: '#ff1744',
  SIGNAL_FLASHING_YELLOW: '#ff9800',
  SIGNAL_DARK: '#1c2a30',
  SIGNAL_BORDER: '#334455',
  SIGNAL_RADIUS: 4,

  // Station markers
  STATION_MARKER_FILL: '#8bc34a',
  STATION_MARKER_BORDER: '#263238',
  STATION_MARKER_HALO: 'rgba(139, 195, 74, 0.35)',
  STATION_LABEL_BG: 'rgba(8, 18, 26, 0.85)',

  // Switches
  SWITCH_NORMAL: '#00e5ff',
  SWITCH_REVERSE: '#ff6d00',
  SWITCH_RADIUS: 7,

  // Trains
  TRAIN_FILL: '#0288d1',
  TRAIN_BORDER: '#81d4fa',
  TRAIN_LABEL: '#ffffff',
  TRAIN_DWELL: '#7b1fa2',
  TRAIN_ARRIVING: '#0288d1',
  TRAIN_SAFE_ZONE_FRONT: 'rgba(0, 230, 118, 0.18)',
  TRAIN_SAFE_ZONE_REAR: 'rgba(255, 109, 0, 0.12)',

  // Labels
  STATION_LABEL: '#90a4ae',
  TRAIN_ID_LABEL: '#e0f7fa',
  HUD: '#b0bec5',

  // UI chrome
  PANEL_BG: '#0b1620',
  PANEL_BORDER: '#1e3040',
  PANEL_TEXT: '#cdd6dd',
  PANEL_TEXT_DIM: '#607d8b',
  BUTTON_BG: '#132030',
  BUTTON_HOVER: '#1e3040',
  BUTTON_ACTIVE: '#0288d1',
  ERROR_BANNER: '#b71c1c',
  STALE_BANNER: '#e65100',
  SUCCESS: '#00e676',
}

type Palette = typeof DEFAULT

/** White-on-black, thicker tracks, no dim gray. */
const HIGH_CONTRAST: Palette = {
  ...DEFAULT,
  BACKGROUND: '#000000',
  GRID: '#222222',
  TRACK_CLEAR: '#39ff14',
  TRACK_OCCUPIED: '#ff3333',
  TRACK_UNKNOWN: '#bbbbbb',
  TRACK_CROSSOVER: '#00e5ff',
  TRACK_WIDTH: 4,
  TRACK_CROSSOVER_WIDTH: 3,
  SIGNAL_GREEN: '#39ff14',
  SIGNAL_YELLOW: '#ffff00',
  SIGNAL_RED: '#ff3333',
  SIGNAL_FLASHING_YELLOW: '#ffcc00',
  SIGNAL_DARK: '#111111',
  SIGNAL_BORDER: '#ffffff',
  SIGNAL_RADIUS: 6,
  STATION_MARKER_FILL: '#ffff00',
  STATION_MARKER_BORDER: '#ffffff',
  STATION_MARKER_HALO: 'rgba(255, 255, 0, 0.45)',
  STATION_LABEL_BG: 'rgba(0, 0, 0, 0.92)',
  SWITCH_NORMAL: '#00ffff',
  SWITCH_REVERSE: '#ff8800',
  SWITCH_RADIUS: 9,
  TRAIN_FILL: '#00aaff',
  TRAIN_BORDER: '#ffffff',
  TRAIN_LABEL: '#ffffff',
  TRAIN_DWELL: '#ff00ff',
  TRAIN_ARRIVING: '#00aaff',
  TRAIN_SAFE_ZONE_FRONT: 'rgba(57, 255, 20, 0.35)',
  TRAIN_SAFE_ZONE_REAR: 'rgba(255, 136, 0, 0.3)',
  STATION_LABEL: '#ffffff',
  TRAIN_ID_LABEL: '#ffffff',
  HUD: '#ffffff',
  PANEL_BG: '#000000',
  PANEL_BORDER: '#ffffff',
  PANEL_TEXT: '#ffffff',
  PANEL_TEXT_DIM: '#dddddd',
  BUTTON_BG: '#111111',
  BUTTON_HOVER: '#333333',
  BUTTON_ACTIVE: '#0066ff',
  ERROR_BANNER: '#ff6666',
  STALE_BANNER: '#ffcc00',
  SUCCESS: '#39ff14',
}

/** Live palette. Mutated by applyHighContrast so canvas + UI stay in sync. */
export const COLORS: Palette = { ...DEFAULT }

export function applyHighContrast(on: boolean): void {
  Object.assign(COLORS, on ? HIGH_CONTRAST : DEFAULT)
}

export type Color = typeof COLORS[keyof typeof COLORS]
