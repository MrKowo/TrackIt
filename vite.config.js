import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/TrackIt/', // Keep this!

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'TrackIt',
        short_name: 'TrackIt',
        description: 'Simple goal and habit tracker',
        theme_color: '#ffffff',
        start_url: '/TrackIt/',
        scope: '/TrackIt/',
        icons: [
          {
            src: 'android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1000, 
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 1. Keep Firebase separate because it is heavy
            if (id.includes('firebase')) {
              return 'firebase';
            }
            
            // 2. Put EVERYTHING else (React, Charts, etc.) in one vendor file
            // This fixes the "undefined forwardRef" error by keeping dependencies together.
            return 'vendor';
          }
        }
      }
    }
  }
});