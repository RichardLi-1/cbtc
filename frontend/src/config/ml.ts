/** When false, hide ML training + dispatch A/B UI. */
export function isMlEnabled(): boolean {
  const flag = import.meta.env.VITE_ML_ENABLED
  if (flag === 'false' || flag === '0') return false
  if (flag === 'true' || flag === '1') return true
  // Dev: Vite proxies /ml → :8001. Prod: set VITE_ML_BASE to your ML API origin.
  return import.meta.env.DEV || Boolean(import.meta.env.VITE_ML_BASE?.trim())
}
