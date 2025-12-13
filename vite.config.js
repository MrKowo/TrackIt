import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/TrackIt/', 
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // --- ADD THIS SECTION ---
      devOptions: {
        enabled: true 
      },
      // ------------------------
      manifest: {
        name: 'TrackIt',
        short_name: 'TrackIt',
        start_url: './',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'activity.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})