import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' (Oct 2026, LEA Hub): asset URLs are relative to the page, so the
// same build works at vra-hub.com/ (VRA, unchanged) and under /lea/ (LEA Hub,
// served through retina-rx.vercel.app/lea/ — see vercel.json rewrites).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  }
})
