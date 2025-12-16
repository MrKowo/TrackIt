import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/TrackIt/',

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // FIX: Removed 'masked-icon.svg' because it does not exist in your public folder
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
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
            if (id.includes('firebase')) {
              return 'firebase';
            }
            return 'vendor';
          }
        }
      }
    }
  }
});