import type { TrainPosition } from '../types/domain'
import type { HelpTargetId } from './guide'

export interface HelpReply {
  reply: string
  point: HelpTargetId | null
}

/** Pull a run number from "where is run 4", "T04", "run 16", etc. */
export function parseRunNumber(question: string): number | null {
  const tagged = question.match(/\b(?:run|t)\s*0*(\d{1,2})\b/i)
  if (!tagged) return null
  const n = Number(tagged[1])
  return Number.isFinite(n) ? n : null
}

function findTrain(trains: TrainPosition[], n: number): TrainPosition | undefined {
  const id = `T${String(n).padStart(2, '0')}`
  return trains.find(
    (t) =>
      t.train_id === id
      || t.train_id === `T${n}`
      || new RegExp(`\\brun\\s*0*${n}\\b`, 'i').test(t.label),
  )
}

function describeTrain(t: TrainPosition): string {
  const name = t.label || t.train_id
  const kmh = Number.isFinite(t.speed) ? (t.speed * 3.6).toFixed(0) : null
  const extra = t.dispatch_hold
    ? ' It is held at the platform.'
    : t.dispatch_express
      ? ' It is running express (skipping stops).'
      : (t.dispatch_skip_remaining ?? 0) > 0
        ? ` It will skip the next ${t.dispatch_skip_remaining} stop(s).`
        : ''
  if (t.state === 'dwelling' && t.station_name) {
    return `${name} is stopped at ${t.station_name}.${extra}`
  }
  if (t.state === 'arriving' && t.station_name) {
    return `${name} is arriving at ${t.station_name}${kmh ? ` (~${kmh} km/h)` : ''}.${extra}`
  }
  if (t.station_name) {
    return `${name} is near ${t.station_name}${kmh ? `, moving ~${kmh} km/h` : ''}.${extra}`
  }
  return `${name} is on the line${kmh ? ` at ~${kmh} km/h` : ''}, not at a platform right now.${extra}`
}

export function answerWhereIs(question: string, trains: TrainPosition[]): HelpReply | null {
  const n = parseRunNumber(question)
  if (n == null) return null
  const placeAsk =
    /\b(where|find|locate|how's|how is|status)\b/i.test(question)
    || /^(?:run|t)\s*0*\d{1,2}\??$/i.test(question.trim())
  if (!placeAsk) return null

  if (trains.length === 0) {
    return { reply: `I don't have live train data yet — wait for /state, then ask again.`, point: 'map' }
  }
  const t = findTrain(trains, n)
  if (!t) {
    const sample = trains.slice(0, 8).map((x) => x.label).join(', ')
    return {
      reply: `I don't see a Run ${n} out there right now. On the board: ${sample}.`,
      point: 'map',
    }
  }
  return { reply: describeTrain(t), point: 'map' }
}
