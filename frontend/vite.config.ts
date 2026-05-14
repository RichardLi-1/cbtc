/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Only enable @cloudflare/vite-plugin for `vite build` (e.g. Cloudflare CI).
// - Dynamic `import()` avoids Vite pre-bundling the config with `require()` on this ESM-only package.
// - Skipping the plugin for `vite dev` / Vitest avoids Worker/miniflare hooks that break `vitest run`.
export default defineConfig(async ({ command }) => {
  const plugins = [react()]

  if (command === 'build') {
    const { cloudflare } = await import('@cloudflare/vite-plugin')
    plugins.unshift(cloudflare())
  }

  return {
    plugins,
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
  }
})
