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
        name: '奇門 AI 大師',
        short_name: '奇門大師',
        description: '專業奇門遁甲 AI 解析工具',
        theme_color: '#0f172a',
        background_color: '#0f172a',
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
      devOptions: {
        enabled: true,
        type: 'module'
      }
    }),
    Sitemap({
      hostname: 'https://larrywithmanpower.github.io/qimen-app/',
      dynamicRoutes: ['/qimen-app/'],
    })
  ],
  base: '/qimen-app/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-framer': ['framer-motion'],
          'vendor-datepicker': ['react-datepicker', 'date-fns'],
          'vendor-markdown': ['react-markdown'],
          'vendor-qimen': ['qimen-dunjia', 'lunar-javascript'],
          'vendor-ui': ['lucide-react', 'react-helmet-async'],
        },
      },
    },
  },
})
