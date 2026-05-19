export type SlackTier = 'nominal' | 'caution' | 'danger'

export const SLACK_CAUTION_M = 15
export const SLACK_DANGER_M = 0

export function slackTier(slack: number | undefined | null): SlackTier {
  if (slack == null || !Number.isFinite(slack)) return 'nominal'
  if (slack < SLACK_DANGER_M) return 'danger'
  if (slack < SLACK_CAUTION_M) return 'caution'
  return 'nominal'
}

export interface SafeZonePalette {
  core: string
  mid: string
  edge: string
  ring: string
}

// Gradients used by TrainLayer for the forward safe-zone orb.
const PALETTES: Record<SlackTier, SafeZonePalette> = {
  nominal: {
    core: 'rgba(40, 160, 255, 0.55)',
    mid:  'rgba(30, 120, 255, 0.28)',
    edge: 'rgba(10,  80, 220, 0.10)',
    ring: 'rgba( 0,  40, 200, 0.00)',
  },
  caution: {
    core: 'rgba(255, 196,  0, 0.65)',
    mid:  'rgba(255, 152,  0, 0.32)',
    edge: 'rgba(230, 100,  0, 0.12)',
    ring: 'rgba(180,  70,  0, 0.00)',
  },
  danger: {
    core: 'rgba(255,  60,  50, 0.75)',
    mid:  'rgba(230,  30,  30, 0.42)',
    edge: 'rgba(180,  20,  20, 0.18)',
    ring: 'rgba(120,   0,   0, 0.00)',
  },
}

export function safeZonePalette(slack: number | undefined | null): SafeZonePalette {
  return PALETTES[slackTier(slack)]
}
