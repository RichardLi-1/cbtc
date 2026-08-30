import { answerHelp } from './help'

interface Env {
  ASSETS: Fetcher
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
      let body: { question?: string; history?: { role: string; content: string }[] } = {}
      try {
        body = (await request.json()) as typeof body
      } catch {
        return Response.json({ error: 'bad json' }, { status: 400 })
      }
      const result = await answerHelp(body.question ?? '', body.history ?? [], env.AI)
      return Response.json(result, {
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    return env.ASSETS.fetch(request)
  },
}
