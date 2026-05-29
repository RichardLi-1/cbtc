import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import posthog from 'posthog-js'
import App from './App'

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string,
  person_profiles: 'identified_only',
  capture_pageview: false,
  capture_pageleave: false,
  capture_exceptions: true,
  loaded: (ph) => {
    if (import.meta.env.DEV) ph.opt_out_capturing()
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
