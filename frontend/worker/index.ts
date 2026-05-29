interface Env {
  ASSETS: Fetcher
}

const CANONICAL_HOST = 'transitcontrol.richardli.dev'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.hostname.endsWith('.workers.dev')) {
      const redirect = new URL(url.pathname + url.search, `https://${CANONICAL_HOST}`)
      return Response.redirect(redirect.toString(), 301)
    }
    return env.ASSETS.fetch(request)
  },
}
