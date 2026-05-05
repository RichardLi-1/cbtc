export const COLORS = {
  BACKGROUND: '#080d12',
  GRID: '#0f1a24',

  // Track
  TRACK_CLEAR: '#2a7a4a',
  TRACK_OCCUPIED: '#c0392b',
  TRACK_UNKNOWN: '#3a4a50',
  TRACK_CROSSOVER: '#1e5a78',
  TRACK_WIDTH: 4,
  TRACK_CROSSOVER_WIDTH: 3,

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
  SIGNAL_RADIUS: 6,

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
} as const

export type Color = typeof COLORS[keyof typeof COLORS]
