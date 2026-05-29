import { useEffect, useRef } from 'react';
import { trackEvent } from '../utils/track';
// ─── Edit this to add/rename referral sources ───────────────────────────────
// key   = the bare URL query param (e.g. "ttc_cover_letter" matches "?ttc_cover_letter")
// value = display name that gets **bolded** in the Discord message
const REFERRAL_SOURCES = {
    ttc_cover_letter: 'TTC Cover Letter',
    linkedin: 'LinkedIn',
    resume: 'Resume',
    github: 'GitHub',
    email: 'Email',
};
// ─────────────────────────────────────────────────────────────────────────────
// Fires one webhook per page load with visitor + referral info.
// Using a ref (not state) for hasTracked avoids a re-render — it's an internal
// mutable flag, not UI.
// 📖 useRef for mutable values — https://react.dev/reference/react/useRef#referencing-a-value-with-a-ref
export function usePageViewTracker() {
    const hasTracked = useRef(false);
    useEffect(() => {
        if (hasTracked.current)
            return;
        hasTracked.current = true;
        // trackEvent already skips localhost + skip_tracking, but bail early so we
        // don't bother computing anything in dev.
        if (window.location.hostname === 'localhost')
            return;
        if (localStorage.getItem('skip_tracking'))
            return;
        const ua = navigator.userAgent;
        const isBot = /bot|crawler|spider/i.test(ua);
        const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
        const deviceType = isMobile ? '📱 Mobile' : '🖥️ Desktop';
        const platform = /iPhone|iPad/.test(ua) ? 'iOS'
            : /Android/.test(ua) ? 'Android'
                : /Mac/.test(navigator.platform) ? 'macOS'
                    : /Win/.test(navigator.platform) ? 'Windows'
                        : /Linux/.test(navigator.platform) ? 'Linux'
                            : 'Unknown';
        // Read ?param, match against REFERRAL_SOURCES, then strip it from the URL.
        // replaceState rewrites the address bar with no reload and no history entry,
        // so the param disappears immediately for the visitor.
        // 📖 history.replaceState — https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState
        const params = new URLSearchParams(window.location.search);
        const rawParams = params.toString();
        let referralSource = null;
        for (const key of params.keys()) {
            if (REFERRAL_SOURCES[key]) {
                referralSource = REFERRAL_SOURCES[key];
                break;
            }
        }
        if (rawParams) {
            window.history.replaceState({}, '', window.location.pathname);
        }
        const eventLabel = isBot
            ? `🤖 Bot/crawler`
            : referralSource
                ? `👀 New visitor from **${referralSource}**`
                : rawParams
                    ? `👀 New visitor — custom referral`
                    : `👀 New visitor`;
        trackEvent(eventLabel, {
            '🖥️ Device': `${deviceType} · ${platform}`,
            '🕒 Time': new Date().toLocaleString(),
            ...(rawParams ? { '🔗 Params': `?${rawParams}` } : {}),
            ...(isBot ? { '🔍 UA': ua } : {}),
        });
    }, []);
}
