import { describe, expect, it } from 'vitest'
import { matchHelp } from './guide'
import { answerWhereIs, parseRunNumber } from './locate'
import type { TrainPosition } from '../types/domain'

describe('matchHelp', () => {
  it('points at the map for train questions', () => {
    const r = matchHelp('how do I hold a train?')
    expect(r.point).toBe('map')
    expect(r.reply.toLowerCase()).toContain('train')
  })

  it('points at status dots', () => {
    expect(matchHelp('why is /ml red?').point).toBe('status')
  })

  it('returns a fallback when nothing matches', () => {
    const r = matchHelp('asdf qwerty')
    expect(r.point).toBeNull()
    expect(r.reply.length).toBeGreaterThan(10)
  })
})

const sample: TrainPosition = {
  train_id: 'T04',
  label: 'Run 4',
  edge_id: 'e1',
  offset: 0.2,
  speed: 8,
  state: 'dwelling',
  station_name: 'St Clair',
  safe_zone_front: 40,
  safe_zone_rear: 138,
}

describe('answerWhereIs', () => {
  it('parses run 4', () => {
    expect(parseRunNumber('where is run 4')).toBe(4)
    expect(parseRunNumber('Where is T04?')).toBe(4)
  })

  it('answers from live trains', () => {
    const r = answerWhereIs('where is run 4?', [sample])
    expect(r?.point).toBe('map')
    expect(r?.reply).toContain('St Clair')
    expect(r?.reply).toContain('Run 4')
  })
})
