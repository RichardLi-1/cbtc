import { useEffect, useState } from 'react';
// Single source of truth for the mobile breakpoint. Anything narrower than this
// gets the compact, touch-first layout (scrollable toolbar, collapsed panels).
export const MOBILE_BREAKPOINT = 720;
// Tracks whether the viewport is below MOBILE_BREAKPOINT. Uses matchMedia so we
// only re-render on an actual breakpoint *crossing*, not on every resize tick.
export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
    const query = `(max-width: ${breakpoint - 1}px)`;
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
    useEffect(() => {
        const mql = window.matchMedia(query);
        const onChange = (e) => setIsMobile(e.matches);
        setIsMobile(mql.matches);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, [query]);
    return isMobile;
}
