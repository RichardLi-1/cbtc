import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/topology': 'http://localhost:8000',
      '/state': 'http://localhost:8000',
      '/commands': 'http://localhost:8000',
    },
  },
})
