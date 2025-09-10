import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  root: path.resolve(process.cwd(), 'client'),
  build: {
    outDir: path.resolve(process.cwd(), 'dist'),
    emptyOutDir: true,
  },
  publicDir: path.resolve(process.cwd(), 'client/public'),
  server: {
    port: 3000,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'client/src'),
      '@shared': path.resolve(process.cwd(), 'shared'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Auto-registers service worker and updates on changes
      devOptions: { enabled: true }, // Enables SW in dev mode for testing
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'], // Cache these assets
      manifest: {
        name: 'ProMo-G', // Replace with app name (e.g., from tech stack: task management app)
        short_name: 'ProMo-G',
        description: 'Digital marketing platform where every scroll, swipe, and tap pays',
        theme_color: '#8d9991', // Match your Tailwind theme
        icons: [
          {
            src: 'pwa-192x192.png', // Add these icons to public/ folder (create if needed)
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'], // Cache these for offline
      }
    })
  ],
});