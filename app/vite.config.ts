// Derleyici (Vite) + PWA ayarları
// PWA: uygulama kabuğu telefonda saklanır; internet yokken de açılır (002 · B.7).
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',          // yeni sürüm sessizce iner, sonraki açılışta devreye girer
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Otel Dijital',
        short_name: 'Otel Dijital',
        description: 'Otel personeli için QR ile iş takibi',
        lang: 'tr',
        start_url: '/',
        display: 'standalone',
        background_color: '#f4f6f8',
        theme_color: '#1f4e79',
        icons: [
          { src: '/ikon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/ikon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/ikon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png}'],
        navigateFallback: '/index.html',   // /oda/… bağlantıları offline'da da kabuğa düşer
      },
    }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
});
