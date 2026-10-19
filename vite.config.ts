// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [VitePWA({
    strategies: 'generateSW', filename: 'sw.js', registerType: 'autoUpdate', injectRegister: null,
    devOptions: { enabled: false },
    manifest: {
      name: 'Minhas Finanças', short_name: 'Finanças', start_url: '/', scope: '/', display: 'standalone',
      theme_color: '#FFFFFF', background_color: '#FFFFFF',
      icons: [{ src: '/app-icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/app-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,jpg,png,ico,woff2}'], maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      navigateFallback: null, cleanupOutdatedCaches: true,
      runtimeCaching: [
        { urlPattern: ({ request, url }) => request.mode === 'navigate' && url.origin === self.location.origin && !/^\/(~oauth|api|reset-password)/.test(url.pathname), handler: 'NetworkFirst', options: { cacheName: 'finance-pages', networkTimeoutSeconds: 4, cacheableResponse: { statuses: [200] } } },
        { urlPattern: ({ url }) => url.origin === self.location.origin && /\/assets\/[^/]+-[a-zA-Z0-9_-]{8,}\.(js|css|jpg|png|woff2)$/.test(url.pathname), handler: 'CacheFirst', options: { cacheName: 'finance-hashed-assets', cacheableResponse: { statuses: [200] } } },
      ],
    },
  })],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
