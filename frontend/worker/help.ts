import { catalogForPrompt, matchHelp, HELP_TARGET_IDS } from '../src/help/guide'

interface AiBinding {
  run(model: string, input: Record<string, unknown>): Promise<{ response?: string }>
}

const SYSTEM = `You are a short guide for a CBTC train-dispatch screen.
Reply in 1-3 plain sentences. No markdown.
If the user is asking about a UI region, set "point" to exactly one of: ${HELP_TARGET_IDS.join(', ')}.
Otherwise set "point" to null.
Return ONLY JSON: {"reply":"...","point":"map"|null}

Catalog:
${catalogForPrompt()}`

function parseModelJson(text: string): { reply: string; point: string | null } | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const data = JSON.parse(text.slice(start, end + 1)) as { reply?: unknown; point?: unknown }
    if (typeof data.reply !== 'string' || !data.reply.trim()) return null
    const point = typeof data.point === 'string' && (HELP_TARGET_IDS as readonly string[]).includes(data.point)
      ? data.point
      : null
    return { reply: data.reply.trim(), point }
  } catch {
    return null
  }
}

export async function answerHelp(
  question: string,
  history: { role: string; content: string }[],
  ai: AiBinding | undefined,
): Promise<{ reply: string; point: string | null }> {
  const q = question.trim().slice(0, 500)
  if (!q) return matchHelp('')

  if (ai) {
    try {
      const messages = [
        { role: 'system', content: SYSTEM },
        ...history.slice(-6).map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content ?? '').slice(0, 500),
        })),
        { role: 'user', content: q },
      ]
      const result = await ai.run('@cf/meta/llama-3.1-8b-instruct', { messages })
      const parsed = parseModelJson(result.response ?? '')
      if (parsed) return parsed
    } catch {
      /* fall through to keyword guide */
    }
  }

  return matchHelp(q)
}
