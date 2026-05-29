/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Plain Vite build → dist/. Deploy with wrangler.jsonc (static assets + SPA fallback).
// Do not add @cloudflare/vite-plugin here: Wrangler auto-setup injects a static import
// that breaks Vite config bundling (ESM-only package + require) on CI.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Prefer .tsx/.ts over stale .js artifacts. Vite's default order puts .js first,
    // which silently shadows our TypeScript source when both exist side-by-side.
    extensions: ['.tsx', '.ts', '.jsx', '.mjs', '.js', '.mts', '.json'],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  server: {
    proxy: {
      '/topology': 'http://localhost:8000',
      '/state': 'http://localhost:8000',
      '/commands': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/ops': 'http://localhost:8000',
      '/ml': {
        target: 'http://localhost:8001',
        timeout: 120_000,
      },
    },
  },
})
