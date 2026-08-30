import { HELP_TARGET_IDS, matchHelp, type HelpTargetId } from './guide'
import { answerWhereIs, type HelpReply } from './locate'
import { useRuntimeStore } from '../store/runtimeStore'

export interface HelpMessage {
  role: 'user' | 'assistant'
  text: string
}

function parsePoint(raw: unknown): HelpTargetId | null {
  if (typeof raw !== 'string') return null
  const id = raw.trim()
  return (HELP_TARGET_IDS as readonly string[]).includes(id) ? (id as HelpTargetId) : null
}

export async function askHelp(question: string, history: HelpMessage[]): Promise<HelpReply> {
  const trains = useRuntimeStore.getState().runtime?.trains ?? []
  try {
    const res = await fetch('/api/help', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        history: history.slice(-8).map((m) => ({ role: m.role, content: m.text })),
        trains,
      }),
    })
    if (res.ok) {
      const data = (await res.json()) as { reply?: string; point?: unknown }
      if (data.reply) return { reply: data.reply, point: parsePoint(data.point) }
    }
  } catch {
    /* no /api/help */
  }
  return answerWhereIs(question, trains) ?? matchHelp(question)
}
