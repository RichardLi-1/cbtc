export const HELP_TARGET_IDS = [
  'header',
  'status',
  'map',
  'events',
  'inject',
  'dispatch',
  'safe-zones',
  'labels',
  'info',
] as const

export type HelpTargetId = (typeof HELP_TARGET_IDS)[number]

export interface HelpTarget {
  id: HelpTargetId
  label: string
  keywords: string[]
  answer: string
}

export const HELP_TARGETS: HelpTarget[] = [
  {
    id: 'header',
    label: 'top bar',
    keywords: ['header', 'top bar', 'toolbar', 'clock', 'sim time', 'title'],
    answer:
      'The top bar is the control strip. Left: clocks (wall + SIM time from 06:00). Middle: green/red dots show if each backend is up. Right: buttons for help, info, and view toggles.',
  },
  {
    id: 'status',
    label: 'connection dots',
    keywords: ['dot', 'status', 'health', 'backend', '/state', '/topology', '/commands', '/ml', 'connected', 'abort', 'error'],
    answer:
      'Those ● dots are live API checks. They stay hidden unless something is red, or you turn on DEV (Ctrl+Shift+D). Green = up. Red = failed. /topology and /state are the sim. /commands is click-to-control. /ml is the trainer.',
  },
  {
    id: 'map',
    label: 'track map',
    keywords: ['map', 'canvas', 'track', 'train', 'switch', 'signal', 'zoom', 'pan', 'click', 'hold', 'express', 'skip'],
    answer:
      'The big dark area is the track map. Drag to pan, scroll to zoom, double-click to fit. Hover for tooltips. Click a switch or signal to command it. Click a train for hold / express / skip / release.',
  },
  {
    id: 'events',
    label: 'events panel',
    keywords: ['event', 'log', 'alarm', 'right panel', 'feed'],
    answer:
      'EVENTS (right side) is the log of what just happened — signals, commands, faults. Collapse it with ✕ if it covers the map. Open the chip in the top-right to bring it back.',
  },
  {
    id: 'inject',
    label: 'inject event',
    keywords: ['inject', 'fault', 'delay', 'simulate event', 'scenario'],
    answer:
      'INJECT EVENT (inside EVENTS) lets you fake a disruption — door interlock, speed restriction, etc. — to see how the sim reacts. Expand that row, pick a kind, send it.',
  },
  {
    id: 'dispatch',
    label: 'dispatch A/B',
    keywords: ['dispatch', 'ppo', 'ml', 'rule', 'compare', 'policy', 'a/b', 'bottom left'],
    answer:
      'DISPATCH A/B (bottom-left) compares rule-based vs ML (PPO) dispatch. RULE vs PPO switches who picks the next move on the live sim. Compare runs a batch offline. /ops/dispatch/policy is the sim; /ml is the trainer.',
  },
  {
    id: 'safe-zones',
    label: 'safe zones',
    keywords: ['safe zone', 'atp', 'braking', 'envelope'],
    answer:
      'SAFE ZONES paints each train’s braking envelope on the map — green ahead, orange behind. Turn it on from the top bar if you want to see why a train is slowing.',
  },
  {
    id: 'labels',
    label: 'labels',
    keywords: ['label', 'name', 'station name', 'train id'],
    answer:
      'LABELS toggles station and train names on the map. Off = cleaner picture. On = easier to find Run 4 or a platform.',
  },
  {
    id: 'info',
    label: 'info',
    keywords: ['info', 'about', 'what is this', 'help me start'],
    answer:
      'INFO is a short primer on this dispatch board. HELP (this chat) can also point at the live UI. Ctrl+Shift+C opens a hidden config panel.',
  },
]

const FALLBACK =
  'Ask about the map, events, dispatch, the green/red dots, trains, or safe zones — I’ll point at that part of the screen.'

export function matchHelp(question: string): { reply: string; point: HelpTargetId | null } {
  const q = question.toLowerCase()
  let best: HelpTarget | null = null
  let score = 0
  for (const t of HELP_TARGETS) {
    const hits = t.keywords.filter((k) => q.includes(k)).length
    if (hits > score) {
      score = hits
      best = t
    }
  }
  if (!best || score === 0) return { reply: FALLBACK, point: null }
  return { reply: best.answer, point: best.id }
}

export function catalogForPrompt(): string {
  return HELP_TARGETS.map((t) => `- ${t.id}: ${t.label} — ${t.answer}`).join('\n')
}
