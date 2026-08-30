// POST /api/track  — body: { event: string, meta?: Record<string, string> }
//
// Why a serverless function instead of calling Discord from the browser?
// The webhook URL is a secret — anyone with it can post to your channel.
// Routing through here keeps the URL in process.env (server memory) so it
// never ships in the JS bundle the browser downloads.
// 📖 Vercel Functions — https://vercel.com/docs/functions
import { reverse } from 'node:dns/promises'

// Hostnames that mean "this IP lives in a cloud/hosting datacenter" → not a
// real human on a laptop. Reverse DNS for an AWS box looks like
// ec2-13-57-56-27.us-west-1.compute.amazonaws.com — the keywords give it away.
const DATACENTER_RE =
  /amazonaws|compute|googleusercontent|google|azure|cloudapp|digitalocean|linode|ovh|hetzner|vultr|hosting|servers?\b|colo|datacenter/i

// Reverse-DNS the visitor IP (PTR record) with a short timeout so a slow or
// missing lookup never delays the response. Returns the hostname or null.
async function lookupHost(ip?: string): Promise<string | null> {
  if (!ip) return null
  try {
    const names = await Promise.race([
      reverse(ip),
      new Promise<string[]>((_, reject) =>
        setTimeout(() => reject(new Error('dns-timeout')), 1500),
      ),
    ])
    return names?.[0] ?? null
  } catch {
    // No PTR record (common for residential IPs) or timeout — not an error.
    return null
  }
}

export async function POST(request: Request): Promise<Response> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  // No secret configured (e.g. fresh clone) → do nothing. Tracking is non-critical.
  if (!webhookUrl) return new Response(null, { status: 204 })

  const { event, meta = {} } = (await request.json()) as {
    event: string
    meta?: Record<string, string>
  }

  // Vercel injects geolocation from its edge as x-vercel-ip-* headers.
  // 📖 https://vercel.com/docs/edge-network/headers#x-vercel-ip-country
  const h = request.headers
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  const country = h.get('x-vercel-ip-country')
  const region = h.get('x-vercel-ip-country-region')
  const city = h.get('x-vercel-ip-city')
  const latitude = h.get('x-vercel-ip-latitude')
  const longitude = h.get('x-vercel-ip-longitude')
  const postalCode = h.get('x-vercel-ip-postal-code')
  const timezone = h.get('x-vercel-ip-timezone')

  const host = await lookupHost(ip)
  const isDatacenter = host ? DATACENTER_RE.test(host) : false

  // City, Region, Country collapsed into one line: "San Jose, CA, US"
  const location = [city ? decodeURIComponent(city) : null, region, country]
    .filter(Boolean)
    .join(', ')

  const enrichedMeta: Record<string, string> = {
    ...meta,
    ...(ip ? { '🌐 IP': ip } : {}),
    ...(host ? { '🏷️ Host': host } : {}),
    ...(isDatacenter ? { '🤖 Likely bot': 'datacenter IP (not a real visitor)' } : {}),
    ...(location ? { '📍 Location': location } : {}),
    ...(latitude && longitude ? { '🧭 Coordinates': `${latitude}, ${longitude}` } : {}),
    ...(postalCode ? { '📮 Postal': postalCode } : {}),
    ...(timezone ? { '🕒 Timezone': timezone } : {}),
  }

  const metaLines = Object.entries(enrichedMeta)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
  const message = [`🔔 ${event}`, metaLines].filter(Boolean).join('\n')

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    })
  } catch (err) {
    // Best-effort — never surface tracking failures to the client.
    console.error('Failed to forward event to Discord:', err)
  }

  return new Response(null, { status: 204 })
}
