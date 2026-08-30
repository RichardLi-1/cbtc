import { HELP_TARGET_IDS, catalogForPrompt, matchHelp, type HelpTargetId } from './guide'
import { answerWhereIs, type HelpReply } from './locate'
import type { TrainPosition } from '../types/domain'

const MODEL = 'claude-sonnet-4-5'

type ChatTurn = { role: string; content: string }

function systemPrompt(trains: TrainSnapshot[]): string {
  const roster = trains.length
    ? trains.map((t) =>
      `${t.label}: ${t.state}${t.station ? ` @ ${t.station}` : ''}${t.kmh != null ? ` ${t.kmh}km/h` : ''}`,
    ).join('\n')
    : '(no live trains)'
  return `You are a short guide for a CBTC train-dispatch screen.
Reply in 1-3 plain sentences. No markdown.
If the user asks about a UI region, set "point" to exactly one of: ${HELP_TARGET_IDS.join(', ')}.
If they ask where a train is, set "point" to "map". Otherwise "point" can be null.
Return ONLY JSON: {"reply":"...","point":"map"|null}

UI catalog:
${catalogForPrompt()}

Live trains right now:
${roster}`
}

export interface TrainSnapshot {
  label: string
  state: string
  station: string | null
  kmh: number | null
}

export function snapshotTrains(trains: TrainPosition[]): TrainSnapshot[] {
  return trains.map((t) => ({
    label: t.label || t.train_id,
    state: t.state,
    station: t.station_name ?? null,
    kmh: Number.isFinite(t.speed) ? Math.round(t.speed * 3.6) : null,
  }))
}

function parseModelJson(text: string): HelpReply | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const data = JSON.parse(text.slice(start, end + 1)) as { reply?: unknown; point?: unknown }
    if (typeof data.reply !== 'string' || !data.reply.trim()) return null
    const point = typeof data.point === 'string' && (HELP_TARGET_IDS as readonly string[]).includes(data.point)
      ? (data.point as HelpTargetId)
      : null
    return { reply: data.reply.trim(), point }
  } catch {
    return null
  }
}

async function askAnthropic(
  question: string,
  history: ChatTurn[],
  apiKey: string,
  trains: TrainSnapshot[],
): Promise<HelpReply | null> {
  const messages: { role: 'user' | 'assistant'; content: string }[] = []
  for (const m of history.slice(-6)) {
    const role = m.role === 'assistant' ? 'assistant' : 'user'
    const content = String(m.content ?? '').slice(0, 500)
    if (!content) continue
    if (messages.length === 0 && role !== 'user') continue
    const last = messages[messages.length - 1]
    if (last && last.role === role) last.content += `\n${content}`
    else messages.push({ role, content })
  }
  messages.push({ role: 'user', content: question.slice(0, 500) })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 280,
      system: systemPrompt(trains),
      messages,
    }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { content?: { type: string; text?: string }[] }
  const text = data.content?.find((c) => c.type === 'text')?.text ?? ''
  return parseModelJson(text)
}

export async function answerHelp(opts: {
  question: string
  history: ChatTurn[]
  trains: TrainPosition[]
  anthropicKey?: string
  workersAi?: {
    run(model: string, input: Record<string, unknown>): Promise<{ response?: string }>
  }
}): Promise<HelpReply> {
  const q = opts.question.trim().slice(0, 500)
  if (!q) return matchHelp('')

  const located = answerWhereIs(q, opts.trains)
  if (located) return located

  const snap = snapshotTrains(opts.trains)

  if (opts.anthropicKey) {
    try {
      const hit = await askAnthropic(q, opts.history, opts.anthropicKey, snap)
      if (hit) return hit
    } catch { /* fall through */ }
  }

  if (opts.workersAi) {
    try {
      const result = await opts.workersAi.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt(snap) },
          ...opts.history.slice(-6).map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: String(m.content ?? '').slice(0, 500),
          })),
          { role: 'user', content: q },
        ],
      })
      const parsed = parseModelJson(result.response ?? '')
      if (parsed) return parsed
    } catch { /* fall through */ }
  }

  return matchHelp(q)
}
