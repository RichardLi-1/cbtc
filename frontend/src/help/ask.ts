import { HELP_TARGET_IDS, matchHelp, type HelpTargetId } from './guide'

export interface HelpMessage {
  role: 'user' | 'assistant'
  text: string
}

export interface HelpReply {
  reply: string
  point: HelpTargetId | null
}

function parsePoint(raw: unknown): HelpTargetId | null {
  if (typeof raw !== 'string') return null
  const id = raw.trim()
  return (HELP_TARGET_IDS as readonly string[]).includes(id) ? (id as HelpTargetId) : null
}

export async function askHelp(question: string, history: HelpMessage[]): Promise<HelpReply> {
  try {
    const res = await fetch('/api/help', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        history: history.slice(-8).map((m) => ({ role: m.role, content: m.text })),
      }),
    })
    if (res.ok) {
      const data = (await res.json()) as { reply?: string; point?: unknown }
      if (data.reply) return { reply: data.reply, point: parsePoint(data.point) }
    }
  } catch {
    /* Vite has no /api/help — use the local guide. */
  }
  return matchHelp(question)
}
