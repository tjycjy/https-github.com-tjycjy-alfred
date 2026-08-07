import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'A.L.F.R.E.D. — Assets, Liabilities, Financial Review & Evaluation Directory',
        short_name: 'A.L.F.R.E.D.',
        description: 'Offline-first practice dashboard for Financial Adviser Representatives',
        start_url: '/',
        display: 'standalone',
        background_color: '#f4f6f8',
        theme_color: '#4f46e5',
        orientation: 'any',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Precache the app shell + all built assets so the app boots with zero network.
        // No runtimeCaching entries on purpose: any user-configured News/AI endpoint
        // (a different origin) is simply left uncached and untouched by the service worker.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // pdf.js worker + large vendor chunks still need to be cacheable.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  server: {
    host: true,
  },
})
