/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Plain Vite build → dist/. Deploy with wrangler.jsonc (static assets + SPA fallback).
// Do not add @cloudflare/vite-plugin here: Wrangler auto-setup injects a static import
// that breaks Vite config bundling (ESM-only package + require) on CI.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  server: {
    proxy: {
      '/topology': 'http://localhost:8000',
      '/state': 'http://localhost:8000',
      '/commands': 'http://localhost:8000',
    },
  },
})
