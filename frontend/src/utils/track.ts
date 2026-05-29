// Sends a named event to /api/track, which the Cloudflare Worker forwards to
// Discord server-side. Call from any component for clicks, interactions, etc.
//
// Why a plain function (not a hook)? Hooks can't be called inside event
// handlers. A function has no such rule.
// 📖 Rules of Hooks — https://react.dev/reference/rules/rules-of-hooks
//
// Usage:
//   trackEvent('Started simulation')
//   trackEvent('Injected event', { kind: 'signal_failure' })
export function trackEvent(event: string, meta?: Record<string, string>) {
  if (window.location.hostname === 'localhost') return
  if (localStorage.getItem('skip_tracking')) return
  // fire-and-forget — never await or surface errors to the user
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, meta }),
  }).catch(() => {
    // swallow network errors — tracking should never break the UI
  })
}
