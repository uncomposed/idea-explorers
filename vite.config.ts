import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/ideas/',
  plugins: [react()],
  build: {
    sourcemap: true,
    target: 'es2022',
  },
})
