import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import Sitemap from 'vite-plugin-sitemap'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'pwa-192x192.svg', 'pwa-512x512.svg'],
      manifest: {
        name: '星墨命理',
        short_name: '星墨命理',
        description: '塔羅、梅花易數、紫微斗數的白話解讀，每段都附依據，查得到出處',
        theme_color: '#111014',
        background_color: '#111014',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      // /__/auth/handler 是 Firebase 登入頁，不能被換成 index.html
      workbox: {
        navigateFallbackDenylist: [/^\/__\//],
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    }),
    Sitemap({
      hostname: 'https://mingli-yuxuan.web.app/',
    })
  ],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-mingli': ['iztro', 'lunar-javascript'],
        },
      },
    },
  },
})
