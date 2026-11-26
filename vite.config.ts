import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const api = process.env.MBX_API_URL || 'http://127.0.0.1:8000'
const apiProxy = { '/api': api, '/sanctum': api }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // The admin must be served from an origin Laravel trusts for cookie sign-in (SANCTUM_STATEFUL_DOMAINS).
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  build: {
    rolldownOptions: {
      output: {
        // Libraries in their own files: they change rarely, so after a deploy the browser keeps
        // them from its cache and downloads only the app code that changed.
        codeSplitting: {
          // A group takes only the packages it names, not everything they import (otherwise small
          // shared helpers such as clsx land in the charts file and pull it into the first load).
          includeDependenciesRecursively: false,
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/, priority: 30 },
            { name: 'vendor-charts', test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|internmap|decimal\.js-light|es-toolkit|immer|reselect|@reduxjs|redux|react-redux|use-sync-external-store|eventemitter3|tiny-invariant)[\\/]/, priority: 20 },
            { name: 'vendor-dates', test: /node_modules[\\/](react-day-picker|date-fns|@date-fns)[\\/]/, priority: 20 },
            { name: 'vendor-ui', test: /node_modules[\\/](radix-ui|@radix-ui|cmdk|sonner|@floating-ui|react-remove-scroll[^\\/]*|aria-hidden|react-style-singleton|use-callback-ref|use-sidecar|detect-node-es|get-nonce|lucide-react)[\\/]/, priority: 10 },
            { name: 'vendor', test: /node_modules[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
  optimizeDeps: {
    // Avoid scanning optional chart engines and the whole icon catalog on first boot.
    noDiscovery: true,
    include: [
      'react',
      'react/jsx-runtime',
      'react-dom/client',
      'react-router-dom',
      'radix-ui',
      'cmdk',
      'sonner',
      '@tanstack/react-query',
      '@tanstack/react-table',
      '@tanstack/react-virtual',
      'recharts',
      'zod',
      'decimal.js',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
      'react-hook-form',
      '@hookform/resolvers/zod',
      'axios',
    ],
  },
})
