/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

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
