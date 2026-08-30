import { handleHelp } from './help'
import type { TrainPosition } from '../src/types/domain'

interface Env {
  ASSETS: Fetcher
  ANTHROPIC_API_KEY?: string
  AI?: {
    run(model: string, input: Record<string, unknown>): Promise<{ response?: string }>
  }
}

const CANONICAL_HOST = 'transitcontrol.richardli.dev'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.hostname.endsWith('.workers.dev')) {
      const redirect = new URL(url.pathname + url.search, `https://${CANONICAL_HOST}`)
      return Response.redirect(redirect.toString(), 301)
    }

    if (url.pathname === '/api/help' && request.method === 'POST') {
      let body: {
        question?: string
        history?: { role: string; content: string }[]
        trains?: TrainPosition[]
      } = {}
      try {
        body = (await request.json()) as typeof body
      } catch {
        return Response.json({ error: 'bad json' }, { status: 400 })
      }
      const result = await handleHelp(
        body.question ?? '',
        body.history ?? [],
        Array.isArray(body.trains) ? body.trains : [],
        env,
      )
      return Response.json(result, {
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    return env.ASSETS.fetch(request)
  },
}
