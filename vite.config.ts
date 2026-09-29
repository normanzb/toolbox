import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the build works under any GitHub Pages path.
// One HTML entry per page so /2fa/ is served as a real directory, no SPA fallback needed.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        twofa: resolve(__dirname, '2fa/index.html'),
      },
    },
  },
})
