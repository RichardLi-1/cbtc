import { describe, expect, it } from 'vitest'
import { matchHelp } from './guide'

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
