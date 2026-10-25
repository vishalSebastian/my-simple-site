import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// On Vercel the site is served from "/"; on GitHub Pages from "/my-simple-site/"
export default defineConfig({
  plugins: [react()],
  base: process.env.VERCEL ? '/' : '/my-simple-site/',
  // Local: send /api calls to the Express server (npm run dev:api)
  server: { proxy: { '/api': 'http://localhost:3001' } },
  build: { chunkSizeWarningLimit: 1500 },
});
